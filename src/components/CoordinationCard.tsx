"use client";

import { CoordinationWithTotal, MAX_PEOPLE, colorOf, shareOf } from "@/data/network";

type CoordinationCardProps = {
  coordination: CoordinationWithTotal;
  selected: boolean;
  onClick: () => void;
  /** Version réduite pour la bande horizontale sur mobile */
  compact?: boolean;
};

export default function CoordinationCard({
  coordination,
  selected,
  onClick,
  compact = false,
}: CoordinationCardProps) {
  const color = colorOf(coordination.people);
  const share = shareOf(coordination.people);
  const bar = Math.max(3, (coordination.people / MAX_PEOPLE) * 100);

  if (compact) {
    return (
      <button
        onClick={onClick}
        className={`w-40 shrink-0 snap-start rounded-xl border p-2.5 text-left backdrop-blur-md transition-colors ${
          selected ? "border-[#29ABE2] bg-[#29ABE2]/25" : "border-white/15 bg-[#040a18]/80"
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-white">
            {coordination.name}
          </span>
          <span className="shrink-0 text-sm font-bold" style={{ color }}>
            {coordination.people}
          </span>
        </div>
        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full"
            style={{ width: `${bar}%`, backgroundColor: color }}
          />
        </div>
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
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate font-semibold text-white">{coordination.name}</span>
        <span className="shrink-0 text-lg font-bold" style={{ color }}>
          {coordination.people}
        </span>
      </div>

      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${bar}%`, backgroundColor: color }}
        />
      </div>

      <div className="mt-1.5 flex items-baseline justify-between gap-2 text-[11px]">
        <span className="truncate text-sky-200/55">
          {coordination.subtitle ?? "Effectif global"}
        </span>
        <span className="shrink-0 text-white/45">
          {(share * 100).toFixed(1).replace(".", ",")} %
        </span>
      </div>
    </button>
  );
}
