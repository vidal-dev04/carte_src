"use client";

import { EVALUATIONS, Place, colorOf, unitsLabel } from "@/data/network";

type PlaceCardProps = {
  place: Place;
  /** Effectif servant d'échelle à la barre (le plus grand du niveau) */
  scale: number;
  selected: boolean;
  onClick: () => void;
  /** Version réduite pour la bande horizontale sur mobile */
  compact?: boolean;
};

export default function PlaceCard({
  place,
  scale,
  selected,
  onClick,
  compact = false,
}: PlaceCardProps) {
  const color = colorOf(place.evaluation);
  const evaluation = place.evaluation ? EVALUATIONS[place.evaluation].short : null;
  const units = place.children?.length
    ? unitsLabel(place, place.children.length)
    : null;
  const bar = Math.max(3, (place.people / Math.max(1, scale)) * 100);

  if (compact) {
    return (
      <button
        onClick={onClick}
        className={`w-40 shrink-0 snap-start rounded-xl border p-2.5 text-left backdrop-blur-md transition-colors ${
          selected ? "border-[#29ABE2] bg-[#29ABE2]/25" : "border-white/15 bg-[#040a18]/80"
        }`}
      >
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
          />
          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-white">
            {place.name}
          </span>
          <span className="shrink-0 text-sm font-bold" style={{ color }}>
            {place.people}
          </span>
        </div>
        <p className="mt-1 truncate text-[10px] font-medium" style={{ color }}>
          {evaluation ?? "Pas encore évaluée"}
        </p>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`w-full rounded-2xl border p-3 text-left transition-all duration-200 hover:translate-x-1 ${
        selected
          ? "border-[#29ABE2] bg-[#29ABE2]/15 shadow-[0_0_18px_rgba(41,171,226,0.25)]"
          : "border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10"
      }`}
    >
      <div className="flex items-baseline gap-2">
        <span
          className="h-3 w-3 shrink-0 translate-y-0.5 rounded-full"
          style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
        />
        <span className="min-w-0 flex-1 truncate font-semibold text-white">
          {place.name}
        </span>
        {units && <span className="shrink-0 text-[10px] text-white/40">›</span>}
        <span className="shrink-0 text-lg font-bold" style={{ color }}>
          {place.people}
        </span>
      </div>

      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${bar}%`, backgroundColor: color }}
        />
      </div>

      <div className="mt-1.5 flex items-baseline justify-between gap-2 text-[11px]">
        <span className="truncate font-medium" style={{ color }}>
          {evaluation ?? "Pas encore évaluée"}
        </span>
        {units && <span className="shrink-0 text-white/45">{units}</span>}
      </div>
    </button>
  );
}
