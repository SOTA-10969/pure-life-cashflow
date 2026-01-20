export type TransactionSource = 'RAKUTEN' | 'PAYPAY' | 'JP_BANK' | 'MANUAL';

export interface Transaction {
    id: string;
    date: string; // ISO 8601 YYYY-MM-DD
    source: TransactionSource;
    description: string;
    amount: number; // Negative for expense, Positive for income
    categoryId: string;
    originalRow: Record<string, any>;
    isExcluded?: boolean; // For deduplication
    autoCategoryReason?: string; // e.g. 'サブスク（自動判定）'
    type?: 'EXPENSE' | 'INCOME' | 'INVESTMENT';
    isManual?: boolean;
}

export interface Category {
    id: string;
    name: string;
    color: string;
    keywords: string[];
    type: 'EXPENSE' | 'INCOME';
}

export const INITIAL_CATEGORIES: Category[] = [
    { id: 'food', name: '食費', color: '#ef4444', keywords: ['スーパー', 'コンビニ', '食事'], type: 'EXPENSE' },
    { id: 'daily', name: '消耗品', color: '#f97316', keywords: ['ドラッグ', '薬局', 'ホームセンター'], type: 'EXPENSE' },
    { id: 'social', name: '交際費', color: '#eab308', keywords: ['飲み会', 'プレゼント', '居酒屋'], type: 'EXPENSE' },
    { id: 'utilities', name: '水道光熱費', color: '#3b82f6', keywords: ['電気', 'ガス', '水道', '電力'], type: 'EXPENSE' },
    { id: 'transport', name: '交通費', color: '#06b6d4', keywords: ['鉄道', 'バス', 'タクシー', 'ETC', 'Suica', 'PASMO'], type: 'EXPENSE' },
    { id: 'subscription', name: 'サブスク', color: '#8b5cf6', keywords: ['Netflix', 'Spotify', 'Amazon Prime', 'Apple'], type: 'EXPENSE' },
    { id: 'credit_card', name: 'カード引落', color: '#6366f1', keywords: ['三井住友', 'SMCC', 'カード'], type: 'EXPENSE' },
    { id: 'income', name: '給与・収入', color: '#22c55e', keywords: ['給料', '振込', '賞与'], type: 'INCOME' },
    { id: 'other', name: 'その他', color: '#94a3b8', keywords: [], type: 'EXPENSE' },
];
