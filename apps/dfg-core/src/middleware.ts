/**
 * Simple password-based authentication middleware for dfg-core
 *
 * Protects all routes except /login and /api/auth/login
 * Uses a single password stored in CORE_ACCESS_PASSWORD env var
 */

import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow login page and auth API
  if (pathname === '/login' || pathname === '/api/auth/login') {
    return NextResponse.next();
  }

  // Check for auth cookie
  const authCookie = request.cookies.get('dfg-core-auth');

  if (!authCookie || authCookie.value !== 'authenticated') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
