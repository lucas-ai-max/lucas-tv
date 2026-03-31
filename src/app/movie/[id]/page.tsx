import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { getMovieDetails, getMovieCredits } from "@/lib/tmdb";
import { tmdbBackdrop, tmdbImage } from "@/lib/constants";

export default async function MovieDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [movie, credits] = await Promise.all([
    getMovieDetails(Number(id)),
    getMovieCredits(Number(id)),
  ]);

  const year = movie.release_date?.slice(0, 4) || "";
  const hours = Math.floor(movie.runtime / 60);
  const mins = movie.runtime % 60;
  const duration = movie.runtime ? `${hours}h ${mins}min` : "";

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Backdrop */}
      <div className="relative w-full h-[50vh] md:h-[60vh]">
        {movie.backdrop_path && (
          <Image
            src={tmdbBackdrop(movie.backdrop_path)}
            alt={movie.title}
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#141414]/70 to-transparent" />
      </div>

      {/* Content */}
      <div className="-mt-32 relative z-10 px-4 md:px-8 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Poster */}
          <div className="hidden md:block flex-shrink-0 w-64">
            <div className="relative aspect-[2/3] rounded-lg overflow-hidden shadow-2xl">
              {movie.poster_path ? (
                <Image
                  src={tmdbImage(movie.poster_path)}
                  alt={movie.title}
                  fill
                  className="object-cover"
                  sizes="256px"
                />
              ) : (
                <div className="w-full h-full bg-[#1f1f1f] flex items-center justify-center text-gray-500">
                  Sem imagem
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">{movie.title}</h1>

            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-300 mb-4">
              {year && <span>{year}</span>}
              {duration && <span>{duration}</span>}
              <span className="text-yellow-400 font-semibold">
                {movie.vote_average.toFixed(1)} / 10
              </span>
            </div>

            {movie.genres.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {movie.genres.map((genre) => (
                  <span
                    key={genre.id}
                    className="px-3 py-1 bg-white/10 rounded-full text-xs text-gray-300"
                  >
                    {genre.name}
                  </span>
                ))}
              </div>
            )}

            {movie.tagline && (
              <p className="text-gray-400 italic mb-3">{movie.tagline}</p>
            )}

            <p className="text-gray-200 leading-relaxed mb-6">{movie.overview}</p>

            <Link
              href={`/watch/movie/${movie.id}`}
              className="inline-flex items-center gap-2 px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              Assistir Agora
            </Link>

            {/* Cast */}
            {credits.cast.length > 0 && (
              <div className="mt-8">
                <h2 className="text-xl font-semibold mb-4">Elenco</h2>
                <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2">
                  {credits.cast.slice(0, 12).map((person) => (
                    <div key={person.id} className="flex-shrink-0 w-24 text-center">
                      <div className="relative w-24 h-24 rounded-full overflow-hidden bg-[#1f1f1f] mb-2">
                        {person.profile_path ? (
                          <Image
                            src={tmdbImage(person.profile_path, "w185")}
                            alt={person.name}
                            fill
                            className="object-cover"
                            sizes="96px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-500 text-2xl">
                            ?
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-white truncate">{person.name}</p>
                      <p className="text-xs text-gray-400 truncate">{person.character}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
