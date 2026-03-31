import Navbar from "@/components/Navbar";
import ContentCard from "@/components/ContentCard";
import { searchMulti } from "@/lib/tmdb";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q || "";

  const results = query ? await searchMulti(query) : null;
  const filteredResults = results?.results.filter(
    (item) => item.media_type !== "person"
  );

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="pt-24 px-4 md:px-8 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">
          {query ? (
            <>
              Resultados para <span className="text-gray-400">&quot;{query}&quot;</span>
            </>
          ) : (
            "Buscar filmes e séries"
          )}
        </h1>

        {filteredResults && filteredResults.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredResults.map((item) => (
              <ContentCard
                key={`${item.media_type}-${item.id}`}
                id={item.id}
                title={"title" in item ? item.title : item.name}
                posterPath={item.poster_path}
                voteAverage={item.vote_average}
                year={(
                  "release_date" in item
                    ? item.release_date
                    : item.first_air_date
                )?.slice(0, 4) || ""}
                mediaType={item.media_type === "movie" ? "movie" : "tv"}
              />
            ))}
          </div>
        ) : query ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">
              Nenhum resultado encontrado para &quot;{query}&quot;
            </p>
            <p className="text-gray-500 mt-2">
              Tente buscar por outro termo
            </p>
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">
              Digite algo na barra de busca para encontrar filmes e séries
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
