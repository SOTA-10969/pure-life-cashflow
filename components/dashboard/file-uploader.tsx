"use client";

import { useState, useCallback } from "react";
import { Upload, FileText, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/base";
import { cn } from "@/lib/utils";
import { parseAndNormalizeCSV } from "@/lib/csv-parser";
import { useFinanceStore } from "@/hooks/use-finance-store";

export function FileUploader() {
    const [isDragOver, setIsDragOver] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const { addTransactions } = useFinanceStore();

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    }, []);

    const processFiles = async (files: FileList | File[]) => {
        setIsProcessing(true);
        setMessage(null);
        let totalAdded = 0;
        let totalExcluded = 0;
        const errors: string[] = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                const result = await parseAndNormalizeCSV(file);
                if (result.transactions.length > 0) {
                    addTransactions(result.transactions);
                    totalAdded += result.transactions.length;
                    totalExcluded += result.transactions.filter(t => t.isExcluded).length;
                }
                if (result.errors.length > 0) {
                    errors.push(`${file.name}: ${result.errors.slice(0, 3).join(', ')}...`);
                }
            } catch (e) {
                errors.push(`${file.name}: 読み込みに失敗しました`);
                console.error(e);
            }
        }

        setIsProcessing(false);
        const successMsg = `${totalAdded}件の取引をインポートしました！\n(内 ${totalExcluded}件は二重計上防止のため除外されました)`;

        if (errors.length > 0) {
            setMessage({ type: 'error', text: `${successMsg}\n\nエラーがあります:\n${errors.join('\n')}` });
        } else {
            setMessage({ type: 'success', text: successMsg });
        }
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            processFiles(e.dataTransfer.files);
        }
    }, [addTransactions]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            processFiles(e.target.files);
        }
        // Reset input
        e.target.value = '';
    };

    return (
        <div
            className={cn(
                "relative rounded-lg border-2 border-dashed p-8 transition-colors text-center",
                isDragOver ? "border-primary bg-primary/10" : "border-muted-foreground/25 hover:border-primary/50",
                isProcessing && "opacity-50 pointer-events-none"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <input
                id="file-upload"
                name="file-upload"
                type="file"
                multiple
                accept=".csv"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={handleFileSelect}
            />
            <div className="flex flex-col items-center gap-2">
                {isProcessing ? (
                    <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
                ) : (
                    <Upload className="h-10 w-10 text-muted-foreground" />
                )}
                <h3 className="text-lg font-semibold">CSVファイルをドロップ</h3>
                <p className="text-sm text-muted-foreground">
                    楽天カード, PayPay, ゆうちょ銀行のCSVに対応
                </p>
                <Button variant="secondary" className="mt-2 text-xs pointer-events-none">
                    またはファイルを選択
                </Button>
            </div>

            {message && (
                <div className={cn(
                    "mt-4 p-3 rounded text-sm text-left whitespace-pre-wrap",
                    message.type === 'error' ? "bg-destructive/10 text-destructive" : "bg-green-500/10 text-green-500"
                )}>
                    {message.type === 'error' && <AlertCircle className="inline w-4 h-4 mr-1 mb-0.5" />}
                    {message.text}
                </div>
            )}
        </div>
    );
}
