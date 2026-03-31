import PlayerEmbed from "@/components/PlayerEmbed";
import { getSeriesDetails } from "@/lib/tmdb";
import { getEpisodePlayerUrl } from "@/lib/superflix";

export default async function WatchEpisodePage({
  params,
}: {
  params: Promise<{ id: string; season: string; episode: string }>;
}) {
  const { id, season, episode } = await params;
  const series = await getSeriesDetails(Number(id));

  return (
    <PlayerEmbed
      src={getEpisodePlayerUrl(id, Number(season), Number(episode))}
      title={`${series.name} - T${season}:E${episode}`}
      backHref={`/series/${id}`}
    />
  );
}
