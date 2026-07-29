"use client";

import { STATUSES } from "@/data/countries";

export default function Legend() {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#050f23]/85 p-4 backdrop-blur-md">
      <h3 className="mb-3 text-xs font-bold tracking-widest text-sky-200/80 uppercase">
        Légende
      </h3>
      <ul className="space-y-2">
        {STATUSES.map(({ min, status }, i) => {
          const prev = STATUSES[i - 1];
          const range = prev
            ? min === 0
              ? `moins de ${prev.min}`
              : `${min} à ${prev.min - 1}`
            : `${min} et plus`;
          return (
            <li key={status.key} className="flex items-center gap-2.5 text-xs">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: status.color, boxShadow: `0 0 8px ${status.color}` }}
              />
              <span className="font-semibold text-white">{status.label}</span>
              <span className="ml-auto shrink-0 text-white/45">{range}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
