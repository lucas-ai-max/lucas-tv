import { SUPERFLIX_BASE_URL } from "./constants";

// Direct embed per the official SuperFlixAPI docs (https://superflixapi.online/doc).
// The browser sends Sec-Fetch-Dest: iframe + Sec-Fetch-Site: cross-site automatically
// for a cross-origin iframe, which is what the upstream uses to serve the real
// player (not the landing page). #noLink hides the external-partner button;
// #noEpList hides the episode list on series.
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
