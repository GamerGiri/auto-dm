/**
 * NextAuth.js v5 — Auth Route Handler
 *
 * Provides session management for InstaReply.
 * Uses a custom Instagram OAuth provider.
 *
 * In Phase 2, this will be fully wired up with the Instagram OAuth flow.
 * For Phase 1, this provides the auth infrastructure.
 */

import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db/client";

export const authConfig: NextAuthConfig = {
  providers: [
    // Custom credentials provider for Instagram OAuth
    // The actual OAuth flow happens via /api/instagram/connect → /api/instagram/callback
    // This provider validates that the user exists in our DB
    Credentials({
      name: "Instagram",
      credentials: {
        userId: { label: "User ID", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.userId) return null;

        const user = await prisma.user.findUnique({
          where: { id: credentials.userId as string },
        });

        if (!user) return null;

        return {
          id: user.id,
          name: user.name ?? user.instagramUsername,
          email: user.email,
        };
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (token?.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authConfig);

export { handler as GET, handler as POST };
