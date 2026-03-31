"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);

    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: formData.get("username"),
        password: formData.get("password"),
      }),
    });

    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      setError("Usuário ou senha incorretos");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#141414]">
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-[#141414] to-[#141414]" />

      <div className="relative z-10 w-full max-w-md px-8 py-12 bg-black/75 rounded-lg">
        <h1 className="text-3xl font-bold text-white mb-2">Lucas TV</h1>
        <p className="text-gray-400 mb-8">Faça login para continuar</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <input
              name="username"
              type="text"
              placeholder="Usuário"
              required
              className="w-full px-4 py-3 bg-[#333] text-white rounded-md border border-gray-600 focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600 placeholder-gray-400"
            />
          </div>

          <div>
            <input
              name="password"
              type="password"
              placeholder="Senha"
              required
              className="w-full px-4 py-3 bg-[#333] text-white rounded-md border border-gray-600 focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600 placeholder-gray-400"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
