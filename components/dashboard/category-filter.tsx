"use client";

import { Button } from "@/components/ui/base";
import { Category } from "@/types";
import { Filter, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface CategoryFilterProps {
    categories: Category[];
    selectedCategoryIds: string[];
    onChange: (ids: string[]) => void;
}

export function CategoryFilter({ categories, selectedCategoryIds, onChange }: CategoryFilterProps) {
    const [isOpen, setIsOpen] = useState(false);

    const toggleCategory = (id: string) => {
        if (selectedCategoryIds.includes(id)) {
            onChange(selectedCategoryIds.filter(cid => cid !== id));
        } else {
            onChange([...selectedCategoryIds, id]);
        }
    };

    const clearFilter = () => {
        onChange([]);
        setIsOpen(false);
    };

    const isFiltered = selectedCategoryIds.length > 0;

    return (
        <div className="relative inline-block text-left">
            <div className="flex items-center gap-2">
                <Button
                    variant={isFiltered ? "secondary" : "outline"}
                    size="sm"
                    className={cn("h-10 gap-2 border-dashed", isFiltered && "border-solid border-primary bg-primary/10 text-primary")}
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <Filter className="w-4 h-4" />
                    {isFiltered ? `${selectedCategoryIds.length} 選択中` : "カテゴリ"}
                </Button>

                {isFiltered && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 text-muted-foreground hover:text-foreground"
                        onClick={() => onChange([])}
                        title="フィルターをクリア"
                    >
                        <X className="w-4 h-4" />
                    </Button>
                )}
            </div>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute left-0 mt-2 w-56 origin-top-left rounded-md bg-popover border shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50 animate-in fade-in zoom-in-95">
                        <div className="p-2 space-y-1 max-h-[300px] overflow-y-auto">
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground flex justify-between items-center">
                                <span>表示カテゴリを選択</span>
                                {isFiltered && (
                                    <button
                                        onClick={clearFilter}
                                        className="text-primary hover:underline"
                                    >
                                        クリア
                                    </button>
                                )}
                            </div>
                            <div className="h-px bg-border my-1" />
                            {categories.map(cat => {
                                const isSelected = selectedCategoryIds.includes(cat.id);
                                return (
                                    <button
                                        key={cat.id}
                                        onClick={() => toggleCategory(cat.id)}
                                        className={cn(
                                            "w-full text-left px-2 py-2 text-sm rounded-sm flex items-center justify-between transition-colors",
                                            isSelected ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                                        )}
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                            <div
                                                className="w-3 h-3 rounded-full shrink-0"
                                                style={{ backgroundColor: cat.color }}
                                            />
                                            <span className="truncate">{cat.name}</span>
                                        </div>
                                        {isSelected && <Check className="w-3 h-3 text-primary" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
