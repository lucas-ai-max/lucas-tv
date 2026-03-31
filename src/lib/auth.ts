import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Usuário", type: "text" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const validUsers = [
          {
            username: process.env.AUTH_USERNAME,
            password: process.env.AUTH_PASSWORD,
            id: "1",
            name: "Lucas",
          },
          {
            username: "acessolivre",
            password: "acessolivre",
            id: "2",
            name: "Visitante",
          },
        ];

        const user = validUsers.find(
          (u) =>
            u.username === credentials?.username &&
            u.password === credentials?.password
        );

        if (user) {
          return { id: user.id, name: user.name };
        }
        return null;
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
