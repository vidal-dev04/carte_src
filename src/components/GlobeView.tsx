"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Globe, { GlobeMethods } from "react-globe.gl";
import {
  ABIDJAN_SPLIT_ALTITUDE,
  BRAND,
  COORDINATIONS,
  CoordinationWithTotal,
  Intendance,
  colorOf,
  intendancesOf,
  mapLabel,
  shareOf,
} from "@/data/network";
import { MapStyle } from "@/data/mapStyles";

type CountryFeature = {
  properties: { ADM0_A3: string; ADMIN: string };
  __coordination: CoordinationWithTotal;
};

/** Un point posé sur le globe : coordination (vue monde) ou intendance */
type MarkerPoint = {
  key: string;
  name: string;
  /** Nom court affiché sur l'étiquette de la carte */
  label: string;
  people: number;
  lat: number;
  lng: number;
  selected: boolean;
  /** Regroupement des communes d'Abidjan : cliquer rapproche la caméra */
  isCluster?: boolean;
};

type GlobeViewProps = {
  selected: CoordinationWithTotal | null;
  selectedIntendance: Intendance | null;
  mapStyle: MapStyle;
  onSelect: (coordination: CoordinationWithTotal | null) => void;
  onSelectIntendance: (intendance: Intendance | null) => void;
};

const INITIAL_VIEW = { lat: 15, lng: -10, altitude: 2.2 };
/** Altitude de la caméra lors du zoom sur une intendance */
const INTENDANCE_ALTITUDE = 0.07;
/** Les communes d'Abidjan sont petites et proches : on descend plus bas */
const COMMUNE_ALTITUDE = 0.018;

// Sur écran étroit (portrait), on recule la caméra pour que
// le globe et les pays restent entièrement visibles.
function aspectFactor(el: HTMLElement | null) {
  if (!el) return 1;
  const { clientWidth: w, clientHeight: h } = el;
  return w > 0 && w < h ? Math.min(2, h / w) : 1;
}

function hexToRgba(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

type Rect = { left: number; top: number; right: number; bottom: number };

const hits = (a: Rect, b: Rect) =>
  a.left < b.right + 4 && a.right + 4 > b.left && a.top < b.bottom + 3 && a.bottom + 3 > b.top;

const shift = (r: Rect, dx: number, dy: number): Rect => ({
  left: r.left + dx,
  top: r.top + dy,
  right: r.right + dx,
  bottom: r.bottom + dy,
});

export default function GlobeView({
  selected,
  selectedIntendance,
  mapStyle,
  onSelect,
  onSelectIntendance,
}: GlobeViewProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  /** Étiquettes actuellement à l'écran, pour les écarter les unes des autres */
  const chips = useRef(
    new Map<
      string,
      { pin: HTMLElement; chip: HTMLElement; link: HTMLElement; people: number }
    >()
  );
  const relayoutFrame = useRef(0);
  /**
   * L'infobulle vit hors des marqueurs : three-globe réassigne le z-index de
   * chaque marqueur à chaque image, une infobulle interne passerait donc
   * derrière les marqueurs voisins.
   */
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const hoveredPin = useRef<HTMLElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [features, setFeatures] = useState<CountryFeature[]>([]);
  const [hovered, setHovered] = useState<CountryFeature | null>(null);
  /**
   * On ne suit PAS l'altitude exacte : elle change en permanence pendant
   * la rotation, ce qui recréait tous les marqueurs à chaque image (effet
   * de clignotement). On ne retient que l'information utile : les communes
   * d'Abidjan sont-elles regroupées ou non.
   */
  const [grouped, setGrouped] = useState(true);

  // Adapte le canvas à la taille du conteneur
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  // three-globe garde les tuiles déjà téléchargées en cache : sans vidage,
  // changer de fond de carte n'aurait aucun effet à l'écran.
  const firstStyle = useRef(true);
  useEffect(() => {
    if (firstStyle.current) {
      firstStyle.current = false;
      return;
    }
    const globe = globeRef.current;
    if (!globe) return;
    globe.globeTileEngineClearCache();
    // Le cache vidé ne suffit pas : on secoue imperceptiblement la caméra
    // pour que la couche recalcule les tuiles à afficher.
    const pov = globe.pointOfView();
    globe.pointOfView({ ...pov, altitude: pov.altitude * 1.0002 }, 0);
  }, [mapStyle]);

  // Charge les frontières et ne garde que les coordinations tracées
  useEffect(() => {
    fetch("/data/countries.geojson")
      .then((res) => res.json())
      .then((geojson: { features: { properties: { ADM0_A3: string } }[] }) => {
        const byIso = new Map(
          COORDINATIONS.filter((c) => c.iso).map((c) => [c.iso!, c])
        );
        const tracked = geojson.features
          .filter((f) => byIso.has(f.properties.ADM0_A3))
          .map((f) => ({ ...f, __coordination: byIso.get(f.properties.ADM0_A3)! }));
        setFeatures(tracked as CountryFeature[]);
      });
  }, []);

  // Zoom animé : intendance > coordination > vue globale
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;
    const controls = globe.controls();
    const factor = aspectFactor(wrapperRef.current);
    if (selectedIntendance) {
      controls.autoRotate = false;
      globe.pointOfView(
        {
          lat: selectedIntendance.lat,
          lng: selectedIntendance.lng,
          // Une commune d'Abidjan : on zoome nettement plus près
          altitude:
            selectedIntendance.inAbidjan && selectedIntendance.name !== "Abidjan"
              ? COMMUNE_ALTITUDE
              : INTENDANCE_ALTITUDE,
        },
        1200
      );
    } else if (selected) {
      controls.autoRotate = false;
      globe.pointOfView(
        {
          lat: selected.lat,
          lng: selected.lng,
          altitude: selected.altitude * (factor > 1 ? 0.9 : 1),
        },
        1200
      );
    } else {
      globe.pointOfView({ ...INITIAL_VIEW, altitude: INITIAL_VIEW.altitude * factor }, 1200);
      controls.autoRotate = true;
    }
  }, [selected, selectedIntendance]);

  // Vue monde : une pastille par coordination.
  // Coordination ouverte : ses intendances, Abidjan regroupé tant qu'on
  // n'est pas assez près pour distinguer ses communes.
  const markers = useMemo<MarkerPoint[]>(() => {
    if (!selected) {
      return COORDINATIONS.map((c) => ({
        key: c.id,
        name: c.name,
        label: c.name,
        people: c.people,
        lat: c.lat,
        lng: c.lng,
        selected: false,
      }));
    }
    return intendancesOf(selected, { grouped }).map((i) => ({
      key: i.name,
      name: i.name,
      label: mapLabel(i),
      people: i.people,
      lat: i.lat,
      lng: i.lng,
      selected: selectedIntendance?.name === i.name,
      isCluster: grouped && i.name === "Abidjan",
    }));
  }, [selected, selectedIntendance, grouped]);

  /** Colle l'infobulle au-dessus du repère survolé */
  const positionTooltip = useCallback(() => {
    const tip = tooltipRef.current;
    const pin = hoveredPin.current;
    const wrap = wrapperRef.current;
    if (!tip || !pin || !wrap || !pin.isConnected || tip.style.display === "none")
      return;
    const w = wrap.getBoundingClientRect();
    const p = pin.getBoundingClientRect();
    const above = p.top - w.top - 10;
    // Pas la place au-dessus : on bascule sous le repère
    const below = above < tip.offsetHeight + 8;
    tip.style.left = `${p.left + p.width / 2 - w.left}px`;
    tip.style.top = `${below ? p.bottom - w.top + 10 : above}px`;
    tip.style.transform = below ? "translate(-50%, 0)" : "translate(-50%, -100%)";
  }, []);

  const showTooltip = useCallback(
    (point: MarkerPoint, pin: HTMLElement) => {
      const tip = tooltipRef.current;
      if (!tip) return;
      hoveredPin.current = pin;
      tip.style.borderColor = colorOf(point.people);
      tip.innerHTML = `
        <div style="font-weight: 700; font-size: 13px;">${point.name}</div>
        <div style="font-size: 12px; margin-top: 2px;">👥 ${point.people} membres</div>
        <div style="font-size: 11px; margin-top: 2px; color: rgba(232,244,253,0.6);">${Math.round(shareOf(point.people) * 100)} % de l'effectif total</div>
        ${point.isCluster ? `<div style="font-size: 10.5px; margin-top: 4px; color: ${BRAND.gold};">Cliquez pour voir les communes</div>` : ""}`;
      tip.style.display = "block";
      positionTooltip();
    },
    [positionTooltip]
  );

  const hideTooltip = useCallback(() => {
    hoveredPin.current = null;
    if (tooltipRef.current) tooltipRef.current.style.display = "none";
  }, []);

  /**
   * Écarte les étiquettes qui se chevauchent à l'écran. On mesure leur
   * position réelle puis on décale les plus petites : les grosses
   * intendances gardent la place sous leur repère.
   */
  const relayoutChips = useCallback(() => {
    cancelAnimationFrame(relayoutFrame.current);
    relayoutFrame.current = requestAnimationFrame(() => {
      const entries = [...chips.current.values()].filter((e) => e.chip.isConnected);
      const reset = (e: (typeof entries)[number]) => {
        e.chip.style.transform = "";
        e.link.style.display = "none";
      };
      if (entries.length < 2) {
        entries.forEach(reset);
        return;
      }
      entries.forEach(reset);
      // Les repères sont des obstacles fixes
      const taken: Rect[] = entries.map((e) => e.pin.getBoundingClientRect());
      // Les plus gros effectifs choisissent leur place en premier
      [...entries]
        .sort((a, b) => b.people - a.people)
        .forEach((entry) => {
          const base = entry.chip.getBoundingClientRect();
          const w = base.width;
          const candidates: [number, number][] = [
            [0, 0],
            [0, 24],
            [0, -1.8 * base.height - 26],
            [w / 2 + 10, -16],
            [-w / 2 - 10, -16],
            [w / 2 + 10, 10],
            [-w / 2 - 10, 10],
            [0, 48],
            [w / 2 + 10, -42],
            [-w / 2 - 10, -42],
            [0, 72],
            [w + 22, -16],
            [-w - 22, -16],
            [w + 22, 14],
            [-w - 22, 14],
            [w / 2 + 10, 40],
            [-w / 2 - 10, 40],
            [0, -2.6 * base.height - 44],
            [0, 96],
          ];
          const fit =
            candidates.find(
              ([dx, dy]) => !taken.some((t) => hits(shift(base, dx, dy), t))
            ) ?? candidates[0];
          taken.push(shift(base, fit[0], fit[1]));
          const [dx, dy] = fit;
          entry.chip.style.transform = dx || dy ? `translate(${dx}px, ${dy}px)` : "";

          // Trait de rappel vers l'étiquette déplacée, pour qu'on sache
          // toujours à quel repère elle appartient
          const toY = dy + base.height / 2 + 2;
          const distance = Math.hypot(dx, toY);
          if (distance > 22) {
            entry.link.style.display = "block";
            entry.link.style.width = `${distance}px`;
            entry.link.style.transform = `rotate(${Math.atan2(toY, dx)}rad)`;
          } else {
            entry.link.style.display = "none";
          }
        });
      positionTooltip();
    });
  }, [positionTooltip]);

  const labelHtml = useMemo(
    () => (feature: object) => {
      const c = (feature as CountryFeature).__coordination;
      // Coordination déjà ouverte : ce sont les survols des intendances
      // qui donnent le détail
      if (c.id === selected?.id) return "";
      const rows = c.intendances
        .slice(0, 5)
        .map(
          (i) => `
            <div style="display: flex; gap: 10px; font-size: 11px; margin-top: 3px;">
              <span style="flex: 1;">${i.name}</span>
              <span style="color: ${BRAND.lightBlue}; font-weight: 700;">${i.people}</span>
            </div>`
        )
        .join("");
      const more =
        c.intendances.length > 5
          ? `<div style="font-size: 10px; color: rgba(232,244,253,0.5); margin-top: 4px;">+ ${c.intendances.length - 5} autres intendances</div>`
          : "";
      return `
        <div style="background: rgba(5, 15, 35, 0.94); border: 1px solid ${BRAND.blue}; border-radius: 10px; padding: 8px 12px; font-family: inherit; color: #e8f4fd; max-width: 230px;">
          <div style="font-weight: 700; font-size: 14px;">${c.name}</div>
          <div style="font-size: 13px; margin-top: 2px;">👥 ${c.people} membres <span style="color: rgba(232,244,253,0.55);">· ${Math.round(shareOf(c.people) * 100)} %</span></div>
          ${rows ? `<div style="border-top: 1px solid rgba(255,255,255,0.15); margin-top: 6px; padding-top: 3px;">${rows}${more}</div>` : ""}
        </div>`;
    },
    [selected]
  );

  // Marqueur : la taille traduit l'effectif (surface proportionnelle).
  // Cliquable, avec une infobulle au survol.
  const compact = size.width > 0 && size.width < 480;
  const marker = useMemo(
    () => (data: object) => {
      const point = data as MarkerPoint;
      const color = colorOf(point.people);
      // Taille fixe : des repères proportionnels masquaient les pays
      const pin = compact ? 18 : 22;
      const el = document.createElement("div");
      el.style.pointerEvents = "none";
      el.innerHTML = `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; font-family: inherit;">
          <div data-link style="position: absolute; left: 50%; top: ${pin * 1.25 + 4}px; height: 1.6px; background: ${color}; opacity: 0.75; transform-origin: 0 50%; display: none; pointer-events: none;"></div>
          <div data-hit style="padding: 4px; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.7));">
            <svg width="${pin}" height="${pin * 1.25}" viewBox="-3 -3 30 36" overflow="visible">
              <!-- Liseré sombre : deux repères qui se superposent restent distincts -->
              <path d="M12 0C5.85 0 1 4.9 1 10.95 1 19.1 12 30 12 30s11-10.9 11-19.05C23 4.9 18.15 0 12 0z"
                fill="none" stroke="rgba(3,12,26,0.9)" stroke-width="5"/>
              <path d="M12 0C5.85 0 1 4.9 1 10.95 1 19.1 12 30 12 30s11-10.9 11-19.05C23 4.9 18.15 0 12 0z"
                fill="${color}" stroke="rgba(255,255,255,0.95)" stroke-width="1.6"/>
              <circle cx="12" cy="10.8" r="4.6" fill="rgba(255,255,255,0.95)"/>
              ${point.isCluster ? `<circle cx="12" cy="10.8" r="2" fill="${color}"/>` : ""}
            </svg>
          </div>
          <div data-hit style="margin-top: 2px; background: ${point.selected ? hexToRgba(color, 0.4) : "rgba(4, 10, 24, 0.9)"}; border: ${point.selected ? 2 : 1}px solid ${color}; border-radius: 8px; padding: 3px 8px; font-size: ${compact ? 10 : 11}px; font-weight: 600; color: #fff; white-space: nowrap;">
            ${point.label} · <span style="color: ${BRAND.lightBlue};">${point.people}</span>
          </div>
        </div>`;

      const link = el.querySelector<HTMLElement>("[data-link]")!;
      const [pinEl, chipEl] = [...el.querySelectorAll<HTMLElement>("[data-hit]")];
      chips.current.set(point.key, {
        pin: pinEl,
        chip: chipEl,
        link,
        people: point.people,
      });
      relayoutChips();

      let downAt: [number, number] | null = null;
      el.querySelectorAll<HTMLElement>("[data-hit]").forEach((hit) => {
        hit.style.pointerEvents = "auto";
        hit.style.cursor = "pointer";
        hit.addEventListener("pointerenter", () => showTooltip(point, pinEl));
        hit.addEventListener("pointerleave", hideTooltip);
        hit.addEventListener("pointerdown", (e) => {
          downAt = [e.clientX, e.clientY];
          e.stopPropagation();
        });
        hit.addEventListener("pointerup", (e) => {
          if (!downAt) return;
          const moved = Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]);
          downAt = null;
          if (moved > 12) return;
          e.stopPropagation();
          if (!selected) {
            // Vue monde : on ouvre la coordination
            const target = COORDINATIONS.find((c) => c.id === point.key);
            if (target) onSelect(target);
            return;
          }
          // On récupère l'intendance d'origine pour conserver ses
          // informations (dont l'appartenance à Abidjan, qui règle le zoom)
          const real = selected.intendances.find((i) => i.name === point.name);
          onSelectIntendance(
            point.selected
              ? null
              : (real ?? {
                  name: point.name,
                  people: point.people,
                  lat: point.lat,
                  lng: point.lng,
                  inAbidjan: point.isCluster,
                })
          );
        });
        hit.addEventListener("click", (e) => e.stopPropagation());
      });
      return el;
    },
    [compact, selected, onSelect, onSelectIntendance, relayoutChips, showTooltip, hideTooltip]
  );

  // Les marqueurs changent (autre coordination, regroupement d'Abidjan) :
  // on repart d'une table propre.
  useEffect(() => {
    chips.current.clear();
  }, [selected, markers.length]);

  return (
    <div ref={wrapperRef} className="absolute inset-0 cursor-grab active:cursor-grabbing">
      {size.width > 0 && (
        <Globe
          ref={globeRef}
          width={size.width}
          height={size.height}
          // Tuiles haute résolution : le fond reste net en zoomant
          globeTileEngineUrl={mapStyle.tileUrl}
          backgroundImageUrl="/textures/night-sky.png"
          atmosphereColor={mapStyle.light ? "#bfe6ff" : "#4db8ff"}
          atmosphereAltitude={0.18}
          polygonsData={features}
          polygonAltitude={(f) => {
            const feature = f as CountryFeature;
            if (feature.__coordination.id === selected?.id) return 0.004;
            return f === hovered ? 0.03 : 0.012;
          }}
          polygonCapColor={(f) => {
            const feature = f as CountryFeature;
            // Coordination ouverte : couleur retirée pour laisser voir le fond
            if (feature.__coordination.id === selected?.id) return "rgba(0, 0, 0, 0)";
            return hexToRgba(
              colorOf(feature.__coordination.people),
              f === hovered ? 0.75 : 0.5
            );
          }}
          polygonSideColor={() => "rgba(255, 255, 255, 0.08)"}
          polygonStrokeColor={(f) => colorOf((f as CountryFeature).__coordination.people)}
          polygonLabel={labelHtml}
          polygonsTransitionDuration={300}
          onPolygonHover={(f) => setHovered((f as CountryFeature) ?? null)}
          onPolygonClick={(f) => onSelect((f as CountryFeature).__coordination)}
          htmlElementsData={markers}
          htmlLat={(d) => (d as MarkerPoint).lat}
          htmlLng={(d) => (d as MarkerPoint).lng}
          htmlAltitude={0.005}
          htmlElement={marker}
          onZoom={(pov) => {
            // setState avec la même valeur : React n'effectue aucun rendu,
            // les marqueurs ne sont donc pas reconstruits pendant la rotation
            const next = pov.altitude > ABIDJAN_SPLIT_ALTITUDE;
            setGrouped((prev) => (prev === next ? prev : next));
            // La caméra a bougé : les étiquettes se réorganisent
            relayoutChips();
          }}
          onGlobeReady={() => {
            const globe = globeRef.current;
            if (!globe) return;
            globe.pointOfView(
              {
                ...INITIAL_VIEW,
                altitude: INITIAL_VIEW.altitude * aspectFactor(wrapperRef.current),
              },
              0
            );
            const controls = globe.controls();
            controls.autoRotate = true;
            controls.autoRotateSpeed = 0.55;
            controls.enableDamping = true;
            controls.minDistance = 101.5;
          }}
        />
      )}

      {/* Infobulle : au-dessus de tous les marqueurs */}
      <div
        ref={tooltipRef}
        className="pointer-events-none absolute z-30 max-w-56 rounded-[10px] border bg-[#050f23]/95 px-3 py-2 text-[#e8f4fd] backdrop-blur-sm"
        style={{ display: "none", borderColor: BRAND.blue }}
      />
    </div>
  );
}
