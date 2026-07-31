"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BRAND,
  COLOR_CODING,
  COORDINATIONS,
  Intendance,
  LISTED_PEOPLE,
  STATUSES,
  TOTAL_MEMBERS,
  UNASSIGNED,
  colorOf,
  intendancesOf,
  mapLabel,
} from "@/data/network";

type Ring = [number, number][];
type Feature = {
  properties: { ADM0_A3: string };
  geometry: { type: "Polygon" | "MultiPolygon"; coordinates: unknown };
};

type OverviewProps = {
  initialCoordinationId: string | null;
  onClose: () => void;
};

// Deux formats : paysage (écran large) et portrait (téléphone), pour que
// le visuel tienne entièrement à l'écran sans défilement.
type Layout = { W: number; H: number; header: number; portrait: boolean };
const LANDSCAPE: Layout = { W: 1200, H: 880, header: 112, portrait: false };
const PORTRAIT: Layout = { W: 760, H: 1180, header: 178, portrait: true };

type Map = { x: number; y: number; w: number; h: number };

function ringsOf(geometry: Feature["geometry"]): Ring[] {
  if (geometry.type === "Polygon") return geometry.coordinates as Ring[];
  return (geometry.coordinates as Ring[][]).flat();
}

// Projection équirectangulaire ajustée (les longitudes sont compressées
// selon la latitude moyenne de la zone pour limiter la déformation)
function makeProjection(
  points: [number, number][],
  pad: { l: number; r: number; t: number; b: number },
  map: Map
) {
  const lngs = points.map((p) => p[0]);
  const lats = points.map((p) => p[1]);
  const minLng = Math.min(...lngs) - pad.l;
  const maxLng = Math.max(...lngs) + pad.r;
  const minLat = Math.min(...lats) - pad.b;
  const maxLat = Math.max(...lats) + pad.t;
  const k = Math.max(0.45, Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180));
  const scale = Math.min(
    map.w / ((maxLng - minLng) * k),
    map.h / (maxLat - minLat)
  );
  const cx = ((minLng + maxLng) / 2) * k;
  const cy = (minLat + maxLat) / 2;
  return (lng: number, lat: number): [number, number] => [
    map.x + map.w / 2 + (lng * k - cx) * scale,
    map.y + map.h / 2 - (lat - cy) * scale,
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

/** Largeur approximative d'un texte en Helvetica */
function textWidth(text: string, size: number, bold = false) {
  return text.length * size * (bold ? 0.62 : 0.53);
}

type PinItem = {
  key: string;
  x: number;
  y: number;
  label: string;
  people: number;
  color: string;
  size: number;
};
type PlacedPin = PinItem & { chipX: number; chipY: number; chipW: number; moved: boolean };

const CHIP_H = 24;

/**
 * Place les étiquettes en évitant qu'elles se chevauchent entre elles,
 * qu'elles recouvrent un repère, ou qu'elles sortent du cadre.
 * Une étiquette déplacée est reliée à son repère par un trait.
 */
function layoutPins(items: PinItem[], bounds: Map): PlacedPin[] {
  type Rect = { x: number; y: number; w: number; h: number };
  const overlaps = (a: Rect, b: Rect) =>
    a.x < b.x + b.w + 6 &&
    a.x + a.w + 6 > b.x &&
    a.y < b.y + b.h + 4 &&
    a.y + a.h + 4 > b.y;

  // Les repères eux-mêmes sont des obstacles
  const taken: Rect[] = items.map((it) => ({
    x: it.x - it.size / 2,
    y: it.y - it.size * 1.25,
    w: it.size,
    h: it.size * 1.25,
  }));

  return [...items]
    .sort((a, b) => a.y - b.y)
    .map((item) => {
      const chipW = textWidth(`${item.label} · ${item.people}`, 13.5, true) + 22;
      const side = chipW / 2 + 16;
      const candidates: [number, number][] = [
        [0, 6],
        [0, 36],
        [0, -46],
        [side, -8],
        [-side, -8],
        [side, 20],
        [-side, 20],
        [side, -40],
        [-side, -40],
        [0, 66],
        [0, -76],
        [side, 48],
        [-side, 48],
        [side * 1.5, -8],
        [-side * 1.5, -8],
        [side, -70],
        [-side, -70],
        [0, 96],
        [0, -106],
        [side * 1.5, 30],
        [-side * 1.5, 30],
      ];
      const inside = (x: number, y: number) =>
        x >= bounds.x + 6 &&
        x + chipW <= bounds.x + bounds.w - 6 &&
        y >= bounds.y + 4 &&
        y + CHIP_H <= bounds.y + bounds.h - 4;
      const fit =
        candidates.find(([dx, dy]) => {
          const x = item.x - chipW / 2 + dx;
          const y = item.y + dy;
          return (
            inside(x, y) && !taken.some((t) => overlaps({ x, y, w: chipW, h: CHIP_H }, t))
          );
        }) ?? candidates[0];
      // Filet de sécurité : on ramène l'étiquette dans le cadre
      const chipX = Math.min(
        Math.max(item.x - chipW / 2 + fit[0], bounds.x + 6),
        bounds.x + bounds.w - chipW - 6
      );
      const chipY = Math.min(
        Math.max(item.y + fit[1], bounds.y + 4),
        bounds.y + bounds.h - CHIP_H - 4
      );
      taken.push({ x: chipX, y: chipY, w: chipW, h: CHIP_H });
      const moved =
        Math.abs(chipX - (item.x - chipW / 2)) > 2 || Math.abs(chipY - (item.y + 6)) > 2;
      return { ...item, chipX, chipY, chipW, moved };
    });
}

function Pin({ pin }: { pin: PlacedPin }) {
  const { x, y, size, color, label, people, chipX, chipY, chipW, moved } = pin;
  return (
    <g>
      {moved && (
        <line
          x1={x}
          y1={y}
          x2={chipX + chipW / 2}
          y2={chipY + CHIP_H / 2}
          stroke={color}
          strokeWidth="1.3"
          strokeOpacity="0.65"
        />
      )}
      <g transform={`translate(${x - size / 2}, ${y - size * 1.25}) scale(${size / 24})`}>
        <path
          d="M12 0C5.85 0 1 4.9 1 10.95 1 19.1 12 30 12 30s11-10.9 11-19.05C23 4.9 18.15 0 12 0z"
          fill={color}
          stroke="rgba(255,255,255,0.95)"
          strokeWidth="1.6"
        />
        <circle cx="12" cy="10.8" r="4.6" fill="rgba(255,255,255,0.95)" />
      </g>
      <rect
        x={chipX}
        y={chipY}
        width={chipW}
        height={CHIP_H}
        rx={12}
        fill="rgba(4,10,24,0.92)"
        stroke={color}
        strokeWidth="1.4"
      />
      <text x={chipX + 11} y={chipY + 16.5} fontSize="13.5" fontWeight="700" fill="#ffffff">
        {label} · <tspan fill={BRAND.lightBlue}>{people}</tspan>
      </text>
    </g>
  );
}

export default function Overview({ initialCoordinationId, onClose }: OverviewProps) {
  const [view, setView] = useState<string>(initialCoordinationId ?? "world");
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

  // Le visuel bascule en portrait sur les écrans plus hauts que larges
  const [{ W, H, header, portrait }, setLayout] = useState<Layout>(LANDSCAPE);
  useEffect(() => {
    const apply = () => {
      if (window.innerHeight <= window.innerWidth * 1.1) return setLayout(LANDSCAPE);
      // Le visuel épouse la forme de l'écran pour éviter les bandes vides
      // (la barre d'outils occupe environ 92 px).
      const ratio = (window.innerHeight - 92) / Math.max(1, window.innerWidth - 16);
      const H = Math.round(PORTRAIT.W * Math.min(1.78, Math.max(1.3, ratio)));
      setLayout({ ...PORTRAIT, H });
    };
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);

  const coordination = COORDINATIONS.find((c) => c.id === view) ?? null;

  /** Entrées affichées sur la carte et dans le classement */
  const entries = useMemo<Intendance[]>(() => {
    if (coordination) {
      // Communes d'Abidjan regroupées : à cette échelle elles se superposeraient
      return coordination.intendances.length
        ? intendancesOf(coordination, { grouped: true })
        : [
            {
              name: coordination.name,
              people: coordination.people,
              lat: coordination.lat,
              lng: coordination.lng,
            },
          ];
    }
    return COORDINATIONS.map((c) => ({
      name: c.name,
      people: c.people,
      lat: c.lat,
      lng: c.lng,
    }));
  }, [coordination]);

  /**
   * Une coordination sans découpage n'a rien à classer : son effectif est
   * déjà dans l'en-tête, inutile de répéter son nom dans une liste d'un seul
   * élément. La carte occupe alors toute la largeur.
   */
  const showRanking = entries.length > 1;

  // Le classement occupe sa propre colonne (ou sa propre bande en portrait) :
  // la carte n'est jamais recouverte.
  const rank = useMemo(() => {
    if (!showRanking) return { x: 0, y: 0, w: 0, h: 0, columns: 1 };
    const columns = portrait && entries.length > 7 ? 2 : 1;
    const h = 46 + Math.ceil(entries.length / columns) * 21;
    if (portrait) return { x: 20, y: H - h - 20, w: W - 40, h, columns };
    return { x: W - 340, y: header + 20, w: 320, h, columns };
  }, [showRanking, entries.length, portrait, W, H, header]);

  const mapArea = useMemo<Map>(() => {
    if (!showRanking) return { x: 0, y: header, w: W, h: H - header };
    return portrait
      ? { x: 0, y: header, w: W, h: H - header - rank.h - 30 }
      : { x: 0, y: header, w: W - rank.w - 40, h: H - header };
  }, [showRanking, portrait, W, H, header, rank]);

  const proj = useMemo(() => {
    const map = mapArea;
    const pts = entries.map((e) => [e.lng, e.lat] as [number, number]);
    if (coordination) {
      // Une coordination sans découpage : on cadre autour de son centre
      const spread = coordination.intendances.length ? 3.5 : coordination.altitude * 20;
      return makeProjection(
        pts,
        { l: spread, r: spread, t: spread * 0.7, b: spread * 0.85 },
        map
      );
    }
    const pad = portrait ? { l: 6, r: 6, t: 26, b: 9 } : { l: 16, r: 16, t: 26, b: 9 };
    return makeProjection(pts, pad, map);
  }, [entries, coordination, mapArea, portrait]);

  const pins = useMemo(() => {
    const items: PinItem[] = entries.map((e) => {
      const [x, y] = proj(e.lng, e.lat);
      return {
        key: e.name,
        x,
        y,
        label: mapLabel(e),
        people: e.people,
        color: colorOf(e.people),
        // Taille fixe : des repères proportionnels masquaient les pays
        size: portrait ? 26 : 30,
      };
    });
    return layoutPins(items, mapArea);
  }, [entries, proj, mapArea, portrait]);

  const ranking = useMemo(
    () => [...entries].sort((a, b) => b.people - a.people),
    [entries]
  );

  const dateLabel = new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
  }).format(new Date());

  const title = coordination ? coordination.name : "Répartition des membres";
  const subtitle = coordination
    ? `${coordination.intendances.length ? `${coordination.intendances.length} intendances` : "Coordination"} · ${dateLabel}`
    : `Coordinations dans le monde · ${dateLabel}`;

  const totalLabel = coordination ? coordination.name : "Total des membres";
  const totalValue = String(coordination ? coordination.people : TOTAL_MEMBERS);
  const totalBoxW =
    textWidth(`${totalLabel} : `, 17) +
    textWidth(totalValue, 24, true) +
    textWidth(" membres", 17) +
    48;

  /** Emplacement de la légende des couleurs (si elle est réactivée) */
  const legendY = mapArea.y + mapArea.h - 192;

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
      const slug = title.toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "");
      a.download = `sacerdoce-royal-${slug || "monde"}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    };
    img.src = url;
  };

  // Seules les coordinations dont le territoire se trace ont leur propre vue.
  // « Afrique » couvre plusieurs pays : elle reste sur la carte du monde.
  const tabs = [
    { id: "world", label: "🌍 Monde" },
    ...COORDINATIONS.filter((c) => c.iso).map((c) => ({ id: c.id, label: c.name })),
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#02060f]/95 backdrop-blur-sm">
      {/* Barre d'actions */}
      <div className="shrink-0 border-b border-white/10 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white">Aperçu</span>
          <button
            onClick={downloadPng}
            className="ml-auto rounded-full border border-[#f5d84a]/60 bg-[#f5d84a]/15 px-3 py-1 text-xs font-semibold whitespace-nowrap text-[#f5d84a] transition-colors hover:bg-[#f5d84a]/25"
          >
            ⬇ <span className="hidden sm:inline">Télécharger en </span>image
          </button>
          <button
            onClick={onClose}
            className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold whitespace-nowrap text-white/85 transition-colors hover:bg-white/10"
          >
            ✕ Fermer
          </button>
        </div>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap transition-colors ${
                view === tab.id
                  ? "border-[#29ABE2] bg-[#29ABE2]/25 text-white"
                  : "border-white/20 text-white/75 hover:bg-white/10"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Carte statique — tient entièrement dans l'espace disponible */}
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-2 md:p-3">
        <svg
          ref={svgRef}
          xmlns="http://www.w3.org/2000/svg"
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          className="max-h-full max-w-full rounded-2xl border border-white/10"
          // width/height auto : le navigateur réduit le visuel sans le déformer
          style={{ width: "auto", height: "auto" }}
          preserveAspectRatio="xMidYMid meet"
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
            const c = COORDINATIONS.find((cc) => cc.iso === f.properties.ADM0_A3);
            const isCurrent = c && c.id === coordination?.id;
            return (
              <path
                key={i}
                d={pathOf(ringsOf(f.geometry), proj)}
                fill={
                  c
                    ? isCurrent || !coordination
                      ? `${colorOf(c.people)}${isCurrent ? "cc" : "b3"}`
                      : "#16233d"
                    : "#0d1830"
                }
                stroke={c ? "rgba(255,255,255,0.55)" : "#1d2c49"}
                strokeWidth={c ? 1.2 : 0.7}
              />
            );
          })}

          {/* Repères (étiquettes replacées pour ne pas se chevaucher) */}
          {pins.map((pin) => (
            <Pin key={pin.key} pin={pin} />
          ))}

          {/* En-tête — le total passe sous le titre en portrait */}
          <rect width={W} height={header} fill="rgba(4,10,24,0.85)" />
          <line x1="0" y1={header} x2={W} y2={header} stroke="rgba(255,255,255,0.12)" />
          {logoDataUrl && (
            <image href={logoDataUrl} x="22" y="14" width="70" height="85" />
          )}
          <text x="108" y="48" fontSize={portrait ? 27 : 30} fontWeight="800" fill="#ffffff">
            Sacerdoce Royal
          </text>
          <text
            x="108"
            y="72"
            fontSize={portrait ? 13.5 : 15}
            fontStyle="italic"
            fill={BRAND.gold}
          >
            Esprit Saint glorifiant Jésus — Que ton règne vienne !
          </text>
          <text x="108" y="94" fontSize={portrait ? 12.5 : 14} fill="#9fc9e8">
            {title} — {subtitle}
          </text>
          <rect
            x={portrait ? 22 : W - 24 - totalBoxW}
            y={portrait ? 116 : 30}
            width={portrait ? W - 44 : totalBoxW}
            height={portrait ? 48 : 52}
            rx={14}
            fill="rgba(41,171,226,0.16)"
            stroke="rgba(41,171,226,0.5)"
            strokeWidth="1.4"
          />
          <text
            x={portrait ? W / 2 : W - 24 - totalBoxW / 2}
            y={portrait ? 147 : 62}
            fontSize="17"
            fill="#cfe9fb"
            textAnchor="middle"
          >
            {totalLabel} :{" "}
            <tspan fontSize="24" fontWeight="800" fill={BRAND.lightBlue}>
              {totalValue}
            </tspan>{" "}
            membres
          </text>

          {/* Classement chiffré, dans sa propre colonne */}
          {showRanking && (
            <>
              <rect
                x={rank.x}
                y={rank.y}
                width={rank.w}
                height={rank.h}
                rx={14}
                fill="rgba(4,10,24,0.9)"
                stroke="rgba(255,255,255,0.18)"
              />
              <text
                x={rank.x + 16}
                y={rank.y + 26}
                fontSize="12.5"
                fontWeight="700"
                fill="#9fc9e8"
                letterSpacing="2"
              >
                {coordination ? "INTENDANCES" : "COORDINATIONS"}
              </text>
              {ranking.map((entry, i) => {
                // En portrait la liste passe sur deux colonnes si elle est longue
                const perCol = Math.ceil(ranking.length / rank.columns);
                const col = Math.floor(i / perCol);
                const row = i % perCol;
                const colW = rank.w / rank.columns;
                const x = rank.x + col * colW;
                const y = rank.y + 48 + row * 21;
                return (
                  <g key={entry.name}>
                    <text x={x + 16} y={y} fontSize="11" fill="rgba(255,255,255,0.4)">
                      {i + 1}.
                    </text>
                    <text x={x + 36} y={y} fontSize="12.5" fill="#ffffff">
                      {entry.name}
                    </text>
                    <text
                      x={x + colW - 16}
                      y={y}
                      fontSize="13"
                      fontWeight="700"
                      fill={BRAND.lightBlue}
                      textAnchor="end"
                    >
                      {entry.people}
                    </text>
                  </g>
                );
              })}
            </>
          )}

          {/* Légende : tailles (ou couleurs si le code couleur est réactivé) */}
          {COLOR_CODING ? (
            <>
              <rect
                x={20}
                y={legendY}
                width={302}
                height={172}
                rx={14}
                fill="rgba(4,10,24,0.88)"
                stroke="rgba(255,255,255,0.18)"
              />
              <text
                x={38}
                y={legendY + 27}
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
                const y = legendY + 52 + i * 26;
                return (
                  <g key={status.label}>
                    <circle cx={44} cy={y - 4} r={5.5} fill={status.color} />
                    <text x={58} y={y} fontSize="13" fontWeight="600" fill="#ffffff">
                      {status.label}
                    </text>
                    <text
                      x={308}
                      y={y}
                      fontSize="11.5"
                      fill="rgba(255,255,255,0.55)"
                      textAnchor="end"
                    >
                      {range}
                    </text>
                  </g>
                );
              })}
            </>
          ) : null}

          {/* Rappel de l'écart entre le total et la répartition connue */}
          {!coordination && UNASSIGNED > 0 && (
            <text
              x={20}
              y={mapArea.y + mapArea.h - 18}
              fontSize="11.5"
              fill="rgba(255,255,255,0.45)"
            >
              {LISTED_PEOPLE} membres répartis · {UNASSIGNED} en attente de rattachement
            </text>
          )}
        </svg>
      </div>
    </div>
  );
}
