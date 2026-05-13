import "server-only";

import { query } from "@/lib/db";

export interface WatchProgressItem {
  id: string;
  content_type: "movie" | "episode";
  tmdb_id: number;
  season_number: number | null;
  episode_number: number | null;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  progress_seconds: number;
  duration_seconds: number | null;
  watched_percent: string | number;
  completed: boolean;
  last_watched_at: string;
  watch_href: string;
  detail_href: string;
}

interface WatchProgressIdRow {
  id: string;
}

interface RecordWatchInput {
  userId: string;
  contentType: "movie" | "episode";
  tmdbId: number;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
  title: string;
  posterPath?: string | null;
  backdropPath?: string | null;
  durationSeconds?: number | null;
}

export async function recordPlaybackStart(input: RecordWatchInput) {
  const result = await query<WatchProgressIdRow>(
    `
      insert into public.watch_progress (
        user_id,
        content_type,
        tmdb_id,
        season_number,
        episode_number,
        title,
        poster_path,
        backdrop_path,
        progress_seconds,
        duration_seconds,
        completed
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, 1, $9, false)
      on conflict (
        user_id,
        content_type,
        tmdb_id,
        (coalesce(season_number, 0)),
        (coalesce(episode_number, 0))
      )
      do update set
        title = excluded.title,
        poster_path = excluded.poster_path,
        backdrop_path = excluded.backdrop_path,
        progress_seconds = greatest(public.watch_progress.progress_seconds, excluded.progress_seconds),
        duration_seconds = coalesce(excluded.duration_seconds, public.watch_progress.duration_seconds),
        completed = public.watch_progress.completed
      returning id
    `,
    [
      input.userId,
      input.contentType,
      input.tmdbId,
      input.seasonNumber ?? null,
      input.episodeNumber ?? null,
      input.title,
      input.posterPath ?? null,
      input.backdropPath ?? null,
      input.durationSeconds ?? null,
    ]
  );

  return result.rows[0]?.id ?? null;
}

export async function removeFromContinueWatching(userId: string, progressId: string) {
  await query(
    `
      delete from public.watch_progress
      where id = $1
        and user_id = $2
        and completed = false
    `,
    [progressId, userId]
  );
}

export async function getContinueWatching(userId: string, limit = 20) {
  const result = await query<WatchProgressItem>(
    `
      select *
      from public.continue_watching
      where user_id = $1
      limit $2
    `,
    [userId, limit]
  );

  return result.rows;
}

export async function getWatchedItems(userId: string, limit = 20) {
  const result = await query<WatchProgressItem>(
    `
      select *
      from public.watched_items
      where user_id = $1
      limit $2
    `,
    [userId, limit]
  );

  return result.rows;
}
