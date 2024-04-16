import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { isWhitelisted } from "@/lib/utils"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [Google({ clientId: process.env.GOOGLE_ID, clientSecret: process.env.GOOGLE_SECRET })],
  callbacks: {
    authorized({ request, auth }) {
      console.log("authorized", request, auth)
      return true
    },
    jwt({ token, trigger, session }) {
      console.log("token", token, session)
      const isListed = isWhitelisted(token.email as string)
      if (!isListed) throw new Error("Un")
      if (trigger === "update") token.name = session.user.name
      return token
    }
  },
  pages: {
    signIn: "/"
  }
})
