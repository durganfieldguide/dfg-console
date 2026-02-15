/**
 * NextAuth.js Middleware
 *
 * Protects all routes except:
 * - /login (sign in page)
 * - /api/auth/* (NextAuth routes)
 * - /_next/* (Next.js internals)
 * - /favicon.ico, etc.
 */

import { withAuth } from 'next-auth/middleware'

export default withAuth({
  pages: {
    signIn: '/login',
  },
})

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - /login (auth page)
     * - /api/* (all API routes - they have their own auth)
     * - /_next/static (static files)
     * - /_next/image (image optimization)
     * - /favicon.ico, /icon.*, /apple-icon.* (icons)
     */
    '/((?!login|api|_next/static|_next/image|favicon.ico|icon|apple-icon).*)',
  ],
}
