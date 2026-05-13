import PlayerEmbed from "@/components/PlayerEmbed";
import { getCurrentUser } from "@/lib/auth";
import { getMovieDetails } from "@/lib/tmdb";
import { getMoviePlayerUrl } from "@/lib/superflix";
import { recordPlaybackStart } from "@/lib/watch-progress";

export default async function WatchMoviePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const movie = await getMovieDetails(Number(id));
  const user = await getCurrentUser();
  let progressId: string | null = null;

  if (user) {
    progressId = await recordPlaybackStart({
      userId: user.id,
      contentType: "movie",
      tmdbId: movie.id,
      title: movie.title,
      posterPath: movie.poster_path,
      backdropPath: movie.backdrop_path,
      durationSeconds: movie.runtime ? movie.runtime * 60 : null,
    });
  }

  return (
    <PlayerEmbed
      src={getMoviePlayerUrl(id)}
      title={movie.title}
      backHref={`/movie/${id}`}
      progressId={progressId}
    />
  );
}
