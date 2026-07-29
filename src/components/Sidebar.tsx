"use client";

import Image from "next/image";
import { COUNTRIES, Country, TOTAL_PEOPLE, getStatus } from "@/data/countries";
import CountryCard from "./CountryCard";
import Legend from "./Legend";

type SidebarProps = {
  selected: Country | null;
  onSelect: (country: Country | null) => void;
};

export default function Sidebar({ selected, onSelect }: SidebarProps) {
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
            Que ton règne vienne !
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
