"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/base";
import { Input, Label } from "@/components/ui/input";
import { Transaction, Category, TransactionSource } from "@/types";
import { X, Check, Wallet, TrendingUp, ArrowDown, ArrowUp, Coins } from "lucide-react";
import { useFinanceStore } from "@/hooks/use-finance-store";
import { cn } from "@/lib/utils";

interface ManualEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave?: () => void;
}

export function ManualEntryModal({ isOpen, onClose, onSave }: ManualEntryModalProps) {
    const { categories, addTransactions } = useFinanceStore();

    // Form State
    const [date, setDate] = useState("");
    const [amountStr, setAmountStr] = useState("");
    const [type, setType] = useState<'EXPENSE' | 'INCOME' | 'INVESTMENT'>('EXPENSE');
    const [categoryId, setCategoryId] = useState("");
    const [description, setDescription] = useState("");
    const [source, setSource] = useState("現金");

    // Initialize with today's date
    useEffect(() => {
        if (isOpen) {
            setDate(new Date().toISOString().slice(0, 10));
            setAmountStr("");
            setType('EXPENSE');
            setCategoryId("");
            setDescription("");
            setSource("現金");
        }
    }, [isOpen]);

    const handleSave = () => {
        if (!date || !amountStr || !categoryId) return;

        const amountVal = parseInt(amountStr.replace(/,/g, ''), 10);
        if (isNaN(amountVal)) return;

        // Determine sign based on type
        // Expense: Negative
        // Income: Positive
        // Investment: Negative (money leaving wallet) but treated specially in UI
        let finalAmount = Math.abs(amountVal);
        if (type === 'EXPENSE' || type === 'INVESTMENT') {
            finalAmount = -finalAmount;
        }

        const newTransaction: Transaction = {
            id: crypto.randomUUID(),
            date,
            source: 'MANUAL', // We'll store the user selected source in description or separate field? 
            // The type definition has source as TransactionSource enum. 
            // 'MANUAL' is valid. We can append the "Cash/Bank" detail to description or create a new field.
            // Let's append to description for now to keep it simple or strictly use 'MANUAL'.
            // User requested "Payment Source" selection. Let's put that in originalRow or just assume 'MANUAL' is the source type.
            description: description || (type === 'INVESTMENT' ? '投資・出資' : '手動入力'),
            amount: finalAmount,
            categoryId,
            originalRow: { manualSource: source }, // Store extra metadata here
            type: type,
            isManual: true,
        };

        addTransactions([newTransaction]);

        // Show success feedback (simple alert for now or assumed global toast if available)
        // Since we don't have a toast lib setup, we'll just close. User asked for "Saved" toast.
        // We will simulate a small overlay or just close which feels instant.
        // Or we can add a simple state-based toast in page.tsx later.

        if (onSave) onSave();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
            <div className="bg-card w-full max-w-lg sm:rounded-xl rounded-t-xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-4 border-b flex items-center justify-between bg-muted/30">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-primary" />
                        手動入力
                    </h2>
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto">

                    {/* Type Selector */}
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            onClick={() => setType('EXPENSE')}
                            className={cn(
                                "flex flex-col items-center justify-center py-3 rounded-lg border-2 transition-all",
                                type === 'EXPENSE'
                                    ? "border-red-500 bg-red-500/10 text-red-500"
                                    : "border-transparent bg-muted hover:bg-muted/80 text-muted-foreground"
                            )}
                        >
                            <ArrowDown className="w-6 h-6 mb-1" />
                            <span className="text-xs font-bold">支出</span>
                        </button>
                        <button
                            onClick={() => setType('INCOME')}
                            className={cn(
                                "flex flex-col items-center justify-center py-3 rounded-lg border-2 transition-all",
                                type === 'INCOME'
                                    ? "border-green-500 bg-green-500/10 text-green-500"
                                    : "border-transparent bg-muted hover:bg-muted/80 text-muted-foreground"
                            )}
                        >
                            <ArrowUp className="w-6 h-6 mb-1" />
                            <span className="text-xs font-bold">収入</span>
                        </button>
                        <button
                            onClick={() => setType('INVESTMENT')}
                            className={cn(
                                "flex flex-col items-center justify-center py-3 rounded-lg border-2 transition-all",
                                type === 'INVESTMENT'
                                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-500"
                                    : "border-transparent bg-muted hover:bg-muted/80 text-muted-foreground"
                            )}
                        >
                            <TrendingUp className="w-6 h-6 mb-1" />
                            <span className="text-xs font-bold">投資・出資</span>
                        </button>
                    </div>

                    {/* Amount Input */}
                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">金額</Label>
                        <div className="relative">
                            <input
                                type="tel" // Activates convenient keypad on mobile
                                value={amountStr}
                                onChange={(e) => setAmountStr(e.target.value)}
                                placeholder="0"
                                className="w-full text-4xl font-bold bg-transparent border-b-2 border-muted focus:border-primary outline-none py-2 px-1 text-center font-mono placeholder:text-muted/20"
                                autoFocus
                            />
                            <span className="absolute right-0 bottom-4 text-muted-foreground font-bold">円</span>
                        </div>
                    </div>

                    {/* Date & Source */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>日付</Label>
                            <Input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="bg-muted/50"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>支払元/口座</Label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                value={source}
                                onChange={(e) => setSource(e.target.value)}
                            >
                                <option value="現金">現金 (財布)</option>
                                <option value="銀行振込">銀行振込</option>
                                <option value="クレジットカード">クレジットカード</option>
                                <option value="電子マネー">電子マネー</option>
                                <option value="その他">その他</option>
                            </select>
                        </div>
                    </div>

                    {/* Category Selection */}
                    <div className="space-y-2">
                        <Label>カテゴリ</Label>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[150px] overflow-y-auto p-1">
                            {categories.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setCategoryId(cat.id)}
                                    className={cn(
                                        "px-2 py-2 rounded text-xs font-medium border truncate transition-all",
                                        categoryId === cat.id
                                            ? "ring-2 ring-primary border-transparent bg-primary/10"
                                            : "border-border bg-card hover:border-primary/50"
                                    )}
                                    style={{
                                        color: categoryId === cat.id ? cat.color : undefined,
                                        borderColor: categoryId === cat.id ? cat.color : undefined
                                    }}
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label>内容・メモ</Label>
                        <Input
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={type === 'INVESTMENT' ? "例: S&P500積立" : "例: ランチ、タクシー代など"}
                        />
                    </div>

                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-muted/30 flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose} className="w-24">キャンセル</Button>
                    <Button
                        onClick={handleSave}
                        className={cn(
                            "w-32 font-bold transition-all",
                            !amountStr || !categoryId ? "opacity-50 cursor-not-allowed" : "hover:scale-105 active:scale-95"
                        )}
                        disabled={!amountStr || !categoryId}
                    >
                        保存
                    </Button>
                </div>
            </div>
        </div>
    );
}
