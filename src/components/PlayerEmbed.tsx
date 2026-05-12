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

      {/* Direct embed config per the official SuperFlixAPI docs. No sandbox:
          the upstream detects sandboxing and refuses to serve the player. */}
      <iframe
        src={src}
        className="w-full h-full border-0"
        allow="autoplay *; encrypted-media *; picture-in-picture *; fullscreen *; clipboard-write *; accelerometer *; gyroscope *; web-share *"
      />

      {/* Cover the player's built-in "Voltar" button at the top-left.
          The iframe is cross-origin so we can't hide it inside; instead we
          overlay an opaque rectangle that visually blends with the player's
          background and intercepts clicks. The z-index sits above the
          iframe but below our top bar so our own back button stays usable. */}
      <div className="absolute top-0 left-0 w-32 h-14 md:w-44 md:h-16 bg-black z-10 pointer-events-auto" />
    </div>
  );
}
