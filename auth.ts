import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { syncUserRecord, findUserByEmail } from "./lib/admin-actions";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await findUserByEmail(credentials.email as string);
        if (!user || !user.password) return null;

        const isPasswordCorrect = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isPasswordCorrect) return null;

        return {
          id: user.uid,
          email: credentials.email as string,
          name: user.name,
          image: user.photoURL,
        };
      }
    })
  ],
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log("SignIn Callback Start:", { provider: account?.provider, id: user.id, email: user.email });
      if (account?.provider === "google") {
        try {
          if (user.email) {
            const linkedUser = await findUserByEmail(user.email);
            if (linkedUser && linkedUser.uid && linkedUser.uid !== user.id) {
              console.log("Linking to existing UID:", linkedUser.uid);
              user.id = linkedUser.uid;
            }
          }

          let referralId = null;
          let detectedCountry = "Unknown";
          try {
            const { cookies, headers } = await import("next/headers");
            const cookieStore = await cookies();
            const headerList = await headers();
            referralId = cookieStore.get("referralId")?.value || null;
            detectedCountry = cookieStore.get("userCountry")?.value || "Unknown";
            if (detectedCountry === "Unknown") {
              detectedCountry = headerList.get("x-vercel-ip-country") || 
                                headerList.get("cf-ipcountry") || 
                                "Unknown";
            }
          } catch (e) {
            console.log("Headers import failed (expected in some envs)");
          }

          console.log("Syncing user record for UID:", user.id);
          await syncUserRecord(user.id!, {
            isOwner: false,
            name: user.name || profile?.name || "User",
            email: user.email!,
            photoURL: user.image || null,
            created: new Date().toISOString(),
            last: new Date().toISOString(),
            country: detectedCountry,
            emailVerified: true,
            referralId: referralId
          });

          console.log("SignIn Successful");
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
        token.uid = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
        console.log("JWT Callback (Initial):", { uid: token.uid });
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.uid || token.sub) as string;
        // In v5 session.user might be a different type, ensure it has necessary fields
        (session.user as any).uid = session.user.id; 
      }
      console.log("Session Callback Final:", { 
        sessionId: session.user?.id,
        sessionEmail: session.user?.email
      });
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
