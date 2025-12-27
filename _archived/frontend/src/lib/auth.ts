import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import type { NextAuthConfig } from 'next-auth';

declare module 'next-auth' {
  interface User {
    role?: string;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string;
      role?: string;
    };
    opsToken?: string;
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    role?: string;
    opsToken?: string;
  }
}

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard') ||
        nextUrl.pathname.startsWith('/opportunities') ||
        nextUrl.pathname.startsWith('/analysis') ||
        nextUrl.pathname.startsWith('/settings');

      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; // Redirect to login
      } else if (isLoggedIn && nextUrl.pathname === '/login') {
        return Response.redirect(new URL('/dashboard', nextUrl));
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      // Always set opsToken from env (ensures it's current even for existing sessions)
      token.opsToken = process.env.OPS_TOKEN;
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role;
        session.opsToken = token.opsToken;
      }
      return session;
    },
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // For MVP, validate against environment variables
        // In production, this would validate against a database
        const validEmail = process.env.ADMIN_EMAIL || 'admin@durganfieldguide.com';
        const validPassword = process.env.ADMIN_PASSWORD || 'changeme123';

        if (
          credentials?.email === validEmail &&
          credentials?.password === validPassword
        ) {
          return {
            id: '1',
            email: credentials.email as string,
            name: 'Admin',
            role: 'admin',
          };
        }

        return null;
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  trustHost: true,
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
