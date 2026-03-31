import PlayerEmbed from "@/components/PlayerEmbed";
import { getMovieDetails } from "@/lib/tmdb";
import { getMoviePlayerUrl } from "@/lib/superflix";

export default async function WatchMoviePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const movie = await getMovieDetails(Number(id));

  return (
    <PlayerEmbed
      src={getMoviePlayerUrl(id)}
      title={movie.title}
      backHref={`/movie/${id}`}
    />
  );
}
