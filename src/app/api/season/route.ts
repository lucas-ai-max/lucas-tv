import { NextRequest } from "next/server";
import { getSeasonDetails } from "@/lib/tmdb";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const seriesId = Number(searchParams.get("seriesId"));
  const season = Number(searchParams.get("season"));

  if (!seriesId || !season) {
    return Response.json({ error: "Missing params" }, { status: 400 });
  }

  const data = await getSeasonDetails(seriesId, season);
  return Response.json(data);
}
