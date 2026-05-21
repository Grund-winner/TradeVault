import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes - no auth needed
  const publicPaths = ['/login'];
  const isPublicPath = publicPaths.some(p => pathname === p);
  const isApiRoute = pathname.startsWith('/api/'); // Let all API routes through (auth handled server-side)
  const isStaticAsset = pathname.startsWith('/_next/') || pathname.startsWith('/logo') || pathname === '/favicon.ico' || pathname === '/robots.txt';

  if (isPublicPath || isApiRoute || isStaticAsset) {
    return NextResponse.next();
  }

  // Check for session cookie
  const session = request.cookies.get('tv_session');

  if (!session?.value) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|logo.png).*)'],
};
