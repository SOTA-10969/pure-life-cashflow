"use client";

import { useState } from "react";
import { useFinanceStore } from "@/hooks/use-finance-store";
import { Button, Card, CardHeader, CardTitle, CardContent } from "@/components/ui/base";
import { Input } from "@/components/ui/input";
import { Plus, X, Tag } from "lucide-react";
import { Category } from "@/types";
import { CategoryDialog } from "./category-dialog";

export function CategoryManager() {
    const { categories, transactions, addCategory, updateCategory, deleteCategory } = useFinanceStore();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);

    // Calculate current month's totals per category
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const categoryTotals = transactions
        .filter(t => t.date.startsWith(currentMonth) && !t.isExcluded && t.amount < 0)
        .reduce((acc, t) => {
            acc[t.categoryId] = (acc[t.categoryId] || 0) + Math.abs(t.amount);
            return acc;
        }, {} as Record<string, number>);

    const handleOpenCreate = () => {
        setEditingCategory(null);
        setIsDialogOpen(true);
    };

    const handleOpenEdit = (category: Category) => {
        setEditingCategory(category);
        setIsDialogOpen(true);
    };

    const handleSave = (category: Category) => {
        if (editingCategory) {
            updateCategory(category);
        } else {
            addCategory(category);
        }
    };

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Tag className="w-4 h-4" /> カテゴリ設定
                    </CardTitle>
                    <Button size="sm" onClick={handleOpenCreate}>
                        <Plus className="w-3 h-3 mr-1" /> 新規作成
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {categories.map(c => (
                            <div
                                key={c.id}
                                className="flex items-center justify-between p-2 rounded border bg-card hover:bg-muted/50 transition-colors cursor-pointer group"
                                onClick={() => handleOpenEdit(c)}
                            >
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.color }}></span>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-sm font-medium truncate">{c.name}</span>
                                        <span className="text-[10px] text-muted-foreground truncate">
                                            {c.keywords.length > 0 ? `${c.keywords.length}キーワード` : 'キーワードなし'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {/* Monthly Total Badge */}
                                    <div className="text-right">
                                        <span className="block text-[10px] text-muted-foreground">今月</span>
                                        <span className="text-xs font-mono font-bold">
                                            {(categoryTotals[c.id] || 0).toLocaleString()}
                                        </span>
                                    </div>

                                    {!['food', 'other', 'income'].includes(c.id) && (
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (confirm(`${c.name}を削除しますか？`)) deleteCategory(c.id);
                                            }}
                                        >
                                            <X className="w-3 h-3" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <CategoryDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                category={editingCategory || undefined}
                onSave={handleSave}
            />
        </>
    );
}
