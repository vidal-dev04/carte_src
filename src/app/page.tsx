"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useCallback, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Legend from "@/components/Legend";
import PlaceCard from "@/components/PlaceCard";
import Overview from "@/components/Overview";
import {
  AUTO_EXPAND_ALTITUDE,
  Place,
  TOTAL_MEMBERS,
  UNASSIGNED,
  WORLD,
  childrenOf,
  colorOf,
  labelOf,
} from "@/data/network";
import { DEFAULT_STYLE, MAP_STYLES, MapStyle } from "@/data/mapStyles";

// Le globe utilise WebGL : chargement côté client uniquement
const GlobeView = dynamic(() => import("@/components/GlobeView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sky-200/70">
      <span className="animate-pulse">Chargement du globe…</span>
    </div>
  ),
});

export default function Home() {
  /** Chemin de navigation : [] = monde, [Afrique], [Afrique, Côte d'Ivoire]… */
  const [path, setPath] = useState<Place[]>([]);
  const [focus, setFocus] = useState<Place | null>(null);
  const [showLegend, setShowLegend] = useState(false);
  const [showOverview, setShowOverview] = useState(false);
  const [mapStyle, setMapStyle] = useState<MapStyle>(DEFAULT_STYLE);
  const [showStyles, setShowStyles] = useState(false);

  const current = path[path.length - 1] ?? WORLD;
  const listed = useMemo(
    () => childrenOf(current, { expanded: current.altitude <= AUTO_EXPAND_ALTITUDE }),
    [current]
  );
  const sorted = useMemo(
    () => [...listed].sort((a, b) => b.people - a.people),
    [listed]
  );
  const scale = sorted[0]?.people ?? 1;

  /** Descendre d'un niveau. Identité stable : sinon le globe reconstruit
   *  tous ses marqueurs à chaque rendu. */
  const openPlace = useCallback((place: Place) => {
    setPath((p) => [...p, place]);
    setFocus(null);
  }, []);

  /** Remonter au niveau `depth` (0 = monde) */
  const goTo = useCallback((depth: number) => {
    setPath((p) => p.slice(0, depth));
    setFocus(null);
  }, []);

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-[#02060f] md:flex-row">
      {/* En-tête compact — mobile uniquement */}
      <header className="flex shrink-0 items-center gap-3 border-b border-white/10 bg-[#040a18]/95 px-4 py-2.5 md:hidden">
        <Image
          src="/logo-sr.png"
          alt="Logo Sacerdoce Royal"
          width={40}
          height={49}
          className="rounded-lg shadow-[0_0_12px_rgba(41,171,226,0.4)]"
          priority
        />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-extrabold text-white">Sacerdoce Royal</h1>
          <p className="truncate text-[10px] font-medium text-[#f5d84a] italic">
            Esprit Saint glorifiant Jésus — Que ton règne vienne !
          </p>
        </div>
        <div className="shrink-0 rounded-xl border border-[#29ABE2]/30 bg-[#29ABE2]/15 px-3 py-1 text-center">
          <div className="text-base leading-tight font-extrabold text-[#4db8ff]">
            {TOTAL_MEMBERS}
          </div>
          <div className="text-[9px] text-sky-100/70">membres</div>
        </div>
      </header>

      {/* Sidebar — tablette et desktop */}
      <Sidebar
        path={path}
        current={current}
        children_={listed}
        focus={focus}
        onOpen={openPlace}
        onFocus={setFocus}
        onGoTo={goTo}
      />

      <section className="relative min-h-0 flex-1">
        <GlobeView
          current={current}
          focus={focus}
          mapStyle={mapStyle}
          onOpen={openPlace}
          onFocus={setFocus}
        />

        {/* Boutons fond de carte + aperçu + légende */}
        <div className="absolute top-3 right-3 z-20 flex gap-2">
          <button
            onClick={() => setShowStyles((v) => !v)}
            title="Changer le fond de carte"
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold backdrop-blur-md transition-colors ${
              showStyles
                ? "border-[#29ABE2] bg-[#29ABE2]/25 text-white"
                : "border-white/20 bg-[#040a18]/80 text-white/85 hover:bg-white/10"
            }`}
          >
            {mapStyle.icon} <span className="hidden sm:inline">{mapStyle.label}</span>
          </button>
          <button
            onClick={() => setShowOverview(true)}
            className="rounded-full border border-[#f5d84a]/60 bg-[#040a18]/80 px-3 py-1.5 text-xs font-semibold text-[#f5d84a] backdrop-blur-md transition-colors hover:bg-[#f5d84a]/15"
          >
            🗺️ <span className="hidden sm:inline">Voir l&apos;</span>aperçu
          </button>
          <button
            onClick={() => setShowLegend((v) => !v)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold backdrop-blur-md transition-colors md:hidden ${
              showLegend
                ? "border-[#29ABE2] bg-[#29ABE2]/25 text-white"
                : "border-white/20 bg-[#040a18]/80 text-white/85"
            }`}
          >
            Légende
          </button>
        </div>

        {/* Choix du fond de carte */}
        {showStyles && (
          <div className="absolute top-14 right-3 z-20 w-60 overflow-hidden rounded-2xl border border-white/15 bg-[#040a18]/95 backdrop-blur-md">
            <p className="border-b border-white/10 px-3 py-2 text-[10px] font-bold tracking-widest text-sky-200/70 uppercase">
              Fond de carte
            </p>
            {MAP_STYLES.map((style) => (
              <button
                key={style.id}
                onClick={() => {
                  setMapStyle(style);
                  setShowStyles(false);
                }}
                className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${
                  mapStyle.id === style.id ? "bg-[#29ABE2]/20" : "hover:bg-white/10"
                }`}
              >
                <span className="text-lg">{style.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-white">
                    {style.label}
                  </span>
                  <span className="block text-[10px] text-white/55">{style.hint}</span>
                </span>
                {mapStyle.id === style.id && (
                  <span className="text-xs text-[#4db8ff]">✓</span>
                )}
              </button>
            ))}
          </div>
        )}

        {showLegend && (
          <div className="absolute top-14 right-3 z-10 w-64 md:hidden">
            <Legend />
          </div>
        )}

        {/* Fil d'Ariane + niveau courant — mobile */}
        {path.length > 0 && (
          <div
            className="absolute top-14 right-3 left-3 z-10 rounded-2xl border bg-[#040a18]/90 p-3 text-xs backdrop-blur-md md:hidden"
            style={{ borderColor: `${colorOf(current.evaluation)}88` }}
          >
            <div className="mb-1 flex flex-wrap items-center gap-x-1.5 text-[10px]">
              <button onClick={() => goTo(0)} className="text-sky-200/70">
                🌍 Monde
              </button>
              {path.map((place, i) => (
                <span key={place.id} className="flex items-center gap-1.5">
                  <span className="text-white/30">›</span>
                  {i === path.length - 1 ? (
                    <span className="font-semibold text-white">{place.name}</span>
                  ) : (
                    <button onClick={() => goTo(i + 1)} className="text-sky-200/70">
                      {place.name}
                    </button>
                  )}
                </span>
              ))}
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-bold text-white">{current.name}</p>
              <p className="shrink-0 font-bold text-[#4db8ff]">
                {current.people} <span className="text-[10px] text-white/50">membres</span>
              </p>
            </div>
            <p
              className="mt-0.5 font-semibold"
              style={{ color: colorOf(current.evaluation) }}
            >
              {labelOf(current.evaluation) ?? "Pas encore évaluée"}
            </p>
            <button
              onClick={() => goTo(path.length - 1)}
              className="mt-1.5 rounded-lg border border-white/20 px-2.5 py-1 text-[11px] text-white/80"
            >
              ← {path.length > 1 ? path[path.length - 2].name : "Vue globale"}
            </button>
          </div>
        )}

        {/* Bande des sous-unités — mobile */}
        {sorted.length > 0 && (
          <div className="absolute inset-x-0 bottom-0 z-10 flex snap-x gap-2 overflow-x-auto p-3 md:hidden">
            {sorted.map((place) => (
              <PlaceCard
                key={place.id}
                place={place}
                scale={scale}
                compact
                selected={focus?.id === place.id}
                onClick={() =>
                  place.children?.length
                    ? openPlace(place)
                    : setFocus(focus?.id === place.id ? null : place)
                }
              />
            ))}
          </div>
        )}

        {/* Textes lisibles aussi bien sur fond sombre que sur fond clair */}
        <p
          className={`pointer-events-none absolute bottom-3 left-1/2 hidden -translate-x-1/2 rounded-full px-3 py-1 text-xs md:block ${
            mapStyle.light ? "bg-white/70 text-slate-700" : "text-white/40"
          }`}
        >
          {UNASSIGNED > 0
            ? `${UNASSIGNED} membres restent à rattacher à une coordination`
            : "Cliquez sur un repère pour descendre d'un niveau"}
        </p>

        <p
          className={`pointer-events-none absolute right-2 bottom-0.5 z-10 rounded px-1 text-[9px] ${
            mapStyle.light ? "bg-white/70 text-slate-600" : "text-white/35"
          }`}
        >
          {mapStyle.attribution}
        </p>
      </section>

      {showOverview && (
        <Overview initialPlaceId={current.id} onClose={() => setShowOverview(false)} />
      )}
    </main>
  );
}
