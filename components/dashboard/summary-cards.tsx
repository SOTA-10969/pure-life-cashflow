"use client";

import { useFinanceStore } from "@/hooks/use-finance-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/base";
import { ArrowDownIcon, ArrowUpIcon, Wallet } from "lucide-react";
import { Transaction } from "@/types";
import { cn } from "@/lib/utils";

export function SummaryCards({
    transactions,
    selectedMonth,
    selectedCategoryIds = []
}: {
    transactions: Transaction[],
    selectedMonth: string,
    selectedCategoryIds?: string[]
}) {

    // Helper to get stats for a specific month
    const getStats = (month: string, targetTransactions: Transaction[]) => {
        let filtered = month === 'ALL'
            ? targetTransactions
            : targetTransactions.filter(t => t.date.startsWith(month));

        // Apply Category Filter if present
        if (selectedCategoryIds.length > 0) {
            filtered = filtered.filter(t => selectedCategoryIds.includes(t.categoryId));
        }

        const income = filtered
            .filter(t => t.amount > 0 && !t.isExcluded)
            .reduce((sum, t) => sum + t.amount, 0);

        const expense = filtered
            .filter(t => t.amount < 0 && !t.isExcluded)
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);

        const excluded = filtered
            .filter(t => t.isExcluded)
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);

        return { income, expense, excluded };
    };

    const currentStats = getStats(selectedMonth, transactions);

    // Calculate Previous Month Stats for Comparison
    let prevStats = { income: 0, expense: 0, excluded: 0 };
    let hasPrev = false;

    if (selectedMonth !== 'ALL') {
        const date = new Date(selectedMonth + "-01");
        date.setMonth(date.getMonth() - 1);
        const prevMonthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        // Check if we actually have data for prev month to avoid silly comparisons
        const hasData = transactions.some(t => t.date.startsWith(prevMonthStr));
        if (hasData) {
            prevStats = getStats(prevMonthStr, transactions);
            hasPrev = true;
        }
    }

    const getDiff = (current: number, prev: number) => {
        if (!hasPrev || prev === 0) return null;
        const diff = current - prev;
        const pct = Math.round((diff / prev) * 100);
        return { diff, pct };
    };

    const incomeDiff = getDiff(currentStats.income, prevStats.income);
    const expenseDiff = getDiff(currentStats.expense, prevStats.expense);

    const balance = currentStats.income - currentStats.expense;

    return (
        <div className="grid gap-4 md:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">収支バランス</CardTitle>
                    <Wallet className={cn("h-4 w-4", balance >= 0 ? "text-blue-500" : "text-red-500")} />
                </CardHeader>
                <CardContent>
                    <div className={cn("text-2xl font-bold", balance >= 0 ? "text-blue-500" : "text-red-500")}>
                        {balance > 0 ? '+' : ''}{balance.toLocaleString()}円
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {selectedMonth === 'ALL' ? '全期間の合計' : '当月の収支結果'}
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">収入</CardTitle>
                    <ArrowUpIcon className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-green-500">+{currentStats.income.toLocaleString()}円</div>
                    {incomeDiff && (
                        <p className={cn("text-xs flex items-center gap-1 mt-1", incomeDiff.diff >= 0 ? "text-green-500" : "text-muted-foreground")}>
                            {incomeDiff.diff >= 0 ? <ArrowUpIcon className="w-3 h-3" /> : <ArrowDownIcon className="w-3 h-3" />}
                            <span>先月比 {incomeDiff.pct > 0 ? '+' : ''}{incomeDiff.pct}%</span>
                        </p>
                    )}
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">実支出</CardTitle>
                    <ArrowDownIcon className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-red-500">{currentStats.expense.toLocaleString()}円</div>
                    {expenseDiff && (
                        <p className={cn("text-xs flex items-center gap-1 mt-1", expenseDiff.diff > 0 ? "text-red-500" : "text-green-500")}>
                            {/* Expense going UP is bad (red), DOWN is good (green) */}
                            {expenseDiff.diff >= 0 ? <ArrowUpIcon className="w-3 h-3" /> : <ArrowDownIcon className="w-3 h-3" />}
                            <span>先月比 {expenseDiff.pct > 0 ? '+' : ''}{expenseDiff.pct}%</span>
                        </p>
                    )}
                </CardContent>
            </Card>
            <Card className="bg-muted/30 border-dashed">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">除外・振替分</CardTitle>
                    <div className="h-4 w-4 rounded-full bg-muted-foreground/20" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-muted-foreground">{currentStats.excluded.toLocaleString()}円</div>
                    <p className="text-xs text-muted-foreground">
                        計算対象外
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
