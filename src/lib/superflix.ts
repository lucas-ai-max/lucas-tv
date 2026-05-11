export function getMoviePlayerUrl(id: number | string): string {
  return `/api/proxy?url=${encodeURIComponent(`/filme/${id}`)}`;
}

export function getEpisodePlayerUrl(
  id: number | string,
  season: number,
  episode: number
): string {
  return `/api/proxy?url=${encodeURIComponent(`/serie/${id}/${season}/${episode}`)}`;
}
