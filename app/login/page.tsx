'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const supabase = createClient();

    const handleLogin = async () => {
        if (!supabase) {
            setError('Supabase client not initialized');
            return;
        }
        setLoading(true);
        setError(null);
        setMessage(null);

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            window.location.href = '/';
        }
    };

    const handleSignUp = async () => {
        if (!supabase) {
            setError('Supabase client not initialized');
            return;
        }
        setLoading(true);
        setError(null);
        setMessage(null);

        const { error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) {
            setError(error.message);
        } else {
            setMessage('確認メールを送信しました。メールをご確認ください。');
        }
        setLoading(false);
    };

    return (
        <div style={{ maxWidth: 400, margin: '100px auto', padding: 24, border: '1px solid #333', borderRadius: 8 }}>
            <h1 style={{ marginBottom: 24, fontSize: 24, textAlign: 'center' }}>Pure Life Cashflow</h1>

            {error && (
                <div style={{ padding: 12, marginBottom: 16, background: '#fee2e2', color: '#dc2626', borderRadius: 4 }}>
                    {error}
                </div>
            )}

            {message && (
                <div style={{ padding: 12, marginBottom: 16, background: '#dcfce7', color: '#16a34a', borderRadius: 4 }}>
                    {message}
                </div>
            )}

            <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 4 }}>メールアドレス</label>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ width: '100%', padding: 8, border: '1px solid #555', borderRadius: 4, background: '#1a1a1a', color: '#fff' }}
                    placeholder="email@example.com"
                />
            </div>

            <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', marginBottom: 4 }}>パスワード</label>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ width: '100%', padding: 8, border: '1px solid #555', borderRadius: 4, background: '#1a1a1a', color: '#fff' }}
                    placeholder="••••••••"
                />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
                <button
                    onClick={handleLogin}
                    disabled={loading}
                    style={{ flex: 1, padding: 12, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                >
                    {loading ? '...' : 'ログイン'}
                </button>
                <button
                    onClick={handleSignUp}
                    disabled={loading}
                    style={{ flex: 1, padding: 12, background: '#6b7280', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                >
                    {loading ? '...' : '新規登録'}
                </button>
            </div>
        </div>
    );
}
