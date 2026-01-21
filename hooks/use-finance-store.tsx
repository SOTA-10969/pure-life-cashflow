"use client";

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { Transaction, Category, INITIAL_CATEGORIES } from '@/types';
import { applyAutoCategorization } from '@/lib/category-logic';
import { createClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

const STORAGE_KEY_TRANSACTIONS = 'plcf_transactions';
const STORAGE_KEY_CATEGORIES = 'plcf_categories';
const STORAGE_KEY_MIGRATED = 'plcf_supabase_migrated';

// UUID validation helper - checks if string is valid UUID format
const isValidUUID = (str: string | null | undefined): boolean => {
    if (!str) return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
};

// Convert categoryId to UUID or null (for non-UUID string IDs like "other")
const toUUIDOrNull = (categoryId: string | null | undefined): string | null => {
    if (!categoryId) return null;
    return isValidUUID(categoryId) ? categoryId : null;
};

interface FinanceContextType {
    transactions: Transaction[];
    categories: Category[];
    isLoaded: boolean;
    user: User | null;
    addTransactions: (newTransactions: Transaction[]) => void;
    updateTransaction: (updated: Transaction) => void;
    updateTransactionCategory: (transactionId: string, categoryId: string) => void;
    deleteTransaction: (id: string) => void;
    addCategory: (category: Category) => void;
    updateCategory: (updated: Category) => void;
    deleteCategory: (id: string) => void;
    clearAllData: () => void;
    signOut: () => Promise<void>;
}

const FinanceContext = createContext<FinanceContextType | null>(null);

function useFinanceStoreLogic(): FinanceContextType {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [authInitialized, setAuthInitialized] = useState(false);

    const supabase = createClient();

    // Auth state listener
    useEffect(() => {
        if (!supabase) {
            console.error("Supabase client missing in auth listener");
            setIsLoaded(true); // Stop loading so UI can show error
            setAuthInitialized(true);
            return;
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
            setUser(session?.user ?? null);
        });

        // Get initial user
        supabase.auth.getUser().then(({ data: { user } }: any) => {
            setUser(user);
        }).catch(() => {
            // If getUser fails, ensure we don't hang
            setIsLoaded(true);
        }).finally(() => {
            setAuthInitialized(true);
        });

        return () => subscription.unsubscribe();
    }, []);

    // Load data from Supabase when user is authenticated
    useEffect(() => {
        if (!authInitialized) return; // Wait until auth check completes

        if (!user) {
            setTransactions([]);
            setCategories([]);
            // If we have a supabase client but no user, it means we are logged out (or Checking).
            // However, we shouldn't spin forever. Middleware should handle redirect.
            // But if we are here, we set isLoaded to true to show "something" (e.g. empty) instead of spinner.
            // Note: If auth is still checking, this might flash. Ideally we track authLoading.
            // But for now, breaking infinite loop is priority.
            if (supabase) setIsLoaded(true);
            return;
        }

        const loadData = async () => {
            setIsLoaded(false);
            try {
                // Check if we need to migrate localStorage data
                const hasMigrated = localStorage.getItem(STORAGE_KEY_MIGRATED);

                if (!hasMigrated) {
                    await migrateLocalStorageData();
                }

                // Load categories from Supabase
                const { data: categoriesData, error: catError } = await supabase
                    .from('categories')
                    .select('*')
                    .order('created_at', { ascending: true });

                if (catError) {
                    console.error('Error loading categories:', catError);
                    alert('カテゴリの読み込みに失敗しました。');
                } else if (categoriesData && categoriesData.length > 0) {
                    setCategories(categoriesData.map((c: any) => ({
                        id: c.id,
                        name: c.name,
                        color: c.color,
                        keywords: c.keywords || [],
                        type: c.type || 'EXPENSE'
                    })));
                } else {
                    // Empty DB -> Initial Sync
                    const newCategories = await insertInitialCategories();
                    if (newCategories) {
                        setCategories(newCategories);
                    } else {
                        console.warn("Initial sync failed, falling back to static categories");
                        setCategories(INITIAL_CATEGORIES);
                    }
                }

                // Load transactions from Supabase
                const { data: transactionsData, error: txError } = await supabase
                    .from('transactions')
                    .select('*')
                    .order('date', { ascending: false });

                if (txError) {
                    console.error('Error loading transactions:', txError);
                    setTransactions([]);
                } else {
                    setTransactions(transactionsData?.map((t: any) => ({
                        id: t.id,
                        date: t.date,
                        description: t.description,
                        amount: t.amount,
                        source: t.source,
                        categoryId: t.category_id, // Allow null if DB has null
                        isExcluded: t.is_excluded || false,
                        autoCategoryReason: t.auto_category_reason,
                        originalRow: t.original_row
                    })) || []);
                }

            } catch (error) {
                console.error('Error loading data:', error);
                alert('データの読み込みに失敗しました。リロードしてください。');
            } finally {
                setIsLoaded(true);
            }
        };

        loadData();
    }, [user, authInitialized]);

    const migrateLocalStorageData = async () => {
        // ... (migration logic needs similar update but skipping for now to focus on initial sync)
        console.warn("Migration feature needs update for UUID compliance");
    };

    const insertInitialCategories = async (): Promise<Category[] | null> => {
        if (!user) return null;

        try {
            console.log("Starting initial category sync...");
            const toInsert = INITIAL_CATEGORIES.map(c => ({
                user_id: user.id,
                name: c.name,
                color: c.color,
                keywords: c.keywords,
                type: c.type
                // ID is OMITTED to let Supabase generate UUID
            }));

            const { error } = await supabase.from('categories').insert(toInsert);

            if (error) {
                console.error("Failed to insert initial categories:", error);
                throw error;
            }

            // Immediately fetch back to get valid UUIDs
            const { data, error: fetchError } = await supabase.from('categories').select('*');

            if (fetchError) throw fetchError;

            if (data) {
                return data.map((c: any) => ({
                    id: c.id,
                    name: c.name,
                    color: c.color,
                    keywords: c.keywords || [],
                    type: c.type || 'EXPENSE'
                }));
            }
            return null;
        } catch (e) {
            console.error("Critical error in insertInitialCategories:", e);
            return null;
        }
    };

    const addTransactions = useCallback(async (newTransactions: Transaction[]) => {
        if (!user) return;

        // Deduplicate based on content
        const existingSignatures = new Set(transactions.map(t => `${t.date}|${t.amount}|${t.description}`));

        const uniqueNew = newTransactions.filter(t => {
            const signature = `${t.date}|${t.amount}|${t.description}`;
            return !existingSignatures.has(signature);
        });

        const categorized = applyAutoCategorization(uniqueNew, categories);

        if (categorized.length === 0) return;

        // Insert to Supabase
        const toInsert = categorized.map(t => ({
            id: t.id,
            user_id: user.id,
            date: t.date,
            description: t.description,
            amount: t.amount,
            source: t.source,
            category_id: toUUIDOrNull(t.categoryId),
            is_excluded: t.isExcluded,
            auto_category_reason: t.autoCategoryReason,
            original_row: t.originalRow
        }));

        console.log('[addTransactions] Inserting', toInsert.length, 'transactions');
        console.log('[addTransactions] Sample data:', JSON.stringify(toInsert[0], null, 2));

        const { error } = await supabase.from('transactions').insert(toInsert);

        if (error) {
            console.error('[addTransactions] Error details:');
            console.error('  message:', error.message);
            console.error('  details:', error.details);
            console.error('  hint:', error.hint);
            console.error('  code:', error.code);
            console.error('  Full error:', JSON.stringify(error, null, 2));
            alert(`取引の追加に失敗しました: ${error.message || 'Unknown error'}`);
            return;
        }

        console.log('[addTransactions] Successfully inserted', categorized.length, 'transactions');
        setTransactions(prev => [...prev, ...categorized]);
    }, [user, transactions, categories]);

    const updateTransaction = useCallback(async (updated: Transaction) => {
        if (!user) return;

        const { error } = await supabase
            .from('transactions')
            .update({
                date: updated.date,
                description: updated.description,
                amount: updated.amount,
                source: updated.source,
                category_id: toUUIDOrNull(updated.categoryId),
                is_excluded: updated.isExcluded,
                auto_category_reason: updated.autoCategoryReason
            })
            .eq('id', updated.id);

        if (error) {
            console.error('[updateTransaction] Error:', error.message, error.details, error.hint, error.code);
            alert(`取引の更新に失敗しました: ${error.message || 'Unknown error'}`);
            return;
        }

        setTransactions(prev => prev.map(t => t.id === updated.id ? updated : t));
    }, [user]);

    const updateTransactionCategory = useCallback(async (transactionId: string, categoryId: string) => {
        if (!user) return;

        const { error } = await supabase
            .from('transactions')
            .update({ category_id: toUUIDOrNull(categoryId) })
            .eq('id', transactionId);

        if (error) {
            console.error('[updateTransactionCategory] Error:', error.message, error.details, error.hint, error.code);
            alert(`カテゴリの更新に失敗しました: ${error.message || 'Unknown error'}`);
            return;
        }

        setTransactions(prev => prev.map(t => {
            if (t.id === transactionId) {
                return { ...t, categoryId };
            }
            return t;
        }));
    }, [user]);

    const deleteTransaction = useCallback(async (id: string) => {
        if (!user) return;

        const { error } = await supabase
            .from('transactions')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting transaction:', error);
            return;
        }

        setTransactions(prev => prev.filter(t => t.id !== id));
    }, [user]);

    const addCategory = useCallback(async (category: Category) => {
        if (!user) return;

        const { error } = await supabase.from('categories').insert({
            id: category.id,
            user_id: user.id,
            name: category.name,
            color: category.color,
            keywords: category.keywords
        });

        if (error) {
            console.error('Error adding category:', error);
            return;
        }

        setCategories(prev => [...prev, category]);
    }, [user]);

    const updateCategory = useCallback(async (updated: Category) => {
        if (!user) return;

        // Validation: Cannot update category if ID is not a valid UUID (e.g., default categories not yet synced)
        if (!isValidUUID(updated.id)) {
            console.warn('[updateCategory] Skipping update for non-UUID category:', updated.id);
            alert('初期カテゴリの同期が完了するまで編集できません。リロードしてください。');
            return;
        }

        const { error } = await supabase
            .from('categories')
            .update({
                name: updated.name,
                color: updated.color,
                keywords: updated.keywords
            })
            .eq('id', updated.id);

        if (error) {
            console.error('[updateCategory] Error details:');
            console.error('  message:', error.message);
            console.error('  details:', error.details);
            console.error('  hint:', error.hint);
            console.error('  code:', error.code);
            console.error('  Full error:', JSON.stringify(error, null, 2));
            alert(`カテゴリーの更新に失敗しました: ${error.message || 'Unknown error'}`);
            return;
        }

        setCategories(prev => prev.map(c => c.id === updated.id ? updated : c));
    }, [user]);

    const deleteCategory = useCallback(async (id: string) => {
        if (!user) return;

        const { error } = await supabase
            .from('categories')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting category:', error);
            return;
        }

        setCategories(prev => prev.filter(c => c.id !== id));
    }, [user]);

    const clearAllData = useCallback(async () => {
        if (!user) return;

        if (!confirm('本当に全てのデータを削除しますか？')) return;

        // Delete all transactions
        await supabase.from('transactions').delete().eq('user_id', user.id);

        // Delete all categories
        await supabase.from('categories').delete().eq('user_id', user.id);

        // Re-insert initial categories
        await insertInitialCategories();

        setTransactions([]);
        setCategories(INITIAL_CATEGORIES);
    }, [user]);

    const signOut = useCallback(async () => {
        await supabase.auth.signOut();
        setUser(null);
        setTransactions([]);
        setCategories([]);
        window.location.href = '/login';
    }, []);

    return {
        transactions,
        categories,
        isLoaded,
        user,
        addTransactions,
        updateTransaction,
        updateTransactionCategory,
        deleteTransaction,
        addCategory,
        updateCategory,
        deleteCategory,
        clearAllData,
        signOut
    };
}

export function FinanceProvider({ children }: { children: ReactNode }) {
    const store = useFinanceStoreLogic();

    return (
        <FinanceContext.Provider value={store}>
            {children}
        </FinanceContext.Provider>
    );
}

export function useFinanceStore() {
    const context = useContext(FinanceContext);
    if (!context) {
        throw new Error("useFinanceStore must be used within a FinanceProvider");
    }
    return context;
}
