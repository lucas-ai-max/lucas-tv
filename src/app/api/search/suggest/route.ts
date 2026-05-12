import { NextRequest } from "next/server";
import { searchMulti } from "@/lib/tmdb";

export const dynamic = "force-dynamic";

export interface SuggestItem {
  id: number;
  title: string;
  posterPath: string | null;
  year: string;
  mediaType: "movie" | "tv";
  voteAverage: number;
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return Response.json({ items: [] satisfies SuggestItem[] });
  }

  try {
    const data = await searchMulti(q);
    const items: SuggestItem[] = data.results
      .filter((r) => r.media_type === "movie" || r.media_type === "tv")
      .slice(0, 6)
      .map((r) => ({
        id: r.id,
        title: "title" in r ? r.title : r.name,
        posterPath: r.poster_path,
        year: (("release_date" in r ? r.release_date : r.first_air_date) ?? "").slice(0, 4),
        mediaType: r.media_type === "movie" ? "movie" : "tv",
        voteAverage: r.vote_average,
      }));

    return Response.json(
      { items },
      { headers: { "Cache-Control": "public, max-age=60" } }
    );
  } catch {
    return Response.json({ items: [] satisfies SuggestItem[] }, { status: 200 });
  }
}
