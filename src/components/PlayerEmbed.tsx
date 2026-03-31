"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";

interface PlayerEmbedProps {
  src: string;
  title: string;
  backHref: string;
}

export default function PlayerEmbed({ src, title, backHref }: PlayerEmbedProps) {
  const [shieldActive, setShieldActive] = useState(true);
  const [clickCount, setClickCount] = useState(0);

  // Bloqueia window.open e popups disparados pelo iframe
  useEffect(() => {
    const originalOpen = window.open;
    window.open = function () {
      return null;
    };

    // Bloqueia tentativas de redirecionar a pagina pai
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (shieldActive) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.open = originalOpen;
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [shieldActive]);

  const handleShieldClick = useCallback(() => {
    const next = clickCount + 1;
    setClickCount(next);
    if (next >= 2) {
      setShieldActive(false);
    }
  }, [clickCount]);

  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 to-transparent p-4 flex items-center gap-4 opacity-0 hover:opacity-100 transition-opacity duration-300">
        <Link
          href={backHref}
          className="flex items-center gap-2 text-white hover:text-gray-300 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Voltar
        </Link>
        <span className="text-white font-medium truncate">{title}</span>
      </div>

      {/* Click shield */}
      {shieldActive && (
        <div
          onClick={handleShieldClick}
          className="absolute inset-0 z-10 cursor-pointer flex items-center justify-center"
        >
          <div className="bg-black/70 px-6 py-4 rounded-lg text-center pointer-events-none">
            <svg className="w-16 h-16 text-white mx-auto mb-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            <p className="text-white text-lg font-medium">
              {clickCount === 0 ? "Clique para carregar" : "Clique novamente para assistir"}
            </p>
          </div>
        </div>
      )}

      {/* Player iframe - sem sandbox pois a API detecta e bloqueia */}
      <iframe
        src={src}
        className="w-full h-full border-0"
        allow="autoplay; fullscreen; encrypted-media"
        referrerPolicy="origin"
      />
    </div>
  );
}
