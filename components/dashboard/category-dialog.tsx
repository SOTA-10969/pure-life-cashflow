"use client";

import { useState, useEffect } from "react";

import { Button } from "@/components/ui/base";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/input"; // Assuming Label is in input.tsx based on previous context, checking file is better but I recall Input/Label were in same file Step 320 context? Let's check view_file of input.tsx if needed.
// Actually Step 319 mentions 'Created Input and Label components... in components/ui/input.tsx'.
// So standard import is correct.
import { Category } from "@/types";
// Actually, I need to check ui/base to see if Dialog is exported. 
// Previously viewed ui/base.tsx only showed Button and Card. 
// I will need to implement a simple modal using fixed positioning if Dialog component isn't available, or check if I can add it.
// The user said "Basic shadcn/ui components... Dialog" in plan, but looking at 'viewed_file' of ui/base.tsx (Step 318 context), it only had Button, Card, Input. 
// I should probably Implement a simple Modal inside this file or update ui/base.tsx.
// For now, I'll implement a self-contained Modal within this component file or a separate one to avoid clutter.
// Let's check ui/base.tsx content again to be sure? No, I saw it in Step 318. Only Button, Card, Input.
// I will implement a custom simple Modal UI here.

import { X, Plus, Trash2 } from "lucide-react";

interface CategoryDialogProps {
    isOpen: boolean;
    onClose: () => void;
    category?: Category; // If present, editing. If null, creating.
    onSave: (category: Category) => void;
}

export function CategoryDialog({ isOpen, onClose, category, onSave }: CategoryDialogProps) {
    const [name, setName] = useState("");
    const [color, setColor] = useState("#3b82f6");
    const [keywords, setKeywords] = useState<string[]>([]);
    const [newKeyword, setNewKeyword] = useState("");

    useEffect(() => {
        if (isOpen) {
            if (category) {
                setName(category.name);
                setColor(category.color);
                setKeywords(category.keywords || []);
            } else {
                setName("");
                setColor("#3b82f6");
                setKeywords([]);
            }
        }
    }, [isOpen, category]);

    const handleSave = () => {
        if (!name) return;
        const id = category?.id || crypto.randomUUID();
        onSave({
            id,
            name,
            color,
            keywords,
            type: category?.type || 'EXPENSE'
        });
        onClose();
    };

    const addKeyword = () => {
        if (newKeyword && !keywords.includes(newKeyword)) {
            setKeywords([...keywords, newKeyword]);
            setNewKeyword("");
        }
    };

    const removeKeyword = (k: string) => {
        setKeywords(keywords.filter(kw => kw !== k));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-card text-card-foreground rounded-lg shadow-lg w-full max-w-md border overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">{category ? "カテゴリ編集" : "カテゴリ作成"}</h2>
                        <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
                            <X className="w-4 h-4" />
                        </Button>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="cat-name">カテゴリ名</Label>
                        <Input
                            id="cat-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="例: 食費"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="cat-color">カラー</Label>
                        <div className="flex gap-2 items-center">
                            <input
                                id="cat-color"
                                type="color"
                                value={color}
                                onChange={(e) => setColor(e.target.value)}
                                className="h-10 w-20 p-1 bg-background border rounded cursor-pointer"
                            />
                            <span className="text-sm text-muted-foreground">{color}</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>自動判定キーワード</Label>
                        <div className="flex gap-2">
                            <Input
                                value={newKeyword}
                                onChange={(e) => setNewKeyword(e.target.value)}
                                placeholder="キーワード追加 (例: スーパー)"
                                onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
                            />
                            <Button onClick={addKeyword} size="icon" variant="secondary">
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2 max-h-[100px] overflow-y-auto p-2 border rounded bg-muted/20">
                            {keywords.length === 0 && <span className="text-xs text-muted-foreground">キーワードなし</span>}
                            {keywords.map(k => (
                                <span key={k} className="flex items-center gap-1 bg-background border px-2 py-1 rounded text-xs animate-in fade-in zoom-in">
                                    {k}
                                    <button onClick={() => removeKeyword(k)} className="text-muted-foreground hover:text-destructive">
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                            ※CSVインポート時に、これらのキーワードが含まれる取引を自動分類します。
                        </p>
                    </div>
                </div>

                <div className="p-4 bg-muted/20 flex justify-end gap-2 border-t">
                    <Button variant="ghost" onClick={onClose}>キャンセル</Button>
                    <Button onClick={handleSave}>保存</Button>
                </div>
            </div>
        </div>
    );
}
