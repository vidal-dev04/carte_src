"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Globe, { GlobeMethods } from "react-globe.gl";
import { City, COUNTRIES, Country, getStatus } from "@/data/countries";
import { MapStyle } from "@/data/mapStyles";

type CountryFeature = {
  properties: { ADM0_A3: string; ADMIN: string };
  __country: Country;
};

type CityPoint = City & { __selected: boolean };

type GlobeViewProps = {
  selected: Country | null;
  selectedCity: City | null;
  mapStyle: MapStyle;
  onSelect: (country: Country | null) => void;
  onSelectCity: (city: City | null) => void;
};

const INITIAL_VIEW = { lat: 15, lng: -10, altitude: 2.2 };
/** Altitude de la caméra lors du zoom sur une ville */
const CITY_ALTITUDE = 0.07;

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

export default function GlobeView({
  selected,
  selectedCity,
  mapStyle,
  onSelect,
  onSelectCity,
}: GlobeViewProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [features, setFeatures] = useState<CountryFeature[]>([]);
  const [hovered, setHovered] = useState<CountryFeature | null>(null);

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

  // Charge les frontières et ne garde que les pays suivis
  useEffect(() => {
    fetch("/data/countries.geojson")
      .then((res) => res.json())
      .then((geojson: { features: { properties: { ADM0_A3: string } }[] }) => {
        const byId = new Map(COUNTRIES.map((c) => [c.id, c]));
        const tracked = geojson.features
          .filter((f) => byId.has(f.properties.ADM0_A3))
          .map((f) => ({ ...f, __country: byId.get(f.properties.ADM0_A3)! }));
        setFeatures(tracked as CountryFeature[]);
      });
  }, []);

  // Zoom animé : ville > pays > vue globale, pause de la rotation
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;
    const controls = globe.controls();
    const factor = aspectFactor(wrapperRef.current);
    if (selectedCity) {
      controls.autoRotate = false;
      globe.pointOfView(
        { lat: selectedCity.lat, lng: selectedCity.lng, altitude: CITY_ALTITUDE },
        1200
      );
    } else if (selected) {
      controls.autoRotate = false;
      // En portrait on se rapproche légèrement pour que les
      // étiquettes de villes (taille fixe) restent lisibles.
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
  }, [selected, selectedCity]);

  const labelHtml = useMemo(
    () => (feature: object) => {
      const country = (feature as CountryFeature).__country;
      // Pays déjà sélectionné : pas d'infobulle globale, ce sont les
      // survols des villes qui donnent le détail
      if (country.id === selected?.id) return "";
      const status = getStatus(country.people);
      const cityRows = country.cities
        .map((city) => {
          const cityStatus = getStatus(city.people);
          return `
            <div style="display: flex; align-items: center; gap: 6px; font-size: 11px; margin-top: 3px;">
              <span style="width: 7px; height: 7px; border-radius: 50%; background: ${cityStatus.color}; flex-shrink: 0;"></span>
              <span style="flex: 1;">${city.name}</span>
              <span style="color: ${cityStatus.color}; font-weight: 700;">${city.people}</span>
            </div>`;
        })
        .join("");
      return `
        <div style="background: rgba(5, 15, 35, 0.92); border: 1px solid ${status.color}; border-radius: 10px; padding: 8px 12px; font-family: inherit; color: #e8f4fd; max-width: 220px;">
          <div style="font-weight: 700; font-size: 14px;">${country.name}</div>
          <div style="font-size: 13px; margin-top: 2px;">👥 ${country.people} personnes</div>
          <div style="color: ${status.color}; font-weight: 600; font-size: 12px; margin-top: 4px;">● ${status.label}</div>
          <div style="border-top: 1px solid rgba(255,255,255,0.15); margin-top: 6px; padding-top: 3px;">${cityRows}</div>
        </div>`;
    },
    [selected]
  );

  // Villes du pays sélectionné (nouvelles instances pour que la
  // surbrillance de la ville active soit bien re-rendue)
  const cityPoints = useMemo<CityPoint[]>(
    () =>
      selected
        ? selected.cities.map((city) => ({
            ...city,
            __selected: selectedCity?.name === city.name,
          }))
        : [],
    [selected, selectedCity]
  );

  // Marqueur HTML d'une ville : pastille colorée + étiquette « Ville · effectif ».
  // Cliquable : zoome sur la ville (re-clic = retour à la vue pays).
  // Seuls la pastille et l'étiquette captent les clics (pas les zones
  // transparentes), et un léger glissement de souris/trackpad pendant
  // le clic est toléré (seuil de 12px entre l'appui et le relâchement).
  const compactMarkers = size.width > 0 && size.width < 480;
  const cityMarker = useMemo(
    () => (data: object) => {
      const city = data as CityPoint;
      const status = getStatus(city.people);
      const scale = compactMarkers ? 0.78 : 1;
      const el = document.createElement("div");
      el.style.pointerEvents = "none";
      el.innerHTML = `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translateY(-2px) scale(${scale}); font-family: inherit;">
          <div data-tooltip style="display: none; position: absolute; bottom: calc(100% + 6px); left: 50%; transform: translateX(-50%); background: rgba(5, 15, 35, 0.94); border: 1px solid ${status.color}; border-radius: 10px; padding: 8px 12px; color: #e8f4fd; white-space: nowrap; pointer-events: none; z-index: 50;">
            <div style="font-weight: 700; font-size: 13px;">${city.name}</div>
            <div style="font-size: 12px; margin-top: 2px;">👥 ${city.people} personnes</div>
            <div style="color: ${status.color}; font-weight: 600; font-size: 11px; margin-top: 4px;">● ${status.label}</div>
            <div style="font-size: 10.5px; color: rgba(232,244,253,0.75); margin-top: 2px; max-width: 190px; white-space: normal;">${status.message}</div>
          </div>
          <div data-hit style="padding: 2px 4px 0; filter: drop-shadow(0 0 6px ${status.color}) drop-shadow(0 2px 3px rgba(0,0,0,0.5));">
            <svg width="${city.__selected ? 30 : 24}" height="${city.__selected ? 38 : 30}" viewBox="0 0 24 30">
              <path d="M12 0C5.85 0 1 4.9 1 10.95 1 19.1 12 30 12 30s11-10.9 11-19.05C23 4.9 18.15 0 12 0z" fill="${status.color}" stroke="rgba(255,255,255,0.95)" stroke-width="1.6"/>
              <circle cx="12" cy="10.8" r="4.2" fill="rgba(255,255,255,0.92)"/>
            </svg>
          </div>
          <div data-hit style="margin-top: 3px; background: ${city.__selected ? hexToRgba(status.color, 0.35) : "rgba(4, 10, 24, 0.88)"}; border: ${city.__selected ? 2 : 1}px solid ${status.color}; border-radius: 8px; padding: 3px 8px; font-size: 10.5px; font-weight: 600; color: #fff; white-space: nowrap;">
            ${city.name} · <span style="color: ${status.color};">${city.people}</span>
          </div>
        </div>`;

      const tooltip = el.querySelector<HTMLElement>("[data-tooltip]")!;
      const select = (e: Event) => {
        e.stopPropagation();
        onSelectCity(city.__selected ? null : { ...city });
      };
      let downAt: [number, number] | null = null;
      el.querySelectorAll<HTMLElement>("[data-hit]").forEach((hit) => {
        hit.style.pointerEvents = "auto";
        hit.style.cursor = "pointer";
        hit.addEventListener("pointerenter", () => (tooltip.style.display = "block"));
        hit.addEventListener("pointerleave", () => (tooltip.style.display = "none"));
        hit.addEventListener("pointerdown", (e) => {
          downAt = [e.clientX, e.clientY];
          e.stopPropagation();
        });
        hit.addEventListener("pointerup", (e) => {
          if (!downAt) return;
          const moved = Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]);
          downAt = null;
          if (moved < 12) select(e);
        });
        hit.addEventListener("click", (e) => e.stopPropagation());
      });
      return el;
    },
    [compactMarkers, onSelectCity]
  );

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
            if (feature.__country.id === selected?.id) return 0.004;
            return f === hovered ? 0.03 : 0.012;
          }}
          polygonCapColor={(f) => {
            const feature = f as CountryFeature;
            // Pays sélectionné : couleur retirée pour laisser voir
            // la vue satellite, seul le contour reste
            if (feature.__country.id === selected?.id) return "rgba(0, 0, 0, 0)";
            const color = getStatus(feature.__country.people).color;
            return hexToRgba(color, f === hovered ? 0.85 : 0.6);
          }}
          polygonSideColor={() => "rgba(255, 255, 255, 0.08)"}
          polygonStrokeColor={(f) =>
            getStatus((f as CountryFeature).__country.people).color
          }
          polygonLabel={labelHtml}
          polygonsTransitionDuration={300}
          onPolygonHover={(f) => setHovered((f as CountryFeature) ?? null)}
          onPolygonClick={(f) => onSelect((f as CountryFeature).__country)}
          htmlElementsData={cityPoints}
          htmlLat={(d) => (d as CityPoint).lat}
          htmlLng={(d) => (d as CityPoint).lng}
          htmlAltitude={0.005}
          htmlElement={cityMarker}
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
    </div>
  );
}
