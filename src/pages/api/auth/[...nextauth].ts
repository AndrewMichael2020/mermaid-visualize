import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, account, profile }) {
      // Persist Google sub (stable user ID) into the JWT
      if (account && profile) {
        token.uid = account.providerAccountId;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as any).uid = token.uid as string;
      }
      return session;
    },
  },
};

export default NextAuth(authOptions);
