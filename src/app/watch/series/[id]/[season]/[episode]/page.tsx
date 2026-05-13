import PlayerEmbed from "@/components/PlayerEmbed";
import { getCurrentUser } from "@/lib/auth";
import { getSeasonDetails, getSeriesDetails } from "@/lib/tmdb";
import { getEpisodePlayerUrl } from "@/lib/superflix";
import { recordPlaybackStart } from "@/lib/watch-progress";

export default async function WatchEpisodePage({
  params,
}: {
  params: Promise<{ id: string; season: string; episode: string }>;
}) {
  const { id, season, episode } = await params;
  const seriesId = Number(id);
  const seasonNumber = Number(season);
  const episodeNumber = Number(episode);
  const [series, seasonData, user] = await Promise.all([
    getSeriesDetails(seriesId),
    getSeasonDetails(seriesId, seasonNumber),
    getCurrentUser(),
  ]);
  const episodeData = seasonData.episodes.find(
    (item) => item.episode_number === episodeNumber
  );
  const title = episodeData?.name
    ? `${series.name} - T${season}:E${episode} - ${episodeData.name}`
    : `${series.name} - T${season}:E${episode}`;
  let progressId: string | null = null;

  if (user) {
    progressId = await recordPlaybackStart({
      userId: user.id,
      contentType: "episode",
      tmdbId: series.id,
      seasonNumber,
      episodeNumber,
      title,
      posterPath: episodeData?.still_path || series.poster_path,
      backdropPath: series.backdrop_path,
      durationSeconds: episodeData?.runtime ? episodeData.runtime * 60 : null,
    });
  }

  return (
    <PlayerEmbed
      src={getEpisodePlayerUrl(id, seasonNumber, episodeNumber)}
      title={title}
      backHref={`/series/${id}`}
      progressId={progressId}
    />
  );
}
