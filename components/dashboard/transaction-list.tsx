
"use client";

import { useFinanceStore } from "@/hooks/use-finance-store";
import { Button, Card, CardHeader, CardTitle, CardContent } from "@/components/ui/base";
import { Edit2, Trash2, CreditCard, Tag, Plus } from "lucide-react";
// Would usually separate Table components but using raw HTML for speed
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Transaction } from "@/types";
import { EditTransactionModal } from "./edit-modal";
import { ManualEntryModal } from "./manual-entry-modal";

export function TransactionList({ transactions }: { transactions: Transaction[] }) {
    const { categories, updateTransaction, updateTransactionCategory, deleteTransaction, updateCategory } = useFinanceStore();
    const [sortKey, setSortKey] = useState<keyof Transaction>('date');
    const [sortDesc, setSortDesc] = useState(true);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [showExcluded, setShowExcluded] = useState(false);
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);

    // Quick Add Keyword State
    const [keywordDialogState, setKeywordDialogState] = useState<{
        transactionId: string;
        categoryId: string;
        keyword: string;
    } | null>(null);

    const openKeywordsDialog = (t: Transaction) => {
        // Default to current category or first one
        const catId = t.categoryId === 'other' ? categories[0].id : t.categoryId;
        setKeywordDialogState({
            transactionId: t.id,
            categoryId: catId,
            keyword: t.description // Pre-fill with description
        });
    };

    const handleSaveKeyword = () => {
        if (!keywordDialogState) return;
        const cat = categories.find(c => c.id === keywordDialogState.categoryId);
        if (cat) {
            // Add keyword if not exists
            if (!cat.keywords.includes(keywordDialogState.keyword)) {
                updateCategory({
                    ...cat,
                    keywords: [...cat.keywords, keywordDialogState.keyword]
                });
            }
            // Also update the current transaction to this category
            const trans = transactions.find(t => t.id === keywordDialogState.transactionId);
            if (trans && trans.categoryId !== keywordDialogState.categoryId) {
                updateTransaction({
                    ...trans,
                    categoryId: keywordDialogState.categoryId,
                    autoCategoryReason: `手動設定: ${keywordDialogState.keyword}`
                });
            }
        }
        setKeywordDialogState(null);
    };

    // Filter and Sort
    const filtered = transactions.filter(t => showExcluded ? true : !t.isExcluded);

    const sorted = [...filtered].sort((a, b) => {
        const valA = a[sortKey] ?? '';
        const valB = b[sortKey] ?? '';
        if (valA < valB) return sortDesc ? 1 : -1;
        if (valA > valB) return sortDesc ? -1 : 1;
        return 0;
    });

    const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || id;
    const getCategoryColor = (id: string) => categories.find(c => c.id === id)?.color || '#94a3b8';

    const toggleExclusion = (transaction: Transaction) => {
        updateTransaction({
            ...transaction,
            isExcluded: !transaction.isExcluded
        });
    };

    return (
        <Card className="col-span-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xl flex items-center gap-2">
                    取引履歴
                    <span className="text-sm font-normal text-muted-foreground">({transactions.length}件)</span>
                </CardTitle>
                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        onClick={() => setIsManualModalOpen(true)}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1"
                    >
                        <Plus className="w-4 h-4" /> 新規追加
                    </Button>
                    <Button
                        variant={showExcluded ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => setShowExcluded(!showExcluded)}
                        className="text-xs"
                    >
                        {showExcluded ? "除外項目を隠す" : "除外項目を表示"}
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 text-muted-foreground">
                        <tr>
                            <th className="p-3">日付</th>
                            <th className="p-3">内容</th>
                            <th className="p-3">金額</th>
                            <th className="p-3">カテゴリ</th>
                            <th className="p-3">ソース</th>
                            <th className="p-3">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map((t, index) => (
                            <tr key={`${t.id}-${index}`} className={cn("border-b last:border-0 hover:bg-muted/50 transition-colors", t.isExcluded && "opacity-60 bg-muted/20")}>
                                <td className="p-3 font-mono relative">
                                    <span className={cn(t.isExcluded && "line-through text-muted-foreground")}>{t.date}</span>
                                    {t.isExcluded && <span className="block text-[10px] text-destructive font-bold mt-1">集計除外</span>}
                                </td>
                                <td className="p-3 max-w-[200px] truncate" title={t.description}>
                                    <div className={cn("flex items-center gap-1", t.isExcluded && "line-through text-muted-foreground")}>
                                        {(t.categoryId === 'credit_card' || t.description.includes('三井住友')) &&
                                            <CreditCard className="w-3 h-3 text-indigo-400 shrink-0" />
                                        }
                                        {t.description}
                                    </div>
                                </td>
                                <td className={cn("p-3 font-mono font-medium", t.amount > 0 ? "text-green-500" : "", t.isExcluded && "line-through text-muted-foreground")}>
                                    {t.amount?.toLocaleString()}円
                                </td>
                                <td className="p-3">
                                    <div className="group relative flex flex-col items-start gap-1">
                                        <select
                                            className="appearance-none bg-transparent text-xs font-medium px-2 py-0.5 rounded cursor-pointer border border-transparent hover:border-border hover:bg-muted/50 transition-colors w-full max-w-[120px]"
                                            value={t.categoryId}
                                            onChange={(e) => {
                                                const newCatId = e.target.value;
                                                updateTransactionCategory(t.id, newCatId);
                                            }}
                                            style={{
                                                color: t.categoryId === 'other' ? undefined : 'white',
                                                backgroundColor: t.categoryId === 'other' ? undefined : getCategoryColor(t.categoryId)
                                            }}
                                        >
                                            {categories.map(c => (
                                                <option key={c.id} value={c.id} className="text-foreground bg-popover">
                                                    {c.name}
                                                </option>
                                            ))}
                                        </select>

                                        {/* Auto reason or add keyword button */}
                                        {t.autoCategoryReason ? (
                                            <span className="text-[10px] text-blue-400 border border-blue-400/30 px-1 rounded">
                                                {t.autoCategoryReason}
                                            </span>
                                        ) : (
                                            <button
                                                className="text-[10px] text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                                                onClick={() => openKeywordsDialog(t)}
                                                title={`「${t.description}」をカテゴリの自動判定キーワードに追加`}
                                            >
                                                <Plus className="w-2 h-2" /> 判定ルールに追加
                                            </button>
                                        )}
                                    </div>
                                </td>
                                <td className="p-3 text-xs text-muted-foreground">{t.source}</td>
                                <td className="p-3 flex gap-2">
                                    <Button
                                        size="sm"
                                        variant={t.isExcluded ? "outline" : "ghost"}
                                        className={cn("h-8 w-8 p-0", t.isExcluded ? "text-green-600 border-green-200 bg-green-50 hover:bg-green-100" : "text-muted-foreground hover:bg-destructive/10 hover:text-destructive")}
                                        onClick={() => toggleExclusion(t)}
                                        title={t.isExcluded ? "計算に含める" : "除外する"}
                                    >
                                        {t.isExcluded ? "復" : "除"}
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingTransaction(t)}> <Edit2 className="w-4 h-4" /> </Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteTransaction(t.id)}> <Trash2 className="w-4 h-4" /> </Button>

                                    {/* Action to create keyword from description */}
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50"
                                        title="カテゴリ判定ルールに追加"
                                        onClick={() => openKeywordsDialog(t)}
                                    >
                                        <Tag className="w-4 h-4" />
                                    </Button>
                                </td>
                            </tr>
                        ))}
                        {sorted.length === 0 && (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-muted-foreground">データがありません</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </CardContent>
            {editingTransaction && (
                <EditTransactionModal
                    transaction={editingTransaction}
                    onClose={() => setEditingTransaction(null)}
                />
            )}

            <ManualEntryModal
                isOpen={isManualModalOpen}
                onClose={() => setIsManualModalOpen(false)}
                onSave={() => {
                    // Optional: Show toast or feedback here
                }}
            />

            {keywordDialogState && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-card text-card-foreground rounded-lg shadow-lg w-full max-w-sm border p-6 animate-in fade-in zoom-in-95">
                        <h3 className="font-semibold mb-4">キーワード自動判定に追加</h3>
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">対象カテゴリ</p>
                                <select
                                    className="w-full p-2 rounded border bg-background"
                                    value={keywordDialogState.categoryId}
                                    onChange={(e) => setKeywordDialogState({ ...keywordDialogState, categoryId: e.target.value })}
                                >
                                    {categories.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">追加するキーワード</p>
                                <input
                                    className="w-full p-2 rounded border bg-background"
                                    value={keywordDialogState.keyword}
                                    onChange={(e) => setKeywordDialogState({ ...keywordDialogState, keyword: e.target.value })}
                                />
                                <p className="text-xs text-muted-foreground mt-1">※今後、このキーワードを含む取引は自動で選択カテゴリに分類されます。</p>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button variant="ghost" onClick={() => setKeywordDialogState(null)}>キャンセル</Button>
                                <Button onClick={handleSaveKeyword}>追加する</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Card>
    );
}
