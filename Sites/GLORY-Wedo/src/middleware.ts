/**
 * 御之旅 — Next.js Middleware
 * MVP 階段：全部放行，Auth / RBAC 待 Cloudflare Edge 相容性確認後再啟用
 */
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // MVP 階段 — 全部放行，確保部署穩定
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
