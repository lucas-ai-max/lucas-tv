"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { tmdbImage } from "@/lib/constants";
import type { SuggestItem } from "@/app/api/search/suggest/route";

const NAV_LINKS = [
  { href: "/", label: "Início" },
  { href: "/search?q=movie", label: "Filmes" },
  { href: "/search?q=series", label: "Séries" },
];

export default function Navbar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SuggestItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Debounced suggestion fetch.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      abortRef.current?.abort();
      const ctl = new AbortController();
      abortRef.current = ctl;
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(q)}`, {
          signal: ctl.signal,
        });
        const data = (await res.json()) as { items: SuggestItem[] };
        setSuggestions(data.items);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 280);
    return () => clearTimeout(t);
  }, [query]);

  // Close on outside click.
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q) {
      setShowSuggestions(false);
      router.push(`/search?q=${encodeURIComponent(q)}`);
    }
  }

  function pickSuggestion(item: SuggestItem) {
    setShowSuggestions(false);
    setQuery("");
    const href = item.mediaType === "movie" ? `/movie/${item.id}` : `/series/${item.id}`;
    router.push(href);
  }

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/95 via-black/70 to-transparent px-4 md:px-8 py-3 md:py-4">
      <div className="flex items-center justify-between gap-3">
        {/* Left: brand + desktop nav */}
        <div className="flex items-center gap-6 min-w-0">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="md:hidden text-white p-1 -ml-1"
            aria-label="Menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
          <Link
            href="/"
            className="text-red-600 font-bold text-xl md:text-2xl tracking-tight whitespace-nowrap"
          >
            Lucas TV
          </Link>
          <div className="hidden md:flex items-center gap-5 text-sm text-gray-300">
            {NAV_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-white transition-colors">
                {l.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Right: search + logout */}
        <div className="flex items-center gap-2 md:gap-4 flex-1 max-w-md md:max-w-none md:flex-initial">
          <div ref={wrapperRef} className="relative flex-1 md:flex-initial">
            <form onSubmit={handleSearch}>
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
                  />
                </svg>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Buscar filmes, séries..."
                  className="w-full md:w-72 pl-9 pr-3 py-2 bg-black/60 border border-gray-600 rounded-md text-sm text-white placeholder-gray-400 focus:outline-none focus:border-white transition-colors"
                />
              </div>
            </form>

            {showSuggestions && query.trim().length >= 2 && (
              <div className="absolute top-full left-0 right-0 md:right-auto md:w-[28rem] mt-2 bg-[#141414] border border-gray-700 rounded-md shadow-2xl overflow-hidden max-h-[70vh] overflow-y-auto">
                {loading && suggestions.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-400">Buscando…</div>
                ) : suggestions.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-400">Sem resultados</div>
                ) : (
                  <ul>
                    {suggestions.map((item) => (
                      <li key={`${item.mediaType}-${item.id}`}>
                        <button
                          type="button"
                          onClick={() => pickSuggestion(item)}
                          className="w-full flex gap-3 items-center px-3 py-2 hover:bg-white/10 transition-colors text-left"
                        >
                          <div className="relative w-10 h-14 flex-shrink-0 bg-[#1f1f1f] rounded overflow-hidden">
                            {item.posterPath ? (
                              <Image
                                src={tmdbImage(item.posterPath, "w92")}
                                alt={item.title}
                                fill
                                sizes="40px"
                                className="object-cover"
                              />
                            ) : null}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-white truncate">{item.title}</p>
                            <p className="text-xs text-gray-400">
                              {item.mediaType === "movie" ? "Filme" : "Série"}
                              {item.year ? ` · ${item.year}` : ""}
                              {item.voteAverage ? ` · ★ ${item.voteAverage.toFixed(1)}` : ""}
                            </p>
                          </div>
                        </button>
                      </li>
                    ))}
                    <li>
                      <button
                        type="button"
                        onClick={handleSearch}
                        className="w-full px-4 py-2 text-sm text-red-400 hover:bg-white/10 border-t border-gray-800 text-left"
                      >
                        Ver todos os resultados para &quot;{query.trim()}&quot;
                      </button>
                    </li>
                  </ul>
                )}
              </div>
            )}
          </div>

          <button
            onClick={handleLogout}
            className="text-sm text-gray-300 hover:text-white transition-colors hidden sm:inline-flex"
          >
            Sair
          </button>
        </div>
      </div>

      {/* Mobile menu drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-3 border-t border-gray-800 pt-3 flex flex-col gap-1 text-sm">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMobileMenuOpen(false)}
              className="text-gray-300 hover:text-white py-2"
            >
              {l.label}
            </Link>
          ))}
          <button
            onClick={handleLogout}
            className="text-gray-300 hover:text-white py-2 text-left"
          >
            Sair
          </button>
        </div>
      )}
    </nav>
  );
}
