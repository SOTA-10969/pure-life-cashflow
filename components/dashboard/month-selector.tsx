"use client";

import { Button } from "@/components/ui/base";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

interface MonthSelectorProps {
    currentMonth: string; // "YYYY-MM" or "ALL"
    availableMonths: string[]; // List of "YYYY-MM"
    onMonthChange: (month: string) => void;
}

export function MonthSelector({ currentMonth, availableMonths, onMonthChange }: MonthSelectorProps) {
    // Helper to sort months descending
    const sortedMonths = [...availableMonths].sort().reverse();

    const handlePrev = () => {
        if (currentMonth === 'ALL') {
            onMonthChange(sortedMonths[0] || new Date().toISOString().slice(0, 7));
            return;
        }
        const currentIndex = sortedMonths.indexOf(currentMonth);
        if (currentIndex !== -1 && currentIndex < sortedMonths.length - 1) {
            onMonthChange(sortedMonths[currentIndex + 1]);
        }
    };

    const handleNext = () => {
        if (currentMonth === 'ALL') return;
        const currentIndex = sortedMonths.indexOf(currentMonth);
        if (currentIndex !== -1 && currentIndex > 0) {
            onMonthChange(sortedMonths[currentIndex - 1]);
        }
    };

    // Format for display: 2025-01 -> 2025年01月
    const formatMonth = (m: string) => {
        if (m === 'ALL') return '全期間';
        const [y, M] = m.split('-');
        return `${y}年${M}月`;
    };

    return (
        <div className="flex items-center gap-2 bg-card p-1 rounded-lg border shadow-sm">
            <Button variant="ghost" size="icon" onClick={handlePrev} className="h-8 w-8">
                <ChevronLeft className="w-4 h-4" />
            </Button>

            <div className="relative group">
                <div className="flex items-center gap-2 px-3 py-1 font-medium cursor-pointer min-w-[120px] justify-center">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>{formatMonth(currentMonth)}</span>
                </div>

                {/* Simple Dropdown using native select for simplicity/robustness without heavy UI libs */}
                <select
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    value={currentMonth}
                    onChange={(e) => onMonthChange(e.target.value)}
                >
                    <option value="ALL">全期間</option>
                    {sortedMonths.map(m => (
                        <option key={m} value={m}>{formatMonth(m)}</option>
                    ))}
                </select>
            </div>

            <Button variant="ghost" size="icon" onClick={handleNext} disabled={currentMonth !== 'ALL' && sortedMonths.indexOf(currentMonth) <= 0} className="h-8 w-8">
                <ChevronRight className="w-4 h-4" />
            </Button>
        </div>
    );
}
