// Route through our same-origin proxy so we can sandbox the iframe and inject
// a protective script that intercepts popups, location changes, and clicks.
// The proxy sends Sec-Fetch-Dest: iframe + Sec-Fetch-Site: cross-site so the
// upstream serves the real player (not the landing page).
// #noLink/#noEpList are passed as the URL fragment (after the proxy URL).
export function getMoviePlayerUrl(id: number | string): string {
  return `/api/proxy?url=${encodeURIComponent(`/filme/${id}`)}#noLink`;
}

export function getEpisodePlayerUrl(
  id: number | string,
  season: number,
  episode: number
): string {
  return `/api/proxy?url=${encodeURIComponent(
    `/serie/${id}/${season}/${episode}`
  )}#noLink#noEpList`;
}
