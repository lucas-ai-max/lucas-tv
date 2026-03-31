"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import SeasonSelector from "@/components/SeasonSelector";
import EpisodeList from "@/components/EpisodeList";
import { tmdbBackdrop, tmdbImage } from "@/lib/constants";
import type { TMDBSeriesDetails, TMDBCredits, TMDBSeasonDetails } from "@/types/tmdb";

interface SeriesDetailClientProps {
  series: TMDBSeriesDetails;
  credits: TMDBCredits;
  initialSeasonData: TMDBSeasonDetails | null;
}

export default function SeriesDetailClient({
  series,
  credits,
  initialSeasonData,
}: SeriesDetailClientProps) {
  const firstSeason = series.seasons.find((s) => s.season_number > 0);
  const [selectedSeason, setSelectedSeason] = useState(
    firstSeason?.season_number || 1
  );
  const [seasonData, setSeasonData] = useState<TMDBSeasonDetails | null>(
    initialSeasonData
  );
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);

  useEffect(() => {
    if (
      initialSeasonData &&
      selectedSeason === (firstSeason?.season_number || 1)
    ) {
      return;
    }

    setLoadingEpisodes(true);
    fetch(`/api/season?seriesId=${series.id}&season=${selectedSeason}`)
      .then((res) => res.json())
      .then((data) => {
        setSeasonData(data);
        setLoadingEpisodes(false);
      })
      .catch(() => setLoadingEpisodes(false));
  }, [selectedSeason, series.id, initialSeasonData, firstSeason?.season_number]);

  const year = series.first_air_date?.slice(0, 4) || "";

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Backdrop */}
      <div className="relative w-full h-[50vh] md:h-[60vh]">
        {series.backdrop_path && (
          <Image
            src={tmdbBackdrop(series.backdrop_path)}
            alt={series.name}
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
              {series.poster_path ? (
                <Image
                  src={tmdbImage(series.poster_path)}
                  alt={series.name}
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
            <h1 className="text-3xl md:text-4xl font-bold mb-2">{series.name}</h1>

            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-300 mb-4">
              {year && <span>{year}</span>}
              <span>{series.number_of_seasons} temporada{series.number_of_seasons > 1 ? "s" : ""}</span>
              <span className="text-yellow-400 font-semibold">
                {series.vote_average.toFixed(1)} / 10
              </span>
            </div>

            {series.genres.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {series.genres.map((genre) => (
                  <span
                    key={genre.id}
                    className="px-3 py-1 bg-white/10 rounded-full text-xs text-gray-300"
                  >
                    {genre.name}
                  </span>
                ))}
              </div>
            )}

            {series.tagline && (
              <p className="text-gray-400 italic mb-3">{series.tagline}</p>
            )}

            <p className="text-gray-200 leading-relaxed mb-6">{series.overview}</p>

            {/* Cast */}
            {credits.cast.length > 0 && (
              <div className="mb-8">
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

            {/* Episodes */}
            <div>
              <div className="flex items-center gap-4 mb-4">
                <h2 className="text-xl font-semibold">Episódios</h2>
                <SeasonSelector
                  seasons={series.seasons}
                  currentSeason={selectedSeason}
                  onSelect={setSelectedSeason}
                />
              </div>

              {loadingEpisodes ? (
                <div className="text-gray-400 py-8 text-center">
                  Carregando episódios...
                </div>
              ) : seasonData?.episodes ? (
                <EpisodeList episodes={seasonData.episodes} seriesId={series.id} />
              ) : (
                <div className="text-gray-400 py-8 text-center">
                  Nenhum episódio encontrado
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
