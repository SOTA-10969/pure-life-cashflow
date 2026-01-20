"use client";

import { useFinanceStore } from "@/hooks/use-finance-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/base";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Transaction } from "@/types";
import { useMemo } from "react";

// Shared font style for all chart elements
const CHART_FONT_FAMILY = "'Noto Sans JP', 'Hiragino Sans', 'Meiryo', sans-serif";
const CHART_FONT_SIZE = 12;
const CHART_FONT_COLOR = "#64748b"; // Slate-500

export function AnalyticsCharts({ transactions, mode = 'ALL' }: { transactions: Transaction[], mode?: 'MONTHLY' | 'ALL' }) {
    const { categories } = useFinanceStore();

    const dailyData = useMemo(() => {
        const map = new Map<string, number>();

        // If monthly mode, pre-fill all days of the month with 0
        if (mode === 'MONTHLY' && transactions.length > 0) {
            const dateStr = transactions[0].date;
            const [y, m] = dateStr.split('-').map(Number);
            const daysInMonth = new Date(y, m, 0).getDate();
            for (let d = 1; d <= daysInMonth; d++) {
                const dayStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                map.set(dayStr, 0);
            }
        }

        transactions.forEach(t => {
            if (t.isExcluded) return;
            const val = t.amount < 0 ? Math.abs(t.amount) : 0;
            if (val === 0) return;

            const date = t.date;
            map.set(date, (map.get(date) || 0) + val);
        });

        let result = Array.from(map.entries())
            .map(([date, amount]) => ({ date, amount }))
            .sort((a, b) => a.date.localeCompare(b.date));

        if (mode === 'ALL') {
            result = result.filter(r => r.amount > 0);
        }

        return result;
    }, [transactions, mode]);

    const categoryData = useMemo(() => {
        const map = new Map<string, number>();
        transactions.forEach(t => {
            if (t.isExcluded || t.amount >= 0) return;
            const val = Math.abs(t.amount);
            const catId = t.categoryId || 'unknown';
            map.set(catId, (map.get(catId) || 0) + val);
        });

        return Array.from(map.entries())
            .map(([id, value]) => {
                const cat = categories.find(c => c.id === id);
                return { name: cat?.name || id, value, color: cat?.color || '#94a3b8' };
            })
            .sort((a, b) => b.value - a.value);
    }, [transactions, categories]);

    if (transactions.length === 0) {
        return (
            <div className="grid gap-4 md:grid-cols-2">
                <Card className="h-[300px] flex items-center justify-center text-muted-foreground">データがありません</Card>
                <Card className="h-[300px] flex items-center justify-center text-muted-foreground">データがありません</Card>
            </div>
        )
    }

    return (
        <div
            id="main-chart"
            className="grid gap-4 md:grid-cols-2"
            style={{ fontFamily: CHART_FONT_FAMILY }}
        >
            <Card>
                <CardHeader>
                    <CardTitle style={{ fontFamily: CHART_FONT_FAMILY }}>日次支出推移</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] w-full min-w-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dailyData}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                <XAxis
                                    dataKey="date"
                                    tick={{
                                        fontSize: CHART_FONT_SIZE,
                                        fill: CHART_FONT_COLOR,
                                        fontFamily: CHART_FONT_FAMILY
                                    }}
                                    tickFormatter={(val) => val.slice(5)}
                                />
                                <YAxis
                                    tick={{
                                        fontSize: CHART_FONT_SIZE,
                                        fill: CHART_FONT_COLOR,
                                        fontFamily: CHART_FONT_FAMILY
                                    }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1e293b',
                                        border: 'none',
                                        color: '#fff',
                                        fontFamily: CHART_FONT_FAMILY,
                                        fontSize: CHART_FONT_SIZE
                                    }}
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                    formatter={(value: any) => [`${value.toLocaleString()}円`, '支出']}
                                />
                                <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle style={{ fontFamily: CHART_FONT_FAMILY }}>カテゴリ別支出</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] w-full min-w-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={categoryData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={2}
                                    dataKey="value"
                                >
                                    {categoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1e293b',
                                        border: 'none',
                                        color: '#fff',
                                        fontFamily: CHART_FONT_FAMILY,
                                        fontSize: CHART_FONT_SIZE
                                    }}
                                    formatter={(value: any) => [`${value.toLocaleString()}円`, '']}
                                />
                                <Legend
                                    layout="vertical"
                                    align="right"
                                    verticalAlign="middle"
                                    iconType="circle"
                                    wrapperStyle={{
                                        fontSize: CHART_FONT_SIZE,
                                        fontFamily: CHART_FONT_FAMILY,
                                        color: CHART_FONT_COLOR
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
