"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  COUNTRIES,
  Country,
  STATUSES,
  TOTAL_PEOPLE,
  getStatus,
} from "@/data/countries";

type Ring = [number, number][];
type Feature = {
  properties: { ADM0_A3: string };
  geometry: { type: "Polygon" | "MultiPolygon"; coordinates: unknown };
};

type OverviewProps = {
  initialCountryId: string | null;
  onClose: () => void;
};

// Dimensions du visuel exporté
const W = 1200;
const H = 880;
const MAP = { x: 0, y: 112, w: W, h: H - 112 };

function ringsOf(geometry: Feature["geometry"]): Ring[] {
  if (geometry.type === "Polygon") return geometry.coordinates as Ring[];
  return (geometry.coordinates as Ring[][]).flat();
}

// Projection équirectangulaire ajustée (les longitudes sont compressées
// selon la latitude moyenne de la zone pour limiter la déformation)
function makeProjection(
  points: [number, number][],
  pad: { l: number; r: number; t: number; b: number }
) {
  const lngs = points.map((p) => p[0]);
  const lats = points.map((p) => p[1]);
  const minLng = Math.min(...lngs) - pad.l;
  const maxLng = Math.max(...lngs) + pad.r;
  const minLat = Math.min(...lats) - pad.b;
  const maxLat = Math.max(...lats) + pad.t;
  const k = Math.max(0.45, Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180));
  const scale = Math.min(
    MAP.w / ((maxLng - minLng) * k),
    MAP.h / (maxLat - minLat)
  );
  const cx = ((minLng + maxLng) / 2) * k;
  const cy = (minLat + maxLat) / 2;
  return (lng: number, lat: number): [number, number] => [
    MAP.x + MAP.w / 2 + (lng * k - cx) * scale,
    MAP.y + MAP.h / 2 - (lat - cy) * scale,
  ];
}

function pathOf(rings: Ring[], proj: (lng: number, lat: number) => [number, number]) {
  return rings
    .map((ring) => {
      let d = "";
      let prevLng = 0;
      ring.forEach(([lng, lat], i) => {
        // coupe les anneaux qui traversent l'antiméridien (Alaska, Russie…)
        const cmd = i === 0 || Math.abs(lng - prevLng) > 180 ? "M" : "L";
        const [x, y] = proj(lng, lat);
        d += `${cmd}${x.toFixed(1)},${y.toFixed(1)}`;
        prevLng = lng;
      });
      return d + "Z";
    })
    .join("");
}

/** Épingle de carte avec étiquette « Nom · effectif » */
function Pin({
  x,
  y,
  label,
  people,
  color,
  size = 30,
}: {
  x: number;
  y: number;
  label: string;
  people: number;
  color: string;
  size?: number;
}) {
  const text = `${label} · ${people}`;
  const chipW = text.length * 7.4 + 22;
  return (
    <g>
      <g transform={`translate(${x - size / 2}, ${y - size * 1.25}) scale(${size / 24})`}>
        <path
          d="M12 0C5.85 0 1 4.9 1 10.95 1 19.1 12 30 12 30s11-10.9 11-19.05C23 4.9 18.15 0 12 0z"
          fill={color}
          stroke="rgba(255,255,255,0.95)"
          strokeWidth="1.6"
        />
        <circle cx="12" cy="10.8" r="4.2" fill="rgba(255,255,255,0.92)" />
      </g>
      <rect
        x={x - chipW / 2}
        y={y + 6}
        width={chipW}
        height={24}
        rx={12}
        fill="rgba(4,10,24,0.92)"
        stroke={color}
        strokeWidth="1.4"
      />
      <text
        x={x - chipW / 2 + 11}
        y={y + 22.5}
        fontSize="13.5"
        fontWeight="700"
        fill="#ffffff"
      >
        {label} · <tspan fill={color}>{people}</tspan>
      </text>
    </g>
  );
}

export default function Overview({ initialCountryId, onClose }: OverviewProps) {
  const [view, setView] = useState<string>(initialCountryId ?? "world");
  const [features, setFeatures] = useState<Feature[]>([]);
  const [logoDataUrl, setLogoDataUrl] = useState<string>("");
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    fetch("/data/countries.geojson")
      .then((r) => r.json())
      .then((geo: { features: Feature[] }) => setFeatures(geo.features));
    // Le logo est embarqué en data-URL pour être inclus dans l'export PNG
    fetch("/logo-sr.png")
      .then((r) => r.blob())
      .then(
        (blob) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          })
      )
      .then(setLogoDataUrl);
  }, []);

  const country = COUNTRIES.find((c) => c.id === view) ?? null;
  const trackedIds = useMemo(() => new Set(COUNTRIES.map((c) => c.id)), []);

  const proj = useMemo(() => {
    if (country) {
      const pts: [number, number][] = country.cities.map((c) => [c.lng, c.lat]);
      pts.push([country.lng, country.lat]);
      return makeProjection(pts, { l: 3.5, r: 3.5, t: 2.5, b: 3 });
    }
    const pts: [number, number][] = COUNTRIES.flatMap((c) => [
      [c.lng, c.lat] as [number, number],
      ...c.cities.map((city) => [city.lng, city.lat] as [number, number]),
    ]);
    return makeProjection(pts, { l: 16, r: 16, t: 26, b: 9 });
  }, [country]);

  const dateLabel = new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
  }).format(new Date());

  const downloadPng = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const url = URL.createObjectURL(
      new Blob([xml], { type: "image/svg+xml;charset=utf-8" })
    );
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = W * 2;
      canvas.height = H * 2;
      const ctx = canvas.getContext("2d")!;
      ctx.scale(2, 2);
      ctx.drawImage(img, 0, 0, W, H);
      URL.revokeObjectURL(url);
      const a = document.createElement("a");
      a.download = `sacerdoce-royal-${country ? country.name.toLowerCase().replace(/[^a-z]+/g, "-") : "monde"}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    };
    img.src = url;
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#02060f]/95 backdrop-blur-sm">
      {/* Barre d'actions */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-3">
        <span className="mr-2 text-sm font-bold text-white">Aperçu</span>
        <button
          onClick={() => setView("world")}
          className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
            !country
              ? "border-[#29ABE2] bg-[#29ABE2]/25 text-white"
              : "border-white/20 text-white/75 hover:bg-white/10"
          }`}
        >
          🌍 Monde
        </button>
        {COUNTRIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setView(c.id)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
              view === c.id
                ? "border-[#29ABE2] bg-[#29ABE2]/25 text-white"
                : "border-white/20 text-white/75 hover:bg-white/10"
            }`}
          >
            {c.name}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={downloadPng}
            className="rounded-full border border-[#f5d84a]/60 bg-[#f5d84a]/15 px-3 py-1 text-xs font-semibold text-[#f5d84a] transition-colors hover:bg-[#f5d84a]/25"
          >
            ⬇ Télécharger en image
          </button>
          <button
            onClick={onClose}
            className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-white/85 transition-colors hover:bg-white/10"
          >
            ✕ Fermer
          </button>
        </div>
      </div>

      {/* Carte statique */}
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-3">
        <svg
          ref={svgRef}
          xmlns="http://www.w3.org/2000/svg"
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto max-h-full w-full max-w-6xl rounded-2xl border border-white/10"
          fontFamily="Helvetica, Arial, sans-serif"
        >
          <defs>
            <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#071226" />
              <stop offset="1" stopColor="#02060f" />
            </linearGradient>
          </defs>
          <rect width={W} height={H} fill="url(#bg)" />

          {/* Pays (fond de carte) */}
          {features.map((f, i) => {
            const tracked = trackedIds.has(f.properties.ADM0_A3);
            const c = tracked
              ? COUNTRIES.find((cc) => cc.id === f.properties.ADM0_A3)!
              : null;
            const isCurrent = c && country && c.id === country.id;
            return (
              <path
                key={i}
                d={pathOf(ringsOf(f.geometry), proj)}
                fill={
                  c
                    ? isCurrent || !country
                      ? `${getStatus(c.people).color}${isCurrent ? "cc" : "b3"}`
                      : "#16233d"
                    : "#0d1830"
                }
                stroke={c ? "rgba(255,255,255,0.55)" : "#1d2c49"}
                strokeWidth={c ? 1.2 : 0.7}
              />
            );
          })}

          {/* Épingles */}
          {country
            ? country.cities.map((city) => {
                const [x, y] = proj(city.lng, city.lat);
                return (
                  <Pin
                    key={city.name}
                    x={x}
                    y={y}
                    label={city.name}
                    people={city.people}
                    color={getStatus(city.people).color}
                    size={32}
                  />
                );
              })
            : COUNTRIES.map((c) => {
                const [x, y] = proj(c.lng, c.lat);
                return (
                  <Pin
                    key={c.id}
                    x={x}
                    y={y}
                    label={c.name}
                    people={c.people}
                    color={getStatus(c.people).color}
                    size={28}
                  />
                );
              })}

          {/* En-tête */}
          <rect width={W} height={112} fill="rgba(4,10,24,0.85)" />
          <line x1="0" y1="112" x2={W} y2="112" stroke="rgba(255,255,255,0.12)" />
          {logoDataUrl && (
            <image href={logoDataUrl} x="22" y="14" width="70" height="85" />
          )}
          <text x="108" y="48" fontSize="30" fontWeight="800" fill="#ffffff">
            Sacerdoce Royal
          </text>
          <text x="108" y="72" fontSize="15" fontStyle="italic" fill="#f5d84a">
            L&apos;Esprit Saint glorifiant Jésus — Que ton règne vienne !
          </text>
          <text x="108" y="94" fontSize="14" fill="#9fc9e8">
            {country
              ? `${country.name} — carte des effectifs · ${dateLabel}`
              : `Carte mondiale des effectifs · ${dateLabel}`}
          </text>
          <rect
            x={W - 320}
            y={30}
            width={296}
            height={52}
            rx={14}
            fill="rgba(41,171,226,0.16)"
            stroke="rgba(41,171,226,0.5)"
            strokeWidth="1.4"
          />
          <text x={W - 302} y={62} fontSize="17" fill="#cfe9fb">
            {country ? country.name : "Total dans le monde"} :{" "}
            <tspan fontSize="24" fontWeight="800" fill="#4db8ff">
              {country ? country.people : TOTAL_PEOPLE}
            </tspan>{" "}
            personnes
          </text>

          {/* Légende */}
          <rect
            x={20}
            y={H - 192}
            width={302}
            height={172}
            rx={14}
            fill="rgba(4,10,24,0.88)"
            stroke="rgba(255,255,255,0.18)"
          />
          <text
            x={38}
            y={H - 165}
            fontSize="12.5"
            fontWeight="700"
            fill="#9fc9e8"
            letterSpacing="2"
          >
            LÉGENDE
          </text>
          {STATUSES.map(({ min, status }, i) => {
            const prev = STATUSES[i - 1];
            const range = prev
              ? min === 0
                ? `moins de ${prev.min}`
                : `${min} à ${prev.min - 1}`
              : `${min} et +`;
            const y = H - 140 + i * 26;
            return (
              <g key={status.key}>
                <circle cx={44} cy={y - 4} r={5.5} fill={status.color} />
                <text x={58} y={y} fontSize="13" fontWeight="600" fill="#ffffff">
                  {status.label}
                </text>
                <text x={308} y={y} fontSize="11.5" fill="rgba(255,255,255,0.55)" textAnchor="end">
                  {range}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
