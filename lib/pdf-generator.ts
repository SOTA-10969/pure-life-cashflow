"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { saveAs } from "file-saver";
import { toPng } from "html-to-image";
import { Transaction, Category } from "@/types";
import { loadJapaneseFont } from "./fonts";

interface PdfGeneratorProps {
    transactions: Transaction[];
    categories: Category[];
    selectedMonth: string;
}

// Helper to strictly sanitize data for jsPDF
const toSafeStr = (val: any): string => {
    if (val === null || val === undefined) return '';
    return String(val);
};

// Wait for fonts to be ready before capturing
const waitForFonts = async (): Promise<void> => {
    if (typeof document !== 'undefined' && document.fonts) {
        try {
            await document.fonts.ready;
            console.log("[PDF] Document fonts ready.");
        } catch (e) {
            console.warn("[PDF] Font ready check failed:", e);
        }
    }
};

export const generatePdfReport = async ({
    transactions,
    categories,
    selectedMonth,
}: PdfGeneratorProps) => {
    // 1. Initialize jsPDF
    const doc = new jsPDF();

    // 2. Load and Register Japanese Font
    let fontLoaded = false;

    try {
        console.log("[PDF] Loading Japanese font...");
        const fontBase64 = await loadJapaneseFont();

        if (fontBase64 && fontBase64.length > 1000) {
            doc.addFileToVFS("NotoSansJP.ttf", fontBase64);
            doc.addFont("NotoSansJP.ttf", "NotoSansJP", "normal");
            doc.setFont("NotoSansJP");
            fontLoaded = true;
            console.log("[PDF] Japanese font registered successfully.");
        } else {
            console.warn("[PDF] Font data invalid or empty.");
        }
    } catch (e) {
        console.error("[PDF] Font registration failed:", e);
    }

    if (!fontLoaded) {
        console.log("[PDF] Falling back to Helvetica font.");
        doc.setFont("helvetica");
    }

    // 3. Data Preparation
    const safeTransactions = Array.isArray(transactions) ? transactions : [];
    const safeCategories = Array.isArray(categories) ? categories : [];

    // Filter non-excluded transactions for calculations
    const activeTransactions = safeTransactions.filter(t => !t.isExcluded);

    // Calculations
    const income = activeTransactions
        .filter((t) => (t.amount || 0) > 0)
        .reduce((sum, t) => sum + (t.amount || 0), 0);
    const expense = activeTransactions
        .filter((t) => (t.amount || 0) < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);
    const balance = income - expense;

    // Category Breakdown with percentages
    const categoryTotals = new Map<string, { name: string; amount: number; color: string }>();
    activeTransactions.filter(t => (t.amount || 0) < 0).forEach(t => {
        const cat = safeCategories.find(c => c.id === t.categoryId);
        const catName = cat ? cat.name : '未分類';
        const catColor = cat ? cat.color : '#94a3b8';
        const catId = t.categoryId || 'unknown';
        const existing = categoryTotals.get(catId);
        if (existing) {
            existing.amount += Math.abs(t.amount || 0);
        } else {
            categoryTotals.set(catId, {
                name: catName,
                amount: Math.abs(t.amount || 0),
                color: catColor
            });
        }
    });

    // Category Data for AutoTable with percentage
    const categoryDataArray = Array.from(categoryTotals.values())
        .sort((a, b) => b.amount - a.amount);

    const categoryTableData = categoryDataArray.map(cat => {
        const percentage = expense > 0 ? ((cat.amount / expense) * 100).toFixed(1) : '0.0';
        return [
            toSafeStr(cat.name),
            `¥${cat.amount.toLocaleString()}`,
            `${percentage}%`
        ];
    });

    // Transaction Data for AutoTable
    const tableData = safeTransactions.length > 0 ? safeTransactions.map(t => {
        const cat = safeCategories.find(c => c.id === t.categoryId);
        const catName = cat ? cat.name : '未分類';
        const isExcluded = t.isExcluded ? " (集計除外)" : "";
        const desc = toSafeStr(t.description) + isExcluded;

        return [
            toSafeStr(t.date || '-'),
            toSafeStr(catName),
            desc,
            `¥${Math.abs(t.amount || 0).toLocaleString()}`,
            (t.amount || 0) > 0 ? "収入" : "支出"
        ];
    }) : [['-', '-', 'データなし', '¥0', '-']];

    // 4. Define table styles
    const tableStyles = fontLoaded ? { font: "NotoSansJP", fontStyle: "normal" } : {};

    // 5. Render PDF Content
    let currentY = 15;

    // Header
    const dateText = selectedMonth === 'ALL' ? '全期間' : `${toSafeStr(selectedMonth).replace('-', '年')}月`;

    doc.setFontSize(18);
    if (fontLoaded) doc.setFont("NotoSansJP");
    doc.text(`Pure Life Cashflow レポート - ${dateText}`, 14, currentY);
    currentY += 12;

    // 6. Capture chart image with font loading wait
    let chartCaptured = false;
    try {
        const chartElement = document.getElementById('main-chart');
        if (chartElement) {
            console.log("[PDF] Waiting for fonts to load...");
            await waitForFonts();

            // Small delay to ensure fonts are rendered
            await new Promise(resolve => setTimeout(resolve, 100));

            console.log("[PDF] Capturing chart...");
            const chartDataUrl = await toPng(chartElement, {
                backgroundColor: '#0f172a',
                pixelRatio: 2,
                style: {
                    fontFamily: "'Noto Sans JP', sans-serif"
                }
            });

            // Add chart image to PDF
            const imgWidth = 180;
            const imgHeight = 60;
            doc.addImage(chartDataUrl, 'PNG', 14, currentY, imgWidth, imgHeight);
            currentY += imgHeight + 10;
            chartCaptured = true;
            console.log("[PDF] Chart captured successfully.");
        }
    } catch (chartError) {
        console.warn("[PDF] Chart capture failed, continuing without image:", chartError);
    }

    // 7. Summary Section
    doc.setFontSize(12);
    if (fontLoaded) doc.setFont("NotoSansJP");
    doc.text("■ 収支サマリー", 14, currentY);
    currentY += 8;

    doc.setFontSize(11);
    doc.text(`総収入: ¥${income.toLocaleString()}`, 14, currentY);

    doc.setTextColor(200, 0, 0);
    doc.text(`総支出: ¥${expense.toLocaleString()}`, 75, currentY);

    if (balance >= 0) doc.setTextColor(0, 150, 0);
    else doc.setTextColor(200, 0, 0);
    doc.text(`収支: ¥${balance.toLocaleString()}`, 140, currentY);
    doc.setTextColor(0, 0, 0);
    currentY += 12;

    // 8. Category Breakdown Table
    doc.setFontSize(12);
    if (fontLoaded) doc.setFont("NotoSansJP");
    doc.text("■ カテゴリ別支出内訳", 14, currentY);
    currentY += 6;

    autoTable(doc, {
        startY: currentY,
        head: [['カテゴリ', '金額', '構成比']],
        body: categoryTableData.length > 0 ? categoryTableData : [['-', '¥0', '0%']],
        styles: tableStyles as any,
        headStyles: { fillColor: [41, 128, 185] },
        theme: 'grid',
        margin: { left: 14, right: 14 },
        tableWidth: 'auto'
    });

    // Get position after category table
    const afterCategoryTable = (doc as any).lastAutoTable;
    currentY = afterCategoryTable ? afterCategoryTable.finalY + 10 : currentY + 40;

    // 9. Transactions Table
    doc.setFontSize(12);
    if (fontLoaded) doc.setFont("NotoSansJP");
    doc.text("■ 取引履歴一覧", 14, currentY);
    currentY += 6;

    autoTable(doc, {
        startY: currentY,
        head: [['日付', 'カテゴリ', '内容', '金額', '種別']],
        body: tableData,
        styles: tableStyles as any,
        headStyles: { fillColor: [52, 73, 94] },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        didParseCell: (data) => {
            if (data.section === 'body') {
                const descCell = data.row.cells[2];
                if (descCell) {
                    const val = Array.isArray(descCell.text) ? descCell.text.join('') : toSafeStr(descCell.text);
                    if (val.includes("(集計除外)")) {
                        data.cell.styles.textColor = [150, 150, 150];
                    }
                }
            }
        }
    });

    // 10. Download PDF
    try {
        const safeMonth = toSafeStr(selectedMonth).replace(/[\/\\:*?"<>|]/g, '-');
        const fileName = `Report_${safeMonth}.pdf`;

        const pdfBlob = doc.output('blob');
        const secureBlob = new Blob([pdfBlob], { type: 'application/pdf' });

        saveAs(secureBlob, fileName);
        console.log(`[PDF] Download triggered: ${fileName}`);

    } catch (error) {
        console.error("[PDF] Download failed:", error);
        alert("PDFのダウンロードに失敗しました。");
    }
};
