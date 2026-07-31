"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useCallback, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Legend from "@/components/Legend";
import CoordinationCard from "@/components/CoordinationCard";
import Overview from "@/components/Overview";
import {
  COLOR_CODING,
  COORDINATIONS,
  CoordinationWithTotal,
  Intendance,
  TOTAL_MEMBERS,
  UNASSIGNED,
  colorOf,
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
  const [selected, setSelected] = useState<CoordinationWithTotal | null>(null);
  const [selectedIntendance, setSelectedIntendance] = useState<Intendance | null>(null);
  const [showLegend, setShowLegend] = useState(false);
  const [showOverview, setShowOverview] = useState(false);
  const [mapStyle, setMapStyle] = useState<MapStyle>(DEFAULT_STYLE);
  const [showStyles, setShowStyles] = useState(false);
  const sorted = [...COORDINATIONS].sort((a, b) => b.people - a.people);

  // Changer de coordination (ou revenir à la vue globale) réinitialise l'intendance.
  // Identité stable : sinon le globe reconstruit tous ses marqueurs à chaque rendu.
  const selectCoordination = useCallback((coordination: CoordinationWithTotal | null) => {
    setSelected(coordination);
    setSelectedIntendance(null);
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
        selected={selected}
        selectedIntendance={selectedIntendance}
        onSelect={selectCoordination}
        onSelectIntendance={setSelectedIntendance}
      />

      <section className="relative min-h-0 flex-1">
        <GlobeView
          selected={selected}
          selectedIntendance={selectedIntendance}
          mapStyle={mapStyle}
          onSelect={selectCoordination}
          onSelectIntendance={setSelectedIntendance}
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
          {COLOR_CODING && (
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
          )}
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

        {/* Détail de la coordination — mobile */}
        {selected && (
          <div className="absolute top-14 right-3 left-3 z-10 rounded-2xl border border-[#29ABE2]/50 bg-[#040a18]/90 p-3 text-xs backdrop-blur-md md:hidden">
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-bold text-white">{selected.name}</p>
              <p className="shrink-0 font-bold text-[#4db8ff]">
                {selected.people} <span className="text-[10px] text-white/50">membres</span>
              </p>
            </div>
            {selected.intendances.length > 0 ? (
              <div className="mt-1.5 flex max-h-20 flex-wrap gap-1.5 overflow-y-auto border-t border-white/10 pt-1.5">
                {[...selected.intendances]
                  .sort((a, b) => b.people - a.people)
                  .map((intendance) => {
                    const isActive = selectedIntendance?.name === intendance.name;
                    const color = colorOf(intendance.people);
                    return (
                      <button
                        key={intendance.name}
                        onClick={() => setSelectedIntendance(isActive ? null : intendance)}
                        className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold text-white/90"
                        style={{
                          borderColor: isActive ? color : `${color}88`,
                          backgroundColor: isActive ? `${color}40` : "transparent",
                        }}
                      >
                        {intendance.name}
                        <span style={{ color }}>{intendance.people}</span>
                      </button>
                    );
                  })}
              </div>
            ) : (
              <p className="mt-1 text-white/55">
                {selected.subtitle ?? "Pas encore de découpage par intendance."}
              </p>
            )}
            <button
              onClick={() => selectCoordination(null)}
              className="mt-1.5 rounded-lg border border-white/20 px-2.5 py-1 text-[11px] text-white/80"
            >
              ← Vue globale
            </button>
          </div>
        )}

        {/* Bande de coordinations défilante — mobile */}
        <div className="absolute inset-x-0 bottom-0 z-10 flex snap-x gap-2 overflow-x-auto p-3 md:hidden">
          {sorted.map((coordination) => (
            <CoordinationCard
              key={coordination.id}
              coordination={coordination}
              compact
              selected={selected?.id === coordination.id}
              onClick={() =>
                selectCoordination(selected?.id === coordination.id ? null : coordination)
              }
            />
          ))}
        </div>

        {/* Textes lisibles aussi bien sur fond sombre que sur fond clair */}
        <p
          className={`pointer-events-none absolute bottom-3 left-1/2 hidden -translate-x-1/2 rounded-full px-3 py-1 text-xs md:block ${
            mapStyle.light ? "bg-white/70 text-slate-700" : "text-white/40"
          }`}
        >
          {UNASSIGNED > 0
            ? `${UNASSIGNED} membres restent à rattacher à une coordination`
            : "Cliquez sur une coordination, puis sur une intendance pour zoomer"}
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
        <Overview
          initialCoordinationId={selected?.id ?? null}
          onClose={() => setShowOverview(false)}
        />
      )}
    </main>
  );
}
