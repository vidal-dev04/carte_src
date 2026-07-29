"use client";

import { Country, getStatus } from "@/data/countries";

type CountryCardProps = {
  country: Country;
  selected: boolean;
  onClick: () => void;
  /** Version réduite pour la bande horizontale sur mobile */
  compact?: boolean;
};

export default function CountryCard({
  country,
  selected,
  onClick,
  compact = false,
}: CountryCardProps) {
  const status = getStatus(country.people);

  if (compact) {
    return (
      <button
        onClick={onClick}
        className={`w-40 shrink-0 snap-start rounded-xl border p-2.5 text-left backdrop-blur-md transition-colors ${
          selected
            ? "border-[#29ABE2] bg-[#29ABE2]/25"
            : "border-white/15 bg-[#040a18]/80"
        }`}
      >
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: status.color, boxShadow: `0 0 8px ${status.color}` }}
          />
          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-white">
            {country.name}
          </span>
          <span className="shrink-0 text-sm font-bold" style={{ color: status.color }}>
            {country.people}
          </span>
        </div>
        <p className="mt-1 truncate text-[10px] font-medium" style={{ color: status.color }}>
          {status.label}
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
      <div className="flex items-center gap-3">
        <span
          className="h-3.5 w-3.5 shrink-0 rounded-full"
          style={{ backgroundColor: status.color, boxShadow: `0 0 10px ${status.color}` }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate font-semibold text-white">{country.name}</span>
            <span className="shrink-0 text-lg font-bold" style={{ color: status.color }}>
              {country.people}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            {country.subtitle && (
              <span className="truncate text-xs text-sky-200/60">{country.subtitle}</span>
            )}
            <span className="shrink-0 text-[11px] text-white/50">personnes</span>
          </div>
        </div>
      </div>
      <p className="mt-2 text-xs font-medium" style={{ color: status.color }}>
        {status.label}
      </p>
    </button>
  );
}
