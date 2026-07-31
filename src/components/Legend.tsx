"use client";

import { COLOR_CODING, STATUSES } from "@/data/network";

/**
 * Sans code couleur ni repères proportionnels, il n'y a plus rien à
 * décoder : les effectifs sont écrits sur les étiquettes. La légende
 * revient d'elle-même le jour où COLOR_CODING repasse à true.
 */
export default function Legend() {
  if (!COLOR_CODING) return null;

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
            <li key={status.label} className="flex items-center gap-2.5 text-xs">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{
                  backgroundColor: status.color,
                  boxShadow: `0 0 8px ${status.color}`,
                }}
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
