import { NextRequest, NextResponse } from 'next/server';

const PROTECTED_PREFIX = '/app';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith(PROTECTED_PREFIX)) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get('app_access_token')?.value;
  const refreshToken = request.cookies.get('app_refresh_token')?.value;

  // Only redirect if both tokens are missing.
  // If access token is missing or expired, the client-side API
  // will catch the 401 and attempt a refresh using the refresh token.
  if (!accessToken && !refreshToken) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/app/:path*'],
};
