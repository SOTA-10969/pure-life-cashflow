"use client";

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { Transaction, Category, INITIAL_CATEGORIES } from '@/types';
import { applyAutoCategorization } from '@/lib/category-logic';

const STORAGE_KEY_TRANSACTIONS = 'plcf_transactions';
const STORAGE_KEY_CATEGORIES = 'plcf_categories';

// Define the shape of the store context
interface FinanceContextType {
    transactions: Transaction[];
    categories: Category[];
    isLoaded: boolean;
    addTransactions: (newTransactions: Transaction[]) => void;
    updateTransaction: (updated: Transaction) => void;
    updateTransactionCategory: (transactionId: string, categoryId: string) => void;
    deleteTransaction: (id: string) => void;
    addCategory: (category: Category) => void;
    updateCategory: (updated: Category) => void;
    deleteCategory: (id: string) => void;
    clearAllData: () => void;
}

const FinanceContext = createContext<FinanceContextType | null>(null);

function useFinanceStoreLogic(): FinanceContextType {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load from LocalStorage on mount
    useEffect(() => {
        // Prevent hydration mismatch by only running on client
        if (typeof window === 'undefined') return;

        const loadedTransactions = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
        const loadedCategories = localStorage.getItem(STORAGE_KEY_CATEGORIES);

        if (loadedTransactions) {
            try {
                setTransactions(JSON.parse(loadedTransactions));
            } catch (e) {
                console.error("Failed to parse transactions", e);
            }
        }

        if (loadedCategories) {
            try {
                setCategories(JSON.parse(loadedCategories));
            } catch (e) {
                console.error("Failed to parse categories", e);
                setCategories(INITIAL_CATEGORIES);
            }
        } else {
            setCategories(INITIAL_CATEGORIES);
        }
        setIsLoaded(true);
    }, []);

    // Save to LocalStorage whenever state changes
    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(transactions));
        }
    }, [transactions, isLoaded]);

    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(categories));
        }
    }, [categories, isLoaded]);

    const addTransactions = useCallback((newTransactions: Transaction[]) => {
        setTransactions(prev => {
            // Deduplicate based on CONTENT (date + amount + description) logic
            const existingSignatures = new Set(prev.map(t => `${t.date}|${t.amount}|${t.description}`));

            const uniqueNew = newTransactions.filter(t => {
                const signature = `${t.date}|${t.amount}|${t.description}`;
                return !existingSignatures.has(signature);
            });

            // Auto-categorize only the truly new ones
            // IMPORTANT: 'categories' state here is the latest one because logic executes in the component scope
            const categorized = applyAutoCategorization(uniqueNew, categories);

            if (categorized.length === 0) return prev;

            return [...prev, ...categorized];
        });
    }, [categories]);

    const updateTransaction = useCallback((updated: Transaction) => {
        setTransactions(prev => prev.map(t => t.id === updated.id ? updated : t));
    }, []);

    const updateTransactionCategory = useCallback((transactionId: string, categoryId: string) => {
        setTransactions(prev => prev.map(t => {
            if (t.id === transactionId) {
                return { ...t, categoryId };
            }
            return t;
        }));
    }, []);

    const deleteTransaction = useCallback((id: string) => {
        setTransactions(prev => prev.filter(t => t.id !== id));
    }, []);

    const addCategory = useCallback((category: Category) => {
        setCategories(prev => [...prev, category]);
    }, []);

    const updateCategory = useCallback((updated: Category) => {
        setCategories(prev => prev.map(c => c.id === updated.id ? updated : c));
    }, []);

    const deleteCategory = useCallback((id: string) => {
        setCategories(prev => prev.filter(c => c.id !== id));
    }, []);

    const clearAllData = useCallback(() => {
        if (confirm('本当に全てのデータを削除しますか？')) {
            setTransactions([]);
            setCategories(INITIAL_CATEGORIES);
            localStorage.removeItem(STORAGE_KEY_TRANSACTIONS);
            localStorage.removeItem(STORAGE_KEY_CATEGORIES);
        }
    }, []);

    return {
        transactions,
        categories,
        isLoaded,
        addTransactions,
        updateTransaction,
        updateTransactionCategory,
        deleteTransaction,
        addCategory,
        updateCategory,
        deleteCategory,
        clearAllData
    };
}

// Provider Component
export function FinanceProvider({ children }: { children: ReactNode }) {
    const store = useFinanceStoreLogic();

    return (
        <FinanceContext.Provider value= { store } >
        { children }
        </FinanceContext.Provider>
    );
}

// Hook to consume the context
export function useFinanceStore() {
    const context = useContext(FinanceContext);
    if (!context) {
        throw new Error("useFinanceStore must be used within a FinanceProvider");
    }
    return context;
}
