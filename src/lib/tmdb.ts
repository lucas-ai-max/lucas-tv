import { TMDB_BASE_URL } from "./constants";
import type {
  TMDBMovie,
  TMDBSeries,
  TMDBMovieDetails,
  TMDBSeriesDetails,
  TMDBSeasonDetails,
  TMDBCredits,
  TMDBPageResponse,
  TMDBMultiResult,
} from "@/types/tmdb";

async function tmdbFetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
  url.searchParams.set("api_key", process.env.TMDB_API_KEY || "");
  url.searchParams.set("language", "pt-BR");

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url.toString(), {
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`TMDB API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

// Home page
export async function getTrending(timeWindow: "day" | "week" = "week") {
  return tmdbFetch<TMDBPageResponse<TMDBMultiResult>>(`/trending/all/${timeWindow}`);
}

export async function getPopularMovies(page = 1) {
  return tmdbFetch<TMDBPageResponse<TMDBMovie>>("/movie/popular", { page: String(page) });
}

export async function getPopularSeries(page = 1) {
  return tmdbFetch<TMDBPageResponse<TMDBSeries>>("/tv/popular", { page: String(page) });
}

export async function getTopRatedMovies(page = 1) {
  return tmdbFetch<TMDBPageResponse<TMDBMovie>>("/movie/top_rated", { page: String(page) });
}

// Detail pages
export async function getMovieDetails(id: number) {
  return tmdbFetch<TMDBMovieDetails>(`/movie/${id}`);
}

export async function getSeriesDetails(id: number) {
  return tmdbFetch<TMDBSeriesDetails>(`/tv/${id}`);
}

export async function getSeasonDetails(seriesId: number, seasonNumber: number) {
  return tmdbFetch<TMDBSeasonDetails>(`/tv/${seriesId}/season/${seasonNumber}`);
}

export async function getMovieCredits(id: number) {
  return tmdbFetch<TMDBCredits>(`/movie/${id}/credits`);
}

export async function getSeriesCredits(id: number) {
  return tmdbFetch<TMDBCredits>(`/tv/${id}/credits`);
}

// Search
export async function searchMulti(query: string, page = 1) {
  return tmdbFetch<TMDBPageResponse<TMDBMultiResult>>("/search/multi", {
    query,
    page: String(page),
  });
}
