import Navbar from "@/components/Navbar";
import ContentCard from "@/components/ContentCard";
import LoadMoreButton from "@/components/LoadMoreButton";
import { searchMulti } from "@/lib/tmdb";
import type { TMDBMultiResult } from "@/types/tmdb";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; pages?: string }>;
}) {
  const { q, pages } = await searchParams;
  const query = q || "";
  const pagesCount = Math.min(25, Math.max(1, Number(pages) || 1));

  // Fetch all pages 1..pagesCount in parallel so each "Carregar mais" click
  // appends to the existing results instead of replacing them.
  const pageResults = query
    ? await Promise.all(
        Array.from({ length: pagesCount }, (_, i) => searchMulti(query, i + 1))
      )
    : null;

  const movies: TMDBMultiResult[] = [];
  const series: TMDBMultiResult[] = [];
  const seen = new Set<number>();
  for (const p of pageResults ?? []) {
    for (const item of p.results) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      if (item.media_type === "movie") movies.push(item);
      else if (item.media_type === "tv") series.push(item);
    }
  }

  const total = movies.length + series.length;
  const hasMore = (pageResults?.[0]?.total_pages ?? 0) > pagesCount;

  function nextPageHref(): string {
    const sp = new URLSearchParams();
    sp.set("q", query);
    sp.set("pages", String(pagesCount + 1));
    return `/search?${sp.toString()}`;
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="pt-20 md:pt-24 px-4 md:px-8 max-w-7xl mx-auto pb-16">
        <h1 className="text-xl md:text-2xl font-bold mb-2">
          {query ? (
            <>
              Resultados para{" "}
              <span className="text-gray-400">&quot;{query}&quot;</span>
            </>
          ) : (
            "Buscar filmes e séries"
          )}
        </h1>
        {query && total > 0 && (
          <p className="text-sm text-gray-400 mb-8">
            {total} {total === 1 ? "resultado" : "resultados"}
            {pagesCount > 1 ? ` · ${pagesCount} páginas carregadas` : ""}
          </p>
        )}

        {!query ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">
              Digite algo na barra de busca para encontrar filmes e séries
            </p>
          </div>
        ) : total === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">
              Nenhum resultado encontrado para &quot;{query}&quot;
            </p>
            <p className="text-gray-500 mt-2">Tente buscar por outro termo</p>
          </div>
        ) : (
          <>
            {movies.length > 0 && (
              <ResultsGroup
                label={`Filmes (${movies.length})`}
                items={movies}
                mediaType="movie"
              />
            )}
            {series.length > 0 && (
              <ResultsGroup
                label={`Séries (${series.length})`}
                items={series}
                mediaType="tv"
              />
            )}

            {hasMore && (
              <div className="mt-10 flex justify-center">
                <LoadMoreButton href={nextPageHref()} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ResultsGroup({
  label,
  items,
  mediaType,
}: {
  label: string;
  items: TMDBMultiResult[];
  mediaType: "movie" | "tv";
}) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-semibold mb-3 text-gray-200">{label}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
        {items.map((item) => (
          <ContentCard
            key={item.id}
            id={item.id}
            title={"title" in item ? item.title : item.name}
            posterPath={item.poster_path}
            voteAverage={item.vote_average}
            year={(
              "release_date" in item
                ? item.release_date
                : item.first_air_date
            )?.slice(0, 4) || ""}
            mediaType={mediaType}
          />
        ))}
      </div>
    </section>
  );
}
