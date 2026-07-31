"use client";

import { EVALUATIONS, EVALUATION_ORDER, HAS_UNRATED, NOT_RATED } from "@/data/network";

export default function Legend() {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#050f23]/85 p-4 backdrop-blur-md">
      <h3 className="mb-1 text-xs font-bold tracking-widest text-sky-200/80 uppercase">
        Évaluation
      </h3>
      <p className="mb-3 text-[10px] text-white/45">
        Attribuée par la coordination, indépendamment de l&apos;effectif.
      </p>

      <ul className="space-y-2">
        {EVALUATION_ORDER.map((key) => (
          <li key={key} className="flex items-start gap-2.5 text-xs">
            <span
              className="mt-0.5 h-3 w-3 shrink-0 rounded-full"
              style={{
                backgroundColor: EVALUATIONS[key].color,
                boxShadow: `0 0 8px ${EVALUATIONS[key].color}`,
              }}
            />
            <span className="font-semibold text-white">{EVALUATIONS[key].label}</span>
          </li>
        ))}
        {HAS_UNRATED && (
          <li className="flex items-start gap-2.5 text-xs">
            <span
              className="mt-0.5 h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: NOT_RATED }}
            />
            <span className="text-white/60">Pas encore évaluée</span>
          </li>
        )}
      </ul>
    </div>
  );
}
