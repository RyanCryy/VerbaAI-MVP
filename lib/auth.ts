import type { NextAuthOptions } from "next-auth"

export const authOptions: NextAuthOptions = {
  // Configure one or more authentication providers
  providers: [
    // Add authentication providers here, e.g., Google, GitHub, etc.
    // Example:
    // GoogleProvider({
    //   clientId: process.env.GOOGLE_CLIENT_ID,
    //   clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    // }),
  ],
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token }) {
      return token
    },
    async session({ session, token }) {
      session.user = {
        name: token.name,
        email: token.email,
        image: token.picture,
        id: token.sub,
      } as any
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
}
