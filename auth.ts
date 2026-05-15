import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { syncUserRecord, findUserByEmail } from "./lib/admin-actions";

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
          if (user.email) {
            const linkedUser = await findUserByEmail(user.email);
            if (linkedUser && linkedUser.uid && linkedUser.uid !== user.id) {
              console.log("Linking Google login to existing account uid:", linkedUser.uid);
              user.id = linkedUser.uid;
            }
          }

          console.log("Syncing Google user to MongoDB:", user.email);
          
          let referralId = null;
          let detectedCountry = "Unknown";
          try {
            const { cookies, headers } = await import("next/headers");
            const cookieStore = await cookies();
            const headerList = await headers();
            
            referralId = cookieStore.get("referralId")?.value || null;
            
            // 1. Try to get country from cookie (set by client-side AuthContext)
            detectedCountry = cookieStore.get("userCountry")?.value || "Unknown";
            
            // 2. If no cookie, try platform-specific headers
            if (detectedCountry === "Unknown") {
              detectedCountry = headerList.get("x-vercel-ip-country") || 
                                headerList.get("cf-ipcountry") || 
                                "Unknown";
            }
            
            // 3. Fallback: IP-based detection if still unknown and not generic local IP
            if (detectedCountry === "Unknown") {
              const ip = headerList.get("x-forwarded-for")?.split(',')[0] || headerList.get("x-real-ip");
              if (ip && ip !== "::1" && ip !== "127.0.0.1" && !ip.startsWith("192.168.") && !ip.startsWith("10.")) {
                try {
                  const geoRes = await fetch(`https://ipwho.is/${ip}`, { next: { revalidate: 3600 } });
                  if (geoRes.ok) {
                    const geoData = await geoRes.json();
                    if (geoData.success && geoData.country) {
                      detectedCountry = geoData.country;
                    }
                  }
                } catch (e) {
                  console.warn("Server-side IP geo-lookup failed:", e);
                }
              }
            }
          } catch (e) {
            console.warn("Could not read cookies/headers for country detection:", e);
          }

          const syncRes = await syncUserRecord(user.id!, {
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

          return true;
        } catch (error) {
          console.error("Error during sign-in sync:", error);
          return true;
        }
      }
      return true;
    },
    /**
     * The jwt callback is used to persist the user ID in the JWT token.
     */
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    /**
     * The session callback allows us to inject custom data into the session object.
     * We ensure the user ID is available in the session for client/server usage.
     */
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
