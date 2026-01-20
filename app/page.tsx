
"use client";

import { FileUploader } from "@/components/dashboard/file-uploader";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { AnalyticsCharts } from "@/components/dashboard/charts";
import { TransactionList } from "@/components/dashboard/transaction-list";
import { CategoryManager } from "@/components/dashboard/category-manager";
import { MonthSelector } from "@/components/dashboard/month-selector";
import { Button } from "@/components/ui/base";
import { useFinanceStore, FinanceProvider } from "@/hooks/use-finance-store";
import { useState, useMemo, useEffect } from "react";
import { Loader2, FileText, Check } from "lucide-react";
import { CategoryFilter } from "@/components/dashboard/category-filter";
import { generatePdfReport } from "@/lib/pdf-generator";

// Wrapped Component that consumes the context
function DashboardContent() {
  const { transactions, clearAllData, categories } = useFinanceStore();
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [isCopyingText, setIsCopyingText] = useState(false);

  // Determine available months from data
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    transactions.forEach(t => {
      months.add(t.date.substring(0, 7));
    });
    return Array.from(months).sort().reverse();
  }, [transactions]);

  // Set default month logic
  useEffect(() => {
    const current = new Date().toISOString().slice(0, 7);
    if (selectedMonth === 'ALL' && availableMonths.includes(current)) {
      setSelectedMonth(current);
    } else if (selectedMonth === 'ALL' && availableMonths.length > 0) {
      setSelectedMonth(availableMonths[0]);
    }
  }, [availableMonths.length]);

  const filteredTransactions = useMemo(() => {
    let data = transactions;

    // 1. Month Filter
    if (selectedMonth !== 'ALL') {
      data = data.filter(t => t.date.startsWith(selectedMonth));
    }

    // 2. Category Filter
    if (selectedCategoryIds.length > 0) {
      data = data.filter(t => selectedCategoryIds.includes(t.categoryId));
    }

    return data;
  }, [transactions, selectedMonth, selectedCategoryIds]);

  const handleCopyTextForGemini = async () => {
    try {
      setIsCopyingText(true);

      // Calculate Summary Data
      const totalIncome = filteredTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
      const totalExpense = filteredTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const balance = totalIncome - totalExpense;

      // Top Categories
      const categoryTotals = new Map<string, number>();
      filteredTransactions.filter(t => t.amount < 0).forEach(t => {
        const catName = categories.find(c => c.id === t.categoryId)?.name || '未分類';
        const current = categoryTotals.get(catName) || 0;
        categoryTotals.set(catName, current + Math.abs(t.amount));
      });

      const topCategories = Array.from(categoryTotals.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, amount]) => `- ${name}: ¥${amount.toLocaleString()}`)
        .join('\n');

      const textData = `
【${selectedMonth === 'ALL' ? '全期間' : selectedMonth} 家計簿サマリー】 (Pure Life Cashflow)

■ 収支概要
- 収入: ¥${totalIncome.toLocaleString()}
- 支出: ¥${totalExpense.toLocaleString()}
- 収支: ¥${balance.toLocaleString()}

■ 支出上位カテゴリー
${topCategories}

■ 分析依頼
このデータを元に、家計の改善点や傾向を分析してください。
`.trim();

      await navigator.clipboard.writeText(textData);
      setTimeout(() => setIsCopyingText(false), 2000);
    } catch (err) {
      console.error(err);
      alert("テキストコピーに失敗しました");
      setIsCopyingText(false);
    }
  };

  const handlePdfExport = async () => {
    setIsPdfGenerating(true);
    try {
      await generatePdfReport({
        transactions: filteredTransactions,
        categories,
        selectedMonth
      });
    } catch (e) {
      console.error(e);
      alert("PDF作成に失敗しました");
    } finally {
      setIsPdfGenerating(false);
    }
  };

  return (
    <main className="min-h-screen p-8 space-y-8 max-w-7xl mx-auto relative">
      <header className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Pure Life Cashflow</h1>
            <p className="text-muted-foreground">
              楽天カード・PayPay・ゆうちょ銀行を統合する個人資産管理OS
            </p>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <MonthSelector
              currentMonth={selectedMonth}
              availableMonths={availableMonths}
              onMonthChange={setSelectedMonth}
            />
            <CategoryFilter
              categories={categories}
              selectedCategoryIds={selectedCategoryIds}
              onChange={setSelectedCategoryIds}
            />
            <Button
              variant="outline"
              size="default"
              onClick={handlePdfExport}
              disabled={isPdfGenerating}
              title="PDFレポートを作成"
              className="h-10 border-dashed gap-2 px-4"
            >
              {isPdfGenerating ? (
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              ) : (
                <FileText className="w-5 h-5 text-muted-foreground" />
              )}
              <span>PDFレポートを作成</span>
            </Button>
            <Button variant="outline" onClick={handleCopyTextForGemini} disabled={isCopyingText} title="サマリーテキストをコピー">
              {isCopyingText ? (
                <Check className="mr-2 h-4 w-4" />
              ) : (
                <FileText className="mr-2 h-4 w-4" />
              )}
              {isCopyingText ? "コピー完了" : "サマリーコピー"}
            </Button>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="destructive" size="sm" onClick={clearAllData}>
            データ全消去
          </Button>
        </div>
      </header>

      <div className="grid gap-8 md:grid-cols-[2fr_1fr]">
        <section className="space-y-8">
          <div className="space-y-8 rounded-xl">
            <SummaryCards
              transactions={transactions}
              selectedMonth={selectedMonth}
              selectedCategoryIds={selectedCategoryIds}
            />
            <AnalyticsCharts transactions={filteredTransactions} mode={selectedMonth === 'ALL' ? 'ALL' : 'MONTHLY'} />
          </div>
          <TransactionList transactions={filteredTransactions} />
        </section>

        <aside className="space-y-8">
          <div className="sticky top-8 space-y-8">
            <FileUploader />
            <CategoryManager />
          </div>
        </aside>
      </div>
    </main >
  );
}

// Main Page Component
export default function Home() {
  return (
    <FinanceProvider>
      <DashboardContent />
    </FinanceProvider>
  );
}
