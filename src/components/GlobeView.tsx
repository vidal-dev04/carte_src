"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Globe, { GlobeMethods } from "react-globe.gl";
import {
  AUTO_EXPAND_ALTITUDE,
  BRAND,
  CONTINENT_PLACES,
  PLACES_WITH_ISO,
  Place,
  WORLD,
  childrenOf,
  colorOf,
  labelOf,
  mapLabel,
  pathTo,
  unitsLabel,
} from "@/data/network";
import { MapStyle } from "@/data/mapStyles";

type CountryFeature = {
  properties: { ADM0_A3: string; ADMIN: string; CONTINENT: string };
  __place: Place;
};

type GlobeViewProps = {
  /** Lieu dont on affiche les sous-unités (Monde par défaut) */
  current: Place;
  /** Sous-unité mise en avant (feuille sur laquelle on a zoomé) */
  focus: Place | null;
  mapStyle: MapStyle;
  onOpen: (place: Place) => void;
  onFocus: (place: Place | null) => void;
};

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
  current,
  focus,
  mapStyle,
  onOpen,
  onFocus,
}: GlobeViewProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  /** Étiquettes actuellement à l'écran, pour les écarter les unes des autres */
  const chips = useRef(
    new Map<
      string,
      { pin: HTMLElement; chip: HTMLElement; link: HTMLElement; rank: number }
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
   * de clignotement). On ne retient que l'information utile : les nœuds
   * repliables sont-ils dépliés ou non.
   */
  const [expanded, setExpanded] = useState(false);

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

  // Charge les frontières : pays suivis + continents entiers (Afrique)
  useEffect(() => {
    fetch("/data/countries.geojson")
      .then((res) => res.json())
      .then(
        (geojson: { features: { properties: CountryFeature["properties"] }[] }) => {
          const byIso = new Map(PLACES_WITH_ISO.map((p) => [p.iso!, p]));
          const byContinent = new Map(
            CONTINENT_PLACES.map((p) => [p.continent!, p])
          );
          const tracked = geojson.features
            .map((f) => ({
              ...f,
              __place:
                byIso.get(f.properties.ADM0_A3) ??
                byContinent.get(f.properties.CONTINENT),
            }))
            .filter((f) => f.__place);
          setFeatures(tracked as CountryFeature[]);
        }
      );
  }, []);

  // Zoom animé sur le niveau courant, ou sur la sous-unité mise en avant
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;
    const controls = globe.controls();
    const target = focus ?? current;
    const isWorld = !focus && current.id === "world";
    controls.autoRotate = isWorld;
    const factor = aspectFactor(wrapperRef.current);
    globe.pointOfView(
      {
        lat: target.lat,
        lng: target.lng,
        altitude: target.altitude * (isWorld ? factor : factor > 1 ? 0.9 : 1),
      },
      1200
    );
  }, [current, focus]);

  /** Sous-unités affichées, dépliées si la caméra est assez proche */
  const markers = useMemo(
    () => childrenOf(current, { expanded }),
    [current, expanded]
  );

  /**
   * Chaque pays tracé hérite de la couleur et des infos du repère qui le
   * représente au niveau courant : au niveau monde, toute l'Afrique porte
   * la couleur de la coordination « Afrique », pas celle de chaque pays.
   * Sans représentant (on a zoomé à l'intérieur), le pays reste transparent
   * pour laisser voir le terrain.
   */
  const ownerOf = useMemo(() => {
    const map = new Map<string, Place>();
    for (const p of [...PLACES_WITH_ISO, ...CONTINENT_PLACES]) {
      const trail = pathTo(p.id);
      const owner = markers.find((m) => trail.some((t) => t.id === m.id));
      if (owner) map.set(p.id, owner);
    }
    return map;
  }, [markers]);

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
    (place: Place, pin: HTMLElement) => {
      const tip = tooltipRef.current;
      if (!tip) return;
      const color = colorOf(place.evaluation);
      const evaluation = labelOf(place.evaluation);
      const units = place.children?.length
        ? unitsLabel(place, place.children.length)
        : null;
      hoveredPin.current = pin;
      tip.style.borderColor = color;
      // Détail des sous-unités (5 premières), comme dans la barre latérale
      const rows = (place.children ?? [])
        .slice(0, 5)
        .map(
          (c) => `
            <div style="display: flex; align-items: center; gap: 7px; font-size: 11px; margin-top: 3px;">
              <span style="width: 7px; height: 7px; border-radius: 50%; background: ${colorOf(c.evaluation)}; flex-shrink: 0;"></span>
              <span style="flex: 1;">${c.name}</span>
              <span style="color: ${BRAND.lightBlue}; font-weight: 700;">${c.people}</span>
            </div>`
        )
        .join("");
      const more =
        (place.children?.length ?? 0) > 5
          ? `<div style="font-size: 10px; color: rgba(232,244,253,0.5); margin-top: 4px;">+ ${place.children!.length - 5} autres</div>`
          : "";
      tip.innerHTML = `
        <div style="font-weight: 700; font-size: 13px;">${place.name}</div>
        <div style="font-size: 12px; margin-top: 2px;">👥 ${place.people} membres</div>
        ${
          evaluation
            ? `<div style="font-size: 11.5px; font-weight: 600; margin-top: 5px; color: ${color};">● ${evaluation}</div>`
            : `<div style="font-size: 11px; margin-top: 5px; color: rgba(232,244,253,0.45);">Pas encore évaluée</div>`
        }
        ${rows ? `<div style="border-top: 1px solid rgba(255,255,255,0.15); margin-top: 6px; padding-top: 3px;">${rows}${more}</div>` : ""}
        ${units ? `<div style="font-size: 10.5px; margin-top: 5px; color: ${BRAND.gold};">Cliquez pour voir les ${place.unitLabel?.many ?? "sous-unités"}</div>` : ""}`;
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
   * entités gardent la place sous leur repère.
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
        positionTooltip();
        return;
      }
      entries.forEach(reset);
      // Les repères sont des obstacles fixes
      const taken: Rect[] = entries.map((e) => e.pin.getBoundingClientRect());
      // Les plus gros effectifs choisissent leur place en premier
      [...entries]
        .sort((a, b) => b.rank - a.rank)
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


  // Marqueur : taille fixe (des repères proportionnels masquaient les pays).
  // Cliquable, avec une infobulle au survol.
  const compact = size.width > 0 && size.width < 480;
  const marker = useMemo(
    () => (data: object) => {
      const place = data as Place;
      const color = colorOf(place.evaluation);
      const isSelected = focus?.id === place.id;
      const hasChildren = !!place.children?.length;
      // Seule l'Afrique (continent entier) affiche « 6 pays » : les pays et
      // les villes montrent leur effectif
      const units =
        place.continent && hasChildren
          ? unitsLabel(place, place.children!.length)
          : null;
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
              ${hasChildren ? `<circle cx="12" cy="10.8" r="2" fill="${color}"/>` : ""}
            </svg>
          </div>
          <div data-hit style="margin-top: 2px; background: ${isSelected ? hexToRgba(color, 0.4) : "rgba(4, 10, 24, 0.9)"}; border: ${isSelected ? 2 : 1}px solid ${color}; border-radius: 8px; padding: 3px 8px; font-size: ${compact ? 10 : 11}px; font-weight: 600; color: #fff; white-space: nowrap;">
            ${mapLabel(place)} · ${units ? `<span style="color: ${BRAND.gold};">${units}</span>` : `<span style="color: ${BRAND.lightBlue};">${place.people}</span>`}
          </div>
        </div>`;

      const link = el.querySelector<HTMLElement>("[data-link]")!;
      const [pinEl, chipEl] = [...el.querySelectorAll<HTMLElement>("[data-hit]")];
      chips.current.set(place.id, {
        pin: pinEl,
        chip: chipEl,
        link,
        rank: place.people,
      });
      relayoutChips();

      let downAt: [number, number] | null = null;
      el.querySelectorAll<HTMLElement>("[data-hit]").forEach((hit) => {
        hit.style.pointerEvents = "auto";
        hit.style.cursor = "pointer";
        hit.addEventListener("pointerenter", () => showTooltip(place, pinEl));
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
          hideTooltip();
          // Un lieu qui a des sous-unités : on descend d'un niveau.
          // Sinon on zoome simplement dessus.
          if (hasChildren) onOpen(place);
          else onFocus(isSelected ? null : place);
        });
        hit.addEventListener("click", (e) => e.stopPropagation());
      });
      return el;
    },
    [compact, focus, onOpen, onFocus, relayoutChips, showTooltip, hideTooltip]
  );

  // Le niveau change : on repart d'une table d'étiquettes propre
  useEffect(() => {
    chips.current.clear();
    hideTooltip();
  }, [current, markers.length, hideTooltip]);

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
            if (!ownerOf.has(feature.__place.id)) return 0.004;
            return f === hovered ? 0.03 : 0.012;
          }}
          polygonCapColor={(f) => {
            const feature = f as CountryFeature;
            const owner = ownerOf.get(feature.__place.id);
            // Pas de repère à ce niveau : couleur retirée pour voir le terrain
            if (!owner) return "rgba(0, 0, 0, 0)";
            return hexToRgba(colorOf(owner.evaluation), f === hovered ? 0.75 : 0.5);
          }}
          polygonSideColor={() => "rgba(255, 255, 255, 0.08)"}
          polygonStrokeColor={(f) => {
            const feature = f as CountryFeature;
            const owner = ownerOf.get(feature.__place.id);
            return colorOf((owner ?? feature.__place).evaluation);
          }}
          polygonsTransitionDuration={300}
          onPolygonHover={(f) => {
            // Une seule et même infobulle pour les pays et les repères :
            // le label interne de three-globe faisait doublon avec elle.
            const feature = (f as CountryFeature) ?? null;
            setHovered(feature);
            if (!feature) return hideTooltip();
            const owner = ownerOf.get(feature.__place.id);
            if (!owner) return hideTooltip();
            const pin = chips.current.get(owner.id)?.pin;
            if (pin?.isConnected) showTooltip(owner, pin);
          }}
          onPolygonClick={(f) => {
            const feature = f as CountryFeature;
            const place = ownerOf.get(feature.__place.id);
            if (!place) return;
            if (place.children?.length) onOpen(place);
            else onFocus(place);
          }}
          htmlElementsData={markers}
          htmlLat={(d) => (d as Place).lat}
          htmlLng={(d) => (d as Place).lng}
          htmlAltitude={0.005}
          htmlElement={marker}
          onZoom={(pov) => {
            // setState avec la même valeur : React n'effectue aucun rendu,
            // les marqueurs ne sont donc pas reconstruits pendant la rotation
            const next = pov.altitude <= AUTO_EXPAND_ALTITUDE;
            setExpanded((prev) => (prev === next ? prev : next));
            // La caméra a bougé : les étiquettes se réorganisent
            relayoutChips();
          }}
          onGlobeReady={() => {
            const globe = globeRef.current;
            if (!globe) return;
            globe.pointOfView(
              {
                lat: WORLD.lat,
                lng: WORLD.lng,
                altitude: WORLD.altitude * aspectFactor(wrapperRef.current),
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
        className="pointer-events-none absolute z-30 max-w-60 rounded-[10px] border bg-[#050f23]/95 px-3 py-2 text-[#e8f4fd] backdrop-blur-sm"
        style={{ display: "none", borderColor: BRAND.blue }}
      />
    </div>
  );
}
