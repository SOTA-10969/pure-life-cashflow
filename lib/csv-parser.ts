import Papa from 'papaparse';
import { Transaction, TransactionSource } from '@/types';

// Utility for ID generation
// Utility for ID generation
// Utility for ID generation
function generateId(): string {
    // 1. Use crypto.randomUUID if available (Browser/Node)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // 2. Fallback for older environments
    return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

interface ParseResult {
    transactions: Transaction[];
    errors: string[];
}

// Return type with detection info
interface DetectedType {
    type: TransactionSource | 'UNKNOWN';
    headerLineIndex: number; // 0-based index of where header is found
}

export async function parseAndNormalizeCSV(file: File): Promise<ParseResult> {
    const errors: string[] = [];
    let transactions: Transaction[] = [];

    // The user specified these are UTF-8. We try UTF-8 first.
    let text = await readFileAsText(file, 'UTF-8');
    let detection = detectCSVType(text);

    // If detecting failed with UTF-8, try Shift-JIS as fallback (just in case old files are mixed)
    if (detection.type === 'UNKNOWN') {
        const textShiftJIS = await readFileAsText(file, 'Shift-JIS');
        const detectionShiftJIS = detectCSVType(textShiftJIS);
        if (detectionShiftJIS.type !== 'UNKNOWN') {
            text = textShiftJIS;
            detection = detectionShiftJIS;
        }
    }

    if (detection.type === 'UNKNOWN') {
        return { transactions: [], errors: ['CSV形式を認識できませんでした。PayPay, ゆうちょ銀行, 楽天カードの標準CSVか確認してください。'] };
    }

    // Slice text from header line onwards for clean parsing
    const lines = text.split(/\r\n|\n|\r/);
    const cleanText = lines.slice(detection.headerLineIndex).join('\n');

    const parseResult = Papa.parse<any>(cleanText, {
        header: true,
        skipEmptyLines: true,
    });

    if (parseResult.errors.length > 0) {
        parseResult.errors.forEach(e => errors.push(`行 ${e.row}: ${e.message}`));
    }

    transactions = parseResult.data.map(row => normalizeRow(detection.type as TransactionSource, row)).filter((t): t is Transaction => t !== null);

    return { transactions, errors };
}

function readFileAsText(file: File, encoding: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = (e) => reject(e);
        reader.readAsText(file, encoding);
    });
}

function detectCSVType(text: string): DetectedType {
    const lines = text.split(/\r\n|\n|\r/);
    // Scan up to 50 lines to be safe (JP Bank has header around line 9-10)
    const limit = Math.min(lines.length, 50);

    for (let i = 0; i < limit; i++) {
        const line = lines[i];

        // 1. Rakuten Card
        // 項目名: 「利用日」「利用店名・商品名」「支払総額」
        if (line.includes('利用日') && line.includes('利用店名') && line.includes('支払総額')) {
            return { type: 'RAKUTEN', headerLineIndex: i };
        }

        // 2. PayPay
        // 項目名: 「取引日」「出金金額（円）」「入金金額（円）」「取引先」
        // "種別" usually exists too if we need to filter by it.
        if (line.includes('取引日') && line.includes('出金金額') && line.includes('入金金額') && line.includes('取引先')) {
            return { type: 'PAYPAY', headerLineIndex: i };
        }
        // Legacy/Other PayPay Format Support (Just in case)
        if (line.includes('日時') && line.includes('店名') && line.includes('金額')) {
            return { type: 'PAYPAY', headerLineIndex: i };
        }

        // 3. JP Bank
        // 項目名: 「取引日」「受入金額（円）」「払出金額（円）」「詳細１」
        // Note: User said "202601013340_01.csv" starts data at line 10.
        if (line.includes('取引日') && line.includes('受入金額') && line.includes('払出金額')) {
            return { type: 'JP_BANK', headerLineIndex: i };
        }
        // Fallback for different JP Bank export formats
        if (line.includes('お取扱年月日') && (line.includes('お引出し') || line.includes('入出金'))) {
            return { type: 'JP_BANK', headerLineIndex: i };
        }
    }
    return { type: 'UNKNOWN', headerLineIndex: 0 };
}

function normalizeRow(type: TransactionSource, row: any): Transaction | null {
    let date = '';
    let description = '';
    let amount = 0;
    let isExcluded = false;
    let categoryId = 'other';
    let autoCategoryReason = undefined;

    try {
        switch (type) {
            case 'RAKUTEN':
                // 楽天: 利用日, 利用店名・商品名, 支払総額
                const rDate = row['利用日'];
                if (!rDate) return null;
                date = rDate.replace(/\//g, '-');
                description = row['利用店名・商品名'];
                // 支払総額 is cost
                const rAmount = row['支払総額'];
                if (rAmount) {
                    amount = -1 * parseInt(rAmount.replace(/,/g, '') || '0');
                }

                // Exclude PayPay charges from card
                // Keyword: ペイペイ, ＰＡＹＰＡＹ
                if (description && (description.includes('ペイペイ') || description.includes('ＰＡＹＰＡＹ') || description.toUpperCase().includes('PAYPAY'))) {
                    isExcluded = true;
                }
                break;

            case 'PAYPAY':
                // PayPay: 取引日, 取引先, 出金金額（円）, 入金金額（円）, 種別
                const pDate = row['取引日'] || row['日時'];
                if (!pDate) return null;
                date = pDate.split(' ')[0].replace(/\//g, '-');
                description = row['取引先'] || row['店名・宛先'] || row['店名'] || '使途不明';

                const pOut = row['出金金額（円）'] || row['出金金額'];
                const pIn = row['入金金額（円）'] || row['入金金額'];
                const pKind = row['種別'] || '';

                const outVal = pOut ? parseInt(pOut.replace(/,/g, '') || '0') : 0;
                const inVal = pIn ? parseInt(pIn.replace(/,/g, '') || '0') : 0;

                if (outVal > 0) amount = -1 * outVal;
                else if (inVal > 0) amount = inVal;

                // --- PayPay Strict Exclusion Logic ---
                // Exclude: Charge (internal transfer), Withdrawal (internal), PayPay Card (duplicate with card CSV)

                // 1. Check Kind Column
                if (pKind === 'チャージ' || pKind === '出金' || pKind === 'PayPayカード決済') {
                    isExcluded = true;
                }

                // 2. Check Description (Target)
                // "チャージ" often appears in description for bank top-ups
                if (description.includes('チャージ') || description.includes('PayPayカード')) {
                    isExcluded = true;
                }

                // 3. Special Case: Point Usage is NOT excluded (it's a discount/income used essentially)
                // But usually points use is separate line? For now, we only exclude specific transfer types.
                break;

            case 'JP_BANK':
                // JP Bank Strict Logic
                const jDate = row['取引日'] || row['年月日'] || row['お取扱年月日'];
                if (!jDate) return null;
                date = normalizeDate(jDate);

                // Concatenate details
                const detail1 = row['詳細１'] || '';
                const detail2 = row['詳細２'] || '';
                const formatDesc = row['お取扱内容'] || 'ゆうちょ銀行';
                description = `${detail1} ${detail2}`.trim() || formatDesc;

                const jOut = row['払出金額（円）'] || row['お引出し金額'];
                const jIn = row['受入金額（円）'] || row['お預り金額'];

                const jOutVal = jOut ? parseInt(jOut.replace(/,/g, '') || '0') : 0;
                const jInVal = jIn ? parseInt(jIn.replace(/,/g, '') || '0') : 0;

                if (jOutVal > 0) amount = -1 * jOutVal;
                else if (jInVal > 0) amount = jInVal;

                // --- Final Strict Exclusion Logic ---
                // We check original Detail Strings for exact matching
                const d1 = (detail1 || '').toString();
                const d2 = (detail2 || '').toString();
                const fullStr = (description || '').toUpperCase();

                // 1. Blacklist (Automatic Exclusion)
                // JP Bank Specifics:
                // - Detail2: ﾗｸﾃﾝｶｰﾄﾞｻｰﾋ, (PAYPAY)
                // - Detail1: カード, ＲＴ

                if (d2.includes('ﾗｸﾃﾝｶｰﾄﾞｻｰﾋ') || d2.includes('(PAYPAY)') || d2.includes('（ＰＡＹＰＡＹ）')) {
                    isExcluded = true;
                }
                if (d1.includes('カード') || d1.includes('ＲＴ')) {
                    isExcluded = true;
                }

                // 2. Whitelist (Protection/Rescue)
                // Even if "自払" or other rules hit, specific known items must be INCLUDED (isExcluded = false).
                // "三井住友カード", "DF.ｴﾆﾀｲﾑｶｲﾋ", "ｷｮｳｴｲｶﾞｽ"

                if (fullStr.includes('三井住友') || fullStr.includes('ミツイスミトモ') || fullStr.includes('ＳＭＣＣ') || fullStr.includes('ＳＭＢＣ')) {
                    isExcluded = false; // Rescue from 'カード' exclusion
                    categoryId = 'credit_card';
                    autoCategoryReason = '自動判定: カード/固定費';
                }
                else if (fullStr.includes('ｷｮｳｴｲｶﾞｽ') || fullStr.includes('ガス') || fullStr.includes('電気') || fullStr.includes('電力') || fullStr.includes('水道')) {
                    isExcluded = false; // Rescue
                    categoryId = 'utilities';
                    autoCategoryReason = '自動判定: 光熱費';
                }
                else if (d2.includes('DF.ｴﾆﾀｲﾑ') || fullStr.includes('エニタイム') || fullStr.includes('ANYTIME') || fullStr.includes('ＡＦ')) {
                    isExcluded = false; // Rescue
                    categoryId = 'subscription';
                    autoCategoryReason = '自動判定: サブスク/ジム';
                }

                // Case C: Unknown "自払"
                if (!isExcluded && fullStr.includes('自払') && categoryId === 'other') {
                    autoCategoryReason = '自動判定: 要確認';
                }
                break;
        }

        if (!date || (amount === 0 && !isExcluded)) return null;

        const id = generateId();

        return {
            id,
            date,
            source: type,
            description: description || '不明な取引',
            amount,
            categoryId,
            originalRow: row,
            isExcluded,
            autoCategoryReason
        };
    } catch (e) {
        console.error('Row parse error', e);
        return null;
    }
}

function normalizeDate(dateStr: string): string {
    if (!dateStr) return '';
    // Handle various formats
    // 20230101
    if (/^\d{8}$/.test(dateStr)) {
        return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
    }
    // 2023/01/01 or 2023-01-01
    return dateStr.replace(/\//g, '-').replace(/\./g, '-');
}
