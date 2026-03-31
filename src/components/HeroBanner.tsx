import Image from "next/image";
import Link from "next/link";
import { tmdbBackdrop } from "@/lib/constants";
import type { TMDBMultiResult } from "@/types/tmdb";

interface HeroBannerProps {
  item: TMDBMultiResult;
}

export default function HeroBanner({ item }: HeroBannerProps) {
  const title = "title" in item ? item.title : item.name;
  const mediaType = item.media_type === "movie" ? "movie" : "tv";
  const href = mediaType === "movie" ? `/movie/${item.id}` : `/series/${item.id}`;

  return (
    <div className="relative w-full h-[60vh] md:h-[70vh]">
      {item.backdrop_path && (
        <Image
          src={tmdbBackdrop(item.backdrop_path)}
          alt={title}
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#141414]/80 to-transparent" />

      <div className="absolute bottom-16 left-4 md:left-8 max-w-xl z-10">
        <h1 className="text-3xl md:text-5xl font-bold mb-3 drop-shadow-lg">{title}</h1>
        <p className="text-sm md:text-base text-gray-200 line-clamp-3 mb-5">
          {item.overview}
        </p>
        <div className="flex gap-3">
          <Link
            href={`/watch/${mediaType === "movie" ? "movie" : "series"}/${item.id}${mediaType === "tv" ? "/1/1" : ""}`}
            className="px-6 py-2.5 bg-white text-black font-semibold rounded hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Assistir
          </Link>
          <Link
            href={href}
            className="px-6 py-2.5 bg-gray-500/70 text-white font-semibold rounded hover:bg-gray-500/50 transition-colors"
          >
            Mais Informações
          </Link>
        </div>
      </div>
    </div>
  );
}
