import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const publicPaths = ['/login', '/pricing'];
  const isPublicPath = publicPaths.some(p => pathname === p || pathname.startsWith('/pricing/'));
  const isApiRoute = pathname.startsWith('/api/');
  const isStaticAsset = pathname.startsWith('/_next/') || pathname.startsWith('/logo') || pathname === '/favicon.ico' || pathname === '/robots.txt';

  if (isPublicPath || isApiRoute || isStaticAsset) {
    return NextResponse.next();
  }

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
