import Image from "next/image";
import Link from "next/link";
import { tmdbImage } from "@/lib/constants";

interface ContentCardProps {
  id: number;
  title: string;
  posterPath: string | null;
  voteAverage: number;
  year: string;
  mediaType: "movie" | "tv";
  hrefOverride?: string;
  progressPercent?: number;
}

export default function ContentCard({
  id,
  title,
  posterPath,
  voteAverage,
  year,
  mediaType,
  hrefOverride,
  progressPercent,
}: ContentCardProps) {
  const href = hrefOverride || (mediaType === "movie" ? `/movie/${id}` : `/series/${id}`);
  const progress = Math.max(0, Math.min(100, progressPercent || 0));

  return (
    <Link
      href={href}
      className="group flex-shrink-0 snap-start w-[130px] sm:w-[150px] md:w-[180px] transition-transform duration-300 hover:scale-[1.04] active:scale-95"
    >
      <div className="relative aspect-[2/3] rounded-md overflow-hidden bg-[#1f1f1f]">
        {posterPath ? (
          <Image
            src={tmdbImage(posterPath)}
            alt={title}
            fill
            sizes="180px"
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
            Sem imagem
          </div>
        )}

        {voteAverage > 0 && (
          <div className="absolute top-2 right-2 bg-black/80 text-yellow-400 text-xs font-bold px-1.5 py-0.5 rounded">
            {voteAverage.toFixed(1)}
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {progress > 0 && (
          <div className="absolute left-0 right-0 bottom-0 h-1 bg-white/25">
            <div className="h-full bg-red-600" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>

      <div className="mt-2">
        <p className="text-sm text-white truncate">{title}</p>
        <p className="text-xs text-gray-400">{year}</p>
      </div>
    </Link>
  );
}
