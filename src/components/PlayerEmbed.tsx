"use client";

import Link from "next/link";

interface PlayerEmbedProps {
  src: string;
  title: string;
  backHref: string;
}

export default function PlayerEmbed({ src, title, backHref }: PlayerEmbedProps) {
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

      {/* sandbox blocks parent navigation and popups. The proxy serves
          sanitized content with a protective script that hides the sandbox
          attribute from the player's anti-sandbox detection. */}
      <iframe
        src={src}
        className="w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
        referrerPolicy="origin"
      />
    </div>
  );
}
