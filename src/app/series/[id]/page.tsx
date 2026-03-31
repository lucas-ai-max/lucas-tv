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

  // Pegar episódios da primeira temporada (>0)
  const firstSeason = series.seasons.find((s) => s.season_number > 0);
  const initialSeasonData = firstSeason
    ? await getSeasonDetails(seriesId, firstSeason.season_number)
    : null;

  return (
    <SeriesDetailClient
      series={series}
      credits={credits}
      initialSeasonData={initialSeasonData}
    />
  );
}
