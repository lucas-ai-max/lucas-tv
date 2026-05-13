-- Lucas TV - progresso de exibicao
-- Rode este arquivo em um banco PostgreSQL/Supabase.

create extension if not exists pgcrypto;

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  display_name text,
  password_hash text,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.app_users
add column if not exists display_name text;

alter table public.app_users
add column if not exists password_hash text;

alter table public.app_users
add column if not exists preferences jsonb not null default '{}'::jsonb;

create unique index if not exists app_users_username_lower_idx
on public.app_users (lower(username));

insert into public.app_users (username, display_name, password_hash)
values
  ('lucas', 'lucas', crypt(encode(digest('lucas123', 'sha256'), 'hex'), gen_salt('bf')))
on conflict (username) do update set
  display_name = coalesce(public.app_users.display_name, excluded.display_name),
  password_hash = coalesce(public.app_users.password_hash, excluded.password_hash);

alter table public.app_users
alter column password_hash set not null;

create table if not exists public.watch_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,

  content_type text not null check (content_type in ('movie', 'episode')),
  tmdb_id integer not null,
  season_number integer,
  episode_number integer,

  title text not null,
  poster_path text,
  backdrop_path text,

  progress_seconds integer not null default 0 check (progress_seconds >= 0),
  duration_seconds integer check (duration_seconds is null or duration_seconds > 0),
  completed boolean not null default false,
  completed_at timestamptz,

  first_watched_at timestamptz not null default now(),
  last_watched_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  watched_percent numeric(5,2) generated always as (
    case
      when duration_seconds is null or duration_seconds <= 0 then 0
      else least(100, round((progress_seconds::numeric / duration_seconds::numeric) * 100, 2))
    end
  ) stored,

  constraint watch_progress_episode_fields check (
    (content_type = 'movie' and season_number is null and episode_number is null)
    or
    (
      content_type = 'episode'
      and season_number is not null
      and season_number > 0
      and episode_number is not null
      and episode_number > 0
    )
  )
);

create unique index if not exists watch_progress_unique_item
on public.watch_progress (
  user_id,
  content_type,
  tmdb_id,
  coalesce(season_number, 0),
  coalesce(episode_number, 0)
);

create index if not exists watch_progress_continue_idx
on public.watch_progress (user_id, last_watched_at desc)
where completed = false and progress_seconds > 0;

create index if not exists watch_progress_completed_idx
on public.watch_progress (user_id, last_watched_at desc)
where completed = true;

create or replace function public.set_watch_progress_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  new.last_watched_at = now();

  if new.duration_seconds is not null
    and new.duration_seconds > 0
    and new.progress_seconds >= new.duration_seconds
  then
    new.completed = true;
  end if;

  if new.completed = true and new.completed_at is null then
    new.completed_at = now();
  end if;

  if new.completed = false then
    new.completed_at = null;
  end if;

  return new;
end;
$$;

drop trigger if exists set_watch_progress_updated_at on public.watch_progress;

create trigger set_watch_progress_updated_at
before insert or update on public.watch_progress
for each row
execute function public.set_watch_progress_updated_at();

create or replace view public.continue_watching as
select
  wp.*,
  case
    when content_type = 'movie' then '/watch/movie/' || tmdb_id
    else '/watch/series/' || tmdb_id || '/' || season_number || '/' || episode_number
  end as watch_href,
  case
    when content_type = 'movie' then '/movie/' || tmdb_id
    else '/series/' || tmdb_id
  end as detail_href
from public.watch_progress wp
where completed = false
  and progress_seconds > 0
order by last_watched_at desc;

create or replace view public.watched_items as
select
  wp.*,
  case
    when content_type = 'movie' then '/watch/movie/' || tmdb_id
    else '/watch/series/' || tmdb_id || '/' || season_number || '/' || episode_number
  end as watch_href,
  case
    when content_type = 'movie' then '/movie/' || tmdb_id
    else '/series/' || tmdb_id
  end as detail_href
from public.watch_progress wp
where completed = true
order by coalesce(completed_at, last_watched_at) desc;

-- O historico deve ser acessado por rotas server-side do app usando a secret key.
-- A publishable key do navegador nao deve conseguir ler/escrever progresso de usuarios.
revoke all on table public.app_users from anon, authenticated;
revoke all on table public.watch_progress from anon, authenticated;
revoke all on table public.continue_watching from anon, authenticated;
revoke all on table public.watched_items from anon, authenticated;
revoke all on function public.set_watch_progress_updated_at() from anon, authenticated;

-- Exemplos de uso:
--
-- Salvar/atualizar progresso de um filme:
-- insert into public.watch_progress (
--   user_id, content_type, tmdb_id, title, poster_path, backdrop_path,
--   progress_seconds, duration_seconds
-- )
-- values (
--   (select id from public.app_users where username = 'lucas'),
--   'movie', 550, 'Clube da Luta', null, null, 1200, 8340
-- )
-- on conflict (
--   user_id,
--   content_type,
--   tmdb_id,
--   (coalesce(season_number, 0)),
--   (coalesce(episode_number, 0))
-- )
-- do update set
--   title = excluded.title,
--   poster_path = excluded.poster_path,
--   backdrop_path = excluded.backdrop_path,
--   progress_seconds = excluded.progress_seconds,
--   duration_seconds = excluded.duration_seconds,
--   completed = excluded.completed;
--
-- Buscar continuar assistindo:
-- select *
-- from public.continue_watching
-- where user_id = (select id from public.app_users where username = 'lucas')
-- limit 20;
--
-- Buscar assistidos:
-- select *
-- from public.watched_items
-- where user_id = (select id from public.app_users where username = 'lucas')
-- limit 20;
