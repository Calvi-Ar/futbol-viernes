import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth: session, request }) {
      const isLoggedIn = !!session?.user;
      const isOnLogin = request.nextUrl.pathname === "/login";
      if (isOnLogin) return true;
      return isLoggedIn;
    },
    async signIn({ user, profile }) {
      if (!user.email) return false;
      try {
        // Dynamic import to avoid loading BigQuery/gRPC in Edge Runtime (middleware)
        const { upsertUser } = await import("./bigquery");
        await upsertUser({
          userId: profile?.sub ?? user.id ?? user.email,
          email: user.email,
          name: user.name ?? "",
          avatarUrl: user.image ?? "",
        });
      } catch (e) {
        console.error("Failed to upsert user in BigQuery:", e);
      }
      return true;
    },
    async jwt({ token, profile }) {
      if (profile?.sub) {
        token.userId = profile.sub;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId as string;
      }
      return session;
    },
  },
});
