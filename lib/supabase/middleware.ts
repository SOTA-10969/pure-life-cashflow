import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
    const path = request.nextUrl.pathname;

    // === SAFETY FIRST: Never block /login ===
    if (path.startsWith('/login')) {
        console.log('[Middleware] /login accessed - allowing without auth check');
        return NextResponse.next();
    }

    // === SAFETY: Never block /auth routes ===
    if (path.startsWith('/auth')) {
        console.log('[Middleware] /auth accessed - allowing without auth check');
        return NextResponse.next();
    }

    // === SAFETY: Never block static assets ===
    if (path.startsWith('/_next') || path.startsWith('/favicon') || path.includes('.')) {
        return NextResponse.next();
    }

    // === Now check auth for protected routes ===
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('[Middleware] Missing Supabase env vars - redirecting to /login to show error');
        if (!path.startsWith('/login')) {
            const url = request.nextUrl.clone();
            url.pathname = '/login';
            return NextResponse.redirect(url);
        }
        return NextResponse.next();
    }

    let supabaseResponse = NextResponse.next({ request });

    try {
        const supabase = createServerClient(
            supabaseUrl,
            supabaseKey,
            {
                cookies: {
                    getAll() {
                        return request.cookies.getAll();
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
                        supabaseResponse = NextResponse.next({ request });
                        cookiesToSet.forEach(({ name, value, options }) =>
                            supabaseResponse.cookies.set(name, value, options)
                        );
                    },
                },
            }
        );

        const { data: { user } } = await supabase.auth.getUser();

        console.log(`[Middleware] Path: ${path}, User: ${user?.email || 'null'}`);

        // If not logged in, redirect to /login
        if (!user) {
            console.log(`[Middleware] No user - redirecting ${path} to /login`);
            const url = request.nextUrl.clone();
            url.pathname = '/login';
            return NextResponse.redirect(url);
        }

        return supabaseResponse;
    } catch (error) {
        console.error('[Middleware] Error during auth check:', error);
        // On error, allow request to proceed rather than infinite loop
        return NextResponse.next();
    }
}
