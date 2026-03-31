import { SUPERFLIX_BASE_URL } from "./constants";

export function getMoviePlayerUrl(id: number | string): string {
  return `${SUPERFLIX_BASE_URL}/filme/${id}#noLink`;
}

export function getEpisodePlayerUrl(
  id: number | string,
  season: number,
  episode: number
): string {
  return `${SUPERFLIX_BASE_URL}/serie/${id}/${season}/${episode}#noLink#noEpList`;
}
