import { createBrowserClient } from '@supabase/ssr';

let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
    // Only create client on the browser side
    if (typeof window === 'undefined') {
        return null as any;
    }

    // Singleton pattern to avoid creating multiple clients
    if (!supabaseInstance) {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!url || !key) {
            console.error('Supabase environment variables are missing!');
            return null as any; // Allow handling null in components
        }

        try {
            supabaseInstance = createBrowserClient(url, key);
        } catch (error) {
            console.error('Failed to initialize Supabase client:', error);
            return null as any;
        }
    }

    return supabaseInstance;
}
