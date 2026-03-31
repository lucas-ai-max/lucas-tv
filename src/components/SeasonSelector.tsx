"use client";

import type { TMDBSeason } from "@/types/tmdb";

interface SeasonSelectorProps {
  seasons: TMDBSeason[];
  currentSeason: number;
  onSelect: (seasonNumber: number) => void;
}

export default function SeasonSelector({
  seasons,
  currentSeason,
  onSelect,
}: SeasonSelectorProps) {
  const filteredSeasons = seasons.filter((s) => s.season_number > 0);

  return (
    <select
      value={currentSeason}
      onChange={(e) => onSelect(Number(e.target.value))}
      className="bg-[#1f1f1f] text-white border border-gray-600 rounded px-4 py-2 text-sm focus:outline-none focus:border-white cursor-pointer"
    >
      {filteredSeasons.map((season) => (
        <option key={season.id} value={season.season_number}>
          {season.name} ({season.episode_count} ep.)
        </option>
      ))}
    </select>
  );
}
