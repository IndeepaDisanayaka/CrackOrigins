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
      console.log("SignIn Callback:", { provider: account?.provider, id: user.id, email: user.email });
      if (account?.provider === "google") {
        try {
          console.log("Syncing Google user to MongoDB:", user.email);
          // Sync user record to MongoDB on every sign-in
          const syncRes = await syncUserRecord(user.id!, {
            isOwner: false, 
            name: user.name || profile?.name || "User",
            email: user.email!,
            photoURL: user.image || null,
            created: new Date().toISOString(),
            last: new Date().toISOString(),
            country: "Unknown",
            emailVerified: true,
          });

          if (syncRes.success && syncRes.uid) {
            console.log("Setting user.id to linked/synced UID:", syncRes.uid);
            user.id = syncRes.uid;
          }

          return true;
        } catch (error) {
          console.error("Error during sign-in sync:", error);
          return true;
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.id && session.user) {
        session.user.id = token.id as string;
      } else if (token.sub && session.user) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
