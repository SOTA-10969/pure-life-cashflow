import { Category, Transaction } from "@/types";

export function categorizeTransaction(description: string, categories: Category[]): string {
    if (!description) return 'other';

    const lowerDesc = description.toLowerCase();

    for (const category of categories) {
        if (category.keywords.some(keyword => lowerDesc.includes(keyword.toLowerCase()))) {
            return category.id;
        }
    }
    return 'other';
}

export function applyAutoCategorization(transactions: Transaction[], categories: Category[]): Transaction[] {
    return transactions.map(t => {
        // Only categorize if currently 'other' or we want to force re-categorize (usually only on import)
        if (t.categoryId === 'other') {
            return { ...t, categoryId: categorizeTransaction(t.description, categories) };
        }
        return t;
    });
}
