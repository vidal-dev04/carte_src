"use client";

import Image from "next/image";
import { City, COUNTRIES, Country, TOTAL_PEOPLE, getStatus } from "@/data/countries";
import CountryCard from "./CountryCard";
import Legend from "./Legend";

type SidebarProps = {
  selected: Country | null;
  selectedCity: City | null;
  onSelect: (country: Country | null) => void;
  onSelectCity: (city: City | null) => void;
};

export default function Sidebar({
  selected,
  selectedCity,
  onSelect,
  onSelectCity,
}: SidebarProps) {
  const sorted = [...COUNTRIES].sort((a, b) => b.people - a.people);
  const selectedStatus = selected ? getStatus(selected.people) : null;

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
          <p className="mt-1 text-[11px] text-sky-200/60">
            Carte mondiale des effectifs
          </p>
        </div>
      </header>

      {/* Total */}
      <div className="flex items-center justify-between rounded-2xl border border-[#29ABE2]/30 bg-gradient-to-r from-[#29ABE2]/20 to-[#29ABE2]/5 px-4 py-3">
        <span className="text-sm text-sky-100/80">Total dans le monde</span>
        <span className="text-2xl font-extrabold text-[#4db8ff]">{TOTAL_PEOPLE}</span>
      </div>

      {/* Message du pays sélectionné */}
      {selected && selectedStatus && (
        <div
          className="rounded-2xl border p-3 text-sm"
          style={{
            borderColor: `${selectedStatus.color}66`,
            backgroundColor: `${selectedStatus.color}1a`,
          }}
        >
          <p className="font-bold" style={{ color: selectedStatus.color }}>
            {selected.name} — {selectedStatus.label}
          </p>
          <p className="mt-1 text-white/75">{selectedStatus.message}</p>

          {/* Détail par ville — cliquer zoome sur la ville */}
          <ul className="mt-2 space-y-0.5 border-t border-white/10 pt-2">
            {[...selected.cities]
              .sort((a, b) => b.people - a.people)
              .map((city) => {
                const cityStatus = getStatus(city.people);
                const isActive = selectedCity?.name === city.name;
                return (
                  <li key={city.name}>
                    <button
                      onClick={() => onSelectCity(isActive ? null : city)}
                      className={`flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-xs transition-colors ${
                        isActive ? "bg-white/15" : "hover:bg-white/10"
                      }`}
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{
                          backgroundColor: cityStatus.color,
                          boxShadow: `0 0 6px ${cityStatus.color}`,
                        }}
                      />
                      <span className="min-w-0 flex-1 truncate text-left text-white/90">
                        {city.name}
                        {isActive && <span className="ml-1 text-white/50">🔍</span>}
                      </span>
                      <span
                        className="hidden shrink-0 text-[10px] lg:inline"
                        style={{ color: cityStatus.color }}
                      >
                        {cityStatus.label}
                      </span>
                      <span
                        className="shrink-0 font-bold"
                        style={{ color: cityStatus.color }}
                      >
                        {city.people}
                      </span>
                    </button>
                  </li>
                );
              })}
          </ul>

          <button
            onClick={() => onSelect(null)}
            className="mt-2 rounded-lg border border-white/20 px-3 py-1 text-xs text-white/80 transition-colors hover:bg-white/10"
          >
            ← Vue globale
          </button>
        </div>
      )}

      {/* Liste des pays */}
      <div className="flex flex-col gap-2.5">
        <h2 className="text-xs font-bold tracking-widest text-sky-200/80 uppercase">
          Nos assemblées
        </h2>
        {sorted.map((country) => (
          <CountryCard
            key={country.id}
            country={country}
            selected={selected?.id === country.id}
            onClick={() =>
              onSelect(selected?.id === country.id ? null : country)
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
