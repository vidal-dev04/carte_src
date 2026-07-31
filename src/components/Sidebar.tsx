"use client";

import Image from "next/image";
import {
  LISTED_PEOPLE,
  Place,
  TOTAL_MEMBERS,
  UNASSIGNED,
  WORLD,
  colorOf,
  labelOf,
  unitsLabel,
} from "@/data/network";
import PlaceCard from "./PlaceCard";
import Legend from "./Legend";

type SidebarProps = {
  /** Chemin depuis le monde jusqu'au niveau affiché */
  path: Place[];
  current: Place;
  children_: Place[];
  focus: Place | null;
  onOpen: (place: Place) => void;
  onFocus: (place: Place | null) => void;
  onGoTo: (depth: number) => void;
};

export default function Sidebar({
  path,
  current,
  children_,
  focus,
  onOpen,
  onFocus,
  onGoTo,
}: SidebarProps) {
  const sorted = [...children_].sort((a, b) => b.people - a.people);
  const scale = sorted[0]?.people ?? 1;
  const isWorld = current.id === WORLD.id;

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

      {/* Fil d'Ariane */}
      {!isWorld && (
        <nav className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs">
          <button
            onClick={() => onGoTo(0)}
            className="text-sky-200/70 transition-colors hover:text-white"
          >
            🌍 Monde
          </button>
          {path.map((place, i) => (
            <span key={place.id} className="flex items-center gap-1.5">
              <span className="text-white/30">›</span>
              {i === path.length - 1 ? (
                <span className="font-semibold text-white">{place.name}</span>
              ) : (
                <button
                  onClick={() => onGoTo(i + 1)}
                  className="text-sky-200/70 transition-colors hover:text-white"
                >
                  {place.name}
                </button>
              )}
            </span>
          ))}
        </nav>
      )}

      {/* Détail du niveau courant */}
      {!isWorld && (
        <div
          className="rounded-2xl border p-3 text-sm"
          style={{
            borderColor: `${colorOf(current.evaluation)}66`,
            backgroundColor: `${colorOf(current.evaluation)}1a`,
          }}
        >
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-bold text-white">{current.name}</p>
            <p className="shrink-0 font-bold text-[#4db8ff]">
              {current.people}{" "}
              <span className="text-[11px] font-normal text-white/50">membres</span>
            </p>
          </div>
          <p
            className="mt-0.5 text-xs font-semibold"
            style={{ color: colorOf(current.evaluation) }}
          >
            {labelOf(current.evaluation) ?? "Pas encore évaluée"}
          </p>
          <button
            onClick={() => onGoTo(path.length - 1)}
            className="mt-2 rounded-lg border border-white/20 px-3 py-1 text-xs text-white/80 transition-colors hover:bg-white/10"
          >
            ← {path.length > 1 ? path[path.length - 2].name : "Vue globale"}
          </button>
        </div>
      )}

      {/* Sous-unités du niveau courant */}
      {sorted.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-xs font-bold tracking-widest text-sky-200/80 uppercase">
              {current.unitLabel?.many ?? "sous-unités"}
            </h2>
            <span className="shrink-0 text-[10px] text-white/40">
              {unitsLabel(current, sorted.length)}
            </span>
          </div>
          {sorted.map((place) => (
            <PlaceCard
              key={place.id}
              place={place}
              scale={scale}
              selected={focus?.id === place.id}
              onClick={() =>
                place.children?.length
                  ? onOpen(place)
                  : onFocus(focus?.id === place.id ? null : place)
              }
            />
          ))}
        </div>
      )}

      <div className="mt-auto">
        <Legend />
      </div>
    </aside>
  );
}
