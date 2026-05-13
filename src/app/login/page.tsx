"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type AuthMode = "login" | "register";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const res = await fetch(mode === "login" ? "/api/login" : "/api/register", {
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
      return;
    }

    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    setError(data?.error || "Nao foi possivel continuar.");
    setLoading(false);
  }

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError("");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#141414] px-4">
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-[#141414] to-[#141414]" />

      <div className="relative z-10 w-full max-w-md px-8 py-10 bg-black/75 rounded-lg">
        <h1 className="text-3xl font-bold text-white mb-2">Lucas TV</h1>
        <p className="text-gray-400 mb-6">
          {mode === "login" ? "Entre para continuar" : "Crie seu acesso"}
        </p>

        <div className="grid grid-cols-2 gap-2 mb-6 rounded-md bg-[#1f1f1f] p-1">
          <button
            type="button"
            onClick={() => changeMode("login")}
            className={`py-2 text-sm font-semibold rounded transition-colors ${
              mode === "login"
                ? "bg-white text-black"
                : "text-gray-300 hover:text-white"
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => changeMode("register")}
            className={`py-2 text-sm font-semibold rounded transition-colors ${
              mode === "register"
                ? "bg-white text-black"
                : "text-gray-300 hover:text-white"
            }`}
          >
            Criar acesso
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <input
            name="username"
            type="text"
            placeholder="Usuario"
            autoComplete="username"
            required
            minLength={2}
            maxLength={80}
            className="w-full px-4 py-3 bg-[#333] text-white rounded-md border border-gray-600 focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600 placeholder-gray-400"
          />

          <input
            name="password"
            type="password"
            placeholder="Senha"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            className="w-full px-4 py-3 bg-[#333] text-white rounded-md border border-gray-600 focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600 placeholder-gray-400"
          />

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? mode === "login"
                ? "Entrando..."
                : "Criando..."
              : mode === "login"
                ? "Entrar"
                : "Criar acesso"}
          </button>
        </form>
      </div>
    </div>
  );
}
