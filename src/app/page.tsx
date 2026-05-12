export const dynamic = "force-dynamic";

import Navbar from "@/components/Navbar";
import HeroBanner from "@/components/HeroBanner";
import ContentCarousel from "@/components/ContentCarousel";
import ContentCard from "@/components/ContentCard";
import {
  getTrending,
  getPopularMovies,
  getPopularSeries,
  getTopRatedMovies,
  getPopularAnimes,
} from "@/lib/tmdb";

export default async function Home() {
  const [
    trending,
    popularMovies,
    popularSeries,
    topRated,
    animePage1,
    animePage2,
    animePage3,
  ] = await Promise.all([
    getTrending("week"),
    getPopularMovies(),
    getPopularSeries(),
    getTopRatedMovies(),
    getPopularAnimes(1),
    getPopularAnimes(2),
    getPopularAnimes(3),
  ]);

  // Concatena 3 páginas de animes (~60 items) e remove duplicados por id.
  const animeSeen = new Set<number>();
  const popularAnimes = [...animePage1.results, ...animePage2.results, ...animePage3.results]
    .filter((a) => {
      if (animeSeen.has(a.id)) return false;
      animeSeen.add(a.id);
      return true;
    });

  const heroItem = trending.results.find(
    (item) => item.media_type !== "person" && item.backdrop_path
  );

  return (
    <div className="min-h-screen">
      <Navbar />

      {heroItem && <HeroBanner item={heroItem} />}

      <div className="-mt-16 relative z-10">
        <ContentCarousel title="Em Alta">
          {trending.results
            .filter((item) => item.media_type !== "person")
            .map((item) => (
              <ContentCard
                key={item.id}
                id={item.id}
                title={"title" in item ? item.title : item.name}
                posterPath={item.poster_path}
                voteAverage={item.vote_average}
                year={("release_date" in item ? item.release_date : item.first_air_date)?.slice(0, 4) || ""}
                mediaType={item.media_type === "movie" ? "movie" : "tv"}
              />
            ))}
        </ContentCarousel>

        <ContentCarousel title="Filmes Populares">
          {popularMovies.results.map((movie) => (
            <ContentCard
              key={movie.id}
              id={movie.id}
              title={movie.title}
              posterPath={movie.poster_path}
              voteAverage={movie.vote_average}
              year={movie.release_date?.slice(0, 4) || ""}
              mediaType="movie"
            />
          ))}
        </ContentCarousel>

        <ContentCarousel title="Séries Populares">
          {popularSeries.results.map((series) => (
            <ContentCard
              key={series.id}
              id={series.id}
              title={series.name}
              posterPath={series.poster_path}
              voteAverage={series.vote_average}
              year={series.first_air_date?.slice(0, 4) || ""}
              mediaType="tv"
            />
          ))}
        </ContentCarousel>

        <ContentCarousel title="Animes Populares">
          {popularAnimes.map((anime) => (
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
        </ContentCarousel>

        <ContentCarousel title="Mais Bem Avaliados">
          {topRated.results.map((movie) => (
            <ContentCard
              key={movie.id}
              id={movie.id}
              title={movie.title}
              posterPath={movie.poster_path}
              voteAverage={movie.vote_average}
              year={movie.release_date?.slice(0, 4) || ""}
              mediaType="movie"
            />
          ))}
        </ContentCarousel>
      </div>
    </div>
  );
}
