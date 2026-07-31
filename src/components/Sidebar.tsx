"use client";

import Image from "next/image";
import {
  COORDINATIONS,
  CoordinationWithTotal,
  Intendance,
  LISTED_PEOPLE,
  MAX_PEOPLE,
  TOTAL_MEMBERS,
  UNASSIGNED,
  colorOf,
  shareOf,
} from "@/data/network";
import CoordinationCard from "./CoordinationCard";
import Legend from "./Legend";

type SidebarProps = {
  selected: CoordinationWithTotal | null;
  selectedIntendance: Intendance | null;
  onSelect: (coordination: CoordinationWithTotal | null) => void;
  onSelectIntendance: (intendance: Intendance | null) => void;
};

export default function Sidebar({
  selected,
  selectedIntendance,
  onSelect,
  onSelectIntendance,
}: SidebarProps) {
  const sorted = [...COORDINATIONS].sort((a, b) => b.people - a.people);

  return (
    <aside className="hidden h-full shrink-0 flex-col gap-4 overflow-y-auto border-r border-white/10 bg-[#040a18]/95 p-4 md:flex md:w-76 lg:w-90">
      {/* En-tête avec le logo */}
      <header className="flex items-center gap-3">
        <Image
          src="/logo-sr.png"
          alt="Logo Sacerdoce Royal"
          width={64}
          height={78}
          className="rounded-xl shadow-[0_0_20px_rgba(41,171,226,0.4)]"
          priority
        />
        <div>
          <h1 className="text-lg leading-tight font-extrabold text-white">
            Sacerdoce Royal
          </h1>
          <p className="text-xs font-medium text-[#f5d84a] italic">
            Esprit Saint glorifiant Jésus — Que ton règne vienne !
          </p>
          <p className="mt-1 text-[11px] text-sky-200/60">Répartition des membres</p>
        </div>
      </header>

      {/* Effectif total */}
      <div className="rounded-2xl border border-[#29ABE2]/30 bg-gradient-to-r from-[#29ABE2]/20 to-[#29ABE2]/5 px-4 py-3">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-sky-100/80">Total des membres</span>
          <span className="text-2xl font-extrabold text-[#4db8ff]">{TOTAL_MEMBERS}</span>
        </div>
        {UNASSIGNED > 0 && (
          <p className="mt-1.5 border-t border-white/10 pt-1.5 text-[11px] text-white/50">
            {LISTED_PEOPLE} répartis · {UNASSIGNED} en attente de rattachement
          </p>
        )}
      </div>

      {/* Détail de la coordination ouverte */}
      {selected && (
        <div className="rounded-2xl border border-[#29ABE2]/40 bg-[#29ABE2]/10 p-3 text-sm">
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-bold text-white">{selected.name}</p>
            <p className="shrink-0 font-bold text-[#4db8ff]">
              {selected.people}{" "}
              <span className="text-[11px] font-normal text-white/50">membres</span>
            </p>
          </div>

          {selected.intendances.length > 0 ? (
            <>
              <p className="mt-0.5 text-[11px] text-white/55">
                {selected.intendances.length} intendances — cliquez pour zoomer
              </p>
              <ul className="mt-2 space-y-0.5 border-t border-white/10 pt-2">
                {[...selected.intendances]
                  .sort((a, b) => b.people - a.people)
                  .map((intendance) => {
                    const isActive = selectedIntendance?.name === intendance.name;
                    const color = colorOf(intendance.people);
                    return (
                      <li key={intendance.name}>
                        <button
                          onClick={() => onSelectIntendance(isActive ? null : intendance)}
                          className={`w-full rounded-lg px-1.5 py-1 transition-colors ${
                            isActive ? "bg-white/15" : "hover:bg-white/10"
                          }`}
                        >
                          <div className="flex items-baseline gap-2 text-xs">
                            <span className="min-w-0 flex-1 truncate text-left text-white/90">
                              {intendance.name}
                              {isActive && <span className="ml-1 text-white/50">🔍</span>}
                            </span>
                            <span className="shrink-0 font-bold" style={{ color }}>
                              {intendance.people}
                            </span>
                          </div>
                          <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.max(3, (intendance.people / MAX_PEOPLE) * 100)}%`,
                                backgroundColor: color,
                              }}
                            />
                          </div>
                        </button>
                      </li>
                    );
                  })}
              </ul>
            </>
          ) : (
            <p className="mt-1 text-[11px] text-white/55">
              {selected.subtitle ?? "Pas encore de découpage par intendance."}
            </p>
          )}

          <button
            onClick={() => onSelect(null)}
            className="mt-2 rounded-lg border border-white/20 px-3 py-1 text-xs text-white/80 transition-colors hover:bg-white/10"
          >
            ← Vue globale
          </button>
        </div>
      )}

      {/* Liste des coordinations */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xs font-bold tracking-widest text-sky-200/80 uppercase">
            Coordinations
          </h2>
          <span className="text-[10px] text-white/40">
            {Math.round(shareOf(LISTED_PEOPLE) * 100)} % de l&apos;effectif
          </span>
        </div>
        {sorted.map((coordination) => (
          <CoordinationCard
            key={coordination.id}
            coordination={coordination}
            selected={selected?.id === coordination.id}
            onClick={() =>
              onSelect(selected?.id === coordination.id ? null : coordination)
            }
          />
        ))}
      </div>

      <div className="mt-auto">
        <Legend />
      </div>
    </aside>
  );
}
