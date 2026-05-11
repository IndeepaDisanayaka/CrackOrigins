import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { syncUserRecord } from "./lib/admin-actions";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        try {
          // Sync user record to MongoDB on every sign-in
          await syncUserRecord(user.id!, {
            isOwner: false, // Default, will be checked in syncUserRecord
            name: user.name || profile?.name || "User",
            email: user.email!,
            photoURL: user.image || null,
            created: new Date().toISOString(), // Fallback if missing
            last: new Date().toISOString(),
            country: "Unknown", // Will be updated by client-side fetchCountry
            emailVerified: true,
          });
          return true;
        } catch (error) {
          console.error("Error during sign-in sync:", error);
          return true; // Still allow sign-in even if sync fails? 
          // Usually better to allow and sync later if it's not critical.
        }
      }
      return true;
    },
    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
