/**
 * 御之旅 Phase 6.1 — Next.js Middleware
 * Supabase Auth session 驗證 + RBAC 路由保護
 */
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { PUBLIC_PATHS, ROUTE_PERMISSIONS, hasPermission, type AppRole } from '@/lib/rbac';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 公開路由 — 直接放行
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // 靜態資源 / _next — 放行
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.includes('.')) {
    return NextResponse.next();
  }

  // ── 建立 Supabase Server Client（讀寫 cookie）──
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // 未設定 Supabase 時跳過 auth（開發 / 未串接階段）
  if (!supabaseUrl || !supabaseKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options });
        response = NextResponse.next({ request });
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: '', ...options });
        response = NextResponse.next({ request });
        response.cookies.set({ name, value: '', ...options });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ── 未登入 → 導向 /login（僅 page 路由；API 回 401）──
  if (!user) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // 首頁（/）暫時放行，讓未登入使用者也能進入前端 demo
    if (pathname === '/') {
      return response;
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── RBAC：檢查受保護 API 路由權限 ──
  const matchedRoute = Object.keys(ROUTE_PERMISSIONS).find((r) => pathname.startsWith(r));
  if (matchedRoute) {
    // 取 profile.role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role: AppRole = (profile?.role as AppRole) || 'client';
    const requiredPerm = ROUTE_PERMISSIONS[matchedRoute];

    if (!hasPermission(role, requiredPerm)) {
      return NextResponse.json(
        { error: 'Forbidden', message: `角色「${role}」無權存取此資源` },
        { status: 403 }
      );
    }
  }

  return response;
}

export const config = {
  matcher: [
    // 匹配所有路由，排除 _next/static、_next/image、favicon
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
