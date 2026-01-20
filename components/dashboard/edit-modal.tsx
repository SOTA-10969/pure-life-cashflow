"use client";

import { useState, useEffect } from "react";
import { Transaction } from "@/types";
import { Button } from "@/components/ui/base";
import { Input, Label } from "@/components/ui/input";
import { X } from "lucide-react";
import { useFinanceStore } from "@/hooks/use-finance-store";

interface EditModalProps {
    transaction: Transaction | null;
    onClose: () => void;
}

export function EditTransactionModal({ transaction, onClose }: EditModalProps) {
    // Use local state for form
    const { categories, updateTransaction } = useFinanceStore();
    const [formData, setFormData] = useState<Partial<Transaction>>({});

    useEffect(() => {
        if (transaction) {
            setFormData(transaction);
        }
    }, [transaction]);

    if (!transaction) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.date && formData.amount !== undefined && formData.categoryId) {
            updateTransaction({ ...transaction, ...formData } as Transaction);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-card border rounded-lg shadow-lg">
                <div className="flex items-center justify-between p-6 pb-2">
                    <h3 className="text-lg font-semibold">取引の編集</h3>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-2">
                        <Label>日付</Label>
                        <Input
                            id="date"
                            name="date"
                            type="date"
                            value={formData.date || ''}
                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>内容</Label>
                        <Input
                            id="description"
                            name="description"
                            value={formData.description || ''}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>金額 (支出はマイナス)</Label>
                        <Input
                            id="amount"
                            name="amount"
                            type="number"
                            value={formData.amount || 0}
                            onChange={e => setFormData({ ...formData, amount: parseInt(e.target.value) })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>カテゴリ</Label>
                        <select
                            id="category"
                            name="category"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            value={formData.categoryId || ''}
                            onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                        >
                            {categories.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                        <Button type="button" variant="secondary" onClick={onClose}>キャンセル</Button>
                        <Button type="submit">保存</Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
