import SeriesDetailClient from "./SeriesDetailClient";
import { getSeriesDetails, getSeriesCredits, getSeasonDetails } from "@/lib/tmdb";

export default async function SeriesDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const seriesId = Number(id);

  const [series, credits] = await Promise.all([
    getSeriesDetails(seriesId),
    getSeriesCredits(seriesId),
  ]);

  // Pegar episódios da primeira temporada (>0). Falha do TMDB aqui não
  // deve quebrar a página — o cliente carrega temporadas sob demanda.
  const firstSeason = series.seasons.find((s) => s.season_number > 0);
  let initialSeasonData = null;
  if (firstSeason) {
    try {
      initialSeasonData = await getSeasonDetails(seriesId, firstSeason.season_number);
    } catch (err) {
      console.error("getSeasonDetails failed:", err);
    }
  }

  return (
    <SeriesDetailClient
      series={series}
      credits={credits}
      initialSeasonData={initialSeasonData}
    />
  );
}
