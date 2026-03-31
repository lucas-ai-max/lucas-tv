import Image from "next/image";
import Link from "next/link";
import { tmdbImage } from "@/lib/constants";
import type { TMDBEpisode } from "@/types/tmdb";

interface EpisodeListProps {
  episodes: TMDBEpisode[];
  seriesId: number;
}

export default function EpisodeList({ episodes, seriesId }: EpisodeListProps) {
  return (
    <div className="space-y-3">
      {episodes.map((ep) => (
        <Link
          key={ep.id}
          href={`/watch/series/${seriesId}/${ep.season_number}/${ep.episode_number}`}
          className="flex gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors group"
        >
          {/* Thumbnail */}
          <div className="relative flex-shrink-0 w-40 md:w-48 aspect-video rounded overflow-hidden bg-[#1f1f1f]">
            {ep.still_path ? (
              <Image
                src={tmdbImage(ep.still_path, "w300")}
                alt={ep.name}
                fill
                className="object-cover"
                sizes="192px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">
                Sem imagem
              </div>
            )}
            {/* Play overlay */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
              <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm text-gray-400">Ep. {ep.episode_number}</span>
              {ep.runtime && (
                <span className="text-xs text-gray-500">{ep.runtime}min</span>
              )}
            </div>
            <h3 className="font-medium text-white truncate">{ep.name}</h3>
            <p className="text-sm text-gray-400 line-clamp-2 mt-1">{ep.overview}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
