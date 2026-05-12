import Link from "next/link";
import Navbar from "@/components/Navbar";
import ContentCard from "@/components/ContentCard";
import LoadMoreButton from "@/components/LoadMoreButton";
import {
  getPopularAnimes,
  getTopRatedAnimes,
  getAiringAnimes,
  getRecentAnimes,
} from "@/lib/tmdb";
import type { TMDBSeries, TMDBPageResponse } from "@/types/tmdb";

export const dynamic = "force-dynamic";

type SortKey = "popular" | "top" | "airing" | "recent";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "popular", label: "Populares" },
  { key: "airing", label: "Em exibição" },
  { key: "recent", label: "Recentes" },
  { key: "top", label: "Mais bem avaliados" },
];

const INITIAL_PAGES = 2;
const MAX_PAGES = 25;

function fetcher(sort: SortKey, page: number): Promise<TMDBPageResponse<TMDBSeries>> {
  switch (sort) {
    case "top":
      return getTopRatedAnimes(page);
    case "airing":
      return getAiringAnimes(page);
    case "recent":
      return getRecentAnimes(page);
    default:
      return getPopularAnimes(page);
  }
}

export default async function AnimesPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; pages?: string }>;
}) {
  const { sort, pages } = await searchParams;
  const sortKey: SortKey = SORTS.find((s) => s.key === sort)?.key ?? "popular";
  const pagesCount = Math.min(
    MAX_PAGES,
    Math.max(INITIAL_PAGES, Number(pages) || INITIAL_PAGES)
  );

  // Fetch all pages from 1..pagesCount in parallel and concat.
  const pageResults = await Promise.all(
    Array.from({ length: pagesCount }, (_, i) => fetcher(sortKey, i + 1))
  );

  const seen = new Set<number>();
  const results = pageResults
    .flatMap((p) => p.results)
    .filter((a) => {
      if (seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    });

  const totalPages = pageResults[0]?.total_pages ?? 0;
  const hasMore = totalPages > pagesCount;
  const nextHref = `/animes?sort=${sortKey}&pages=${pagesCount + 2}`;

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="pt-20 md:pt-24 px-4 md:px-8 max-w-7xl mx-auto pb-16">
        <h1 className="text-xl md:text-2xl font-bold mb-4">Animes</h1>

        <div className="flex gap-2 text-sm overflow-x-auto hide-scrollbar pb-2 mb-6 -mx-1 px-1">
          {SORTS.map((s) => (
            <Link
              key={s.key}
              href={`/animes?sort=${s.key}`}
              className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap ${
                sortKey === s.key
                  ? "bg-red-600 text-white"
                  : "bg-zinc-800 text-gray-300 hover:bg-zinc-700"
              }`}
            >
              {s.label}
            </Link>
          ))}
        </div>

        {results.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400">Nenhum anime encontrado nesta categoria</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-500 mb-3">
              Mostrando {results.length} animes
              {totalPages > 0 ? ` de ${totalPages * 20}+` : ""}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
              {results.map((anime) => (
                <ContentCard
                  key={anime.id}
                  id={anime.id}
                  title={anime.name}
                  posterPath={anime.poster_path}
                  voteAverage={anime.vote_average}
                  year={anime.first_air_date?.slice(0, 4) || ""}
                  mediaType="tv"
                />
              ))}
            </div>

            {hasMore && (
              <div className="mt-10 flex justify-center">
                <LoadMoreButton href={nextHref} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
