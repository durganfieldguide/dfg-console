/**
 * NextAuth.js API Route
 *
 * Handles authentication using credentials (email/password).
 * For internal use, we use a simple credentials provider with
 * allowed users defined in environment variables.
 */

import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'you@example.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // Get allowed users from environment
        // Format: "email1:password1,email2:password2"
        const allowedUsers = process.env.ALLOWED_USERS || ''
        const users = allowedUsers
          .split(',')
          .map((u) => {
            const [email, password] = u.split(':')
            return { email: email?.trim(), password: password?.trim() }
          })
          .filter((u) => u.email && u.password)

        // Check if credentials match any allowed user
        const user = users.find(
          (u) => u.email === credentials.email && u.password === credentials.password
        )

        if (user) {
          return {
            id: user.email,
            email: user.email,
            name: user.email.split('@')[0],
          }
        }

        return null
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.email = user.email
      }
      return token
    },
    async session({ session }) {
      return session
    },
  },
})

export { handler as GET, handler as POST }
