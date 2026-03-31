export const TMDB_BASE_URL = "https://api.themoviedb.org/3";
export const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";
export const SUPERFLIX_BASE_URL = "https://superflixapi.rest";

export function tmdbImage(path: string | null, size: string = "w500"): string {
  if (!path) return "/no-image.svg";
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export function tmdbBackdrop(path: string | null): string {
  return tmdbImage(path, "original");
}
