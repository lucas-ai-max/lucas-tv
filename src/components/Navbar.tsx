"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Navbar() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/90 to-transparent px-4 md:px-8 py-4 transition-all">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-red-600 font-bold text-2xl tracking-tight">
            Lucas TV
          </Link>
          <div className="hidden md:flex items-center gap-4 text-sm text-gray-300">
            <Link href="/" className="hover:text-white transition-colors">
              Início
            </Link>
            <Link href="/search?q=movie" className="hover:text-white transition-colors">
              Filmes
            </Link>
            <Link href="/search?q=series" className="hover:text-white transition-colors">
              Séries
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar..."
              className="w-40 md:w-64 px-4 py-2 bg-black/60 border border-gray-600 rounded text-sm text-white placeholder-gray-400 focus:outline-none focus:border-white transition-all"
            />
          </form>

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-sm text-gray-300 hover:text-white transition-colors"
          >
            Sair
          </button>
        </div>
      </div>
    </nav>
  );
}
