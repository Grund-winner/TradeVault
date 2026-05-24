import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const publicPaths = ['/login', '/pricing', '/subscription'];
  const isPublicPath = publicPaths.some(p => pathname === p || pathname.startsWith('/pricing/') || pathname.startsWith('/subscription/'));
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

  // Check subscription status via non-httpOnly cookie
  // Admins and hosts bypass subscription check
  const tvSub = request.cookies.get('tv_sub');
  const tvRole = request.cookies.get('tv_role');

  if (tvSub?.value !== 'active' && tvRole?.value !== 'admin' && tvRole?.value !== 'host') {
    // Only redirect non-admin/host users with expired subscription
    // Allow access to admin panel for admins/hosts
    if (pathname !== '/admin') {
      const pricingUrl = new URL('/pricing', request.url);
      pricingUrl.searchParams.set('expired', 'true');
      pricingUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(pricingUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|logo.png).*)'],
};
