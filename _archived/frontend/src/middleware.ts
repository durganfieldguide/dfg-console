import { auth } from '@/lib/auth';

export default auth;

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/opportunities/:path*',
    '/analysis/:path*',
    '/settings/:path*',
  ],
};
