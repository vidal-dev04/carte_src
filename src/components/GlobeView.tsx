"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Globe, { GlobeMethods } from "react-globe.gl";
import { COUNTRIES, Country, getStatus } from "@/data/countries";

type CountryFeature = {
  properties: { ADM0_A3: string; ADMIN: string };
  __country: Country;
};

type GlobeViewProps = {
  selected: Country | null;
  onSelect: (country: Country | null) => void;
};

const INITIAL_VIEW = { lat: 15, lng: -10, altitude: 2.2 };

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

export default function GlobeView({ selected, onSelect }: GlobeViewProps) {
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

  // Zoom animé sur le pays sélectionné, pause de la rotation
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;
    const controls = globe.controls();
    const factor = aspectFactor(wrapperRef.current);
    if (selected) {
      controls.autoRotate = false;
      globe.pointOfView(
        {
          lat: selected.lat,
          lng: selected.lng,
          altitude: selected.altitude * factor,
        },
        1200
      );
    } else {
      globe.pointOfView({ ...INITIAL_VIEW, altitude: INITIAL_VIEW.altitude * factor }, 1200);
      controls.autoRotate = true;
    }
  }, [selected]);

  const labelHtml = useMemo(
    () => (feature: object) => {
      const country = (feature as CountryFeature).__country;
      const status = getStatus(country.people);
      return `
        <div style="background: rgba(5, 15, 35, 0.92); border: 1px solid ${status.color}; border-radius: 10px; padding: 8px 12px; font-family: inherit; color: #e8f4fd; max-width: 220px;">
          <div style="font-weight: 700; font-size: 14px;">${country.name}</div>
          <div style="font-size: 13px; margin-top: 2px;">👥 ${country.people} personnes</div>
          <div style="color: ${status.color}; font-weight: 600; font-size: 12px; margin-top: 4px;">● ${status.label}</div>
        </div>`;
    },
    []
  );

  return (
    <div ref={wrapperRef} className="absolute inset-0 cursor-grab active:cursor-grabbing">
      {size.width > 0 && (
        <Globe
          ref={globeRef}
          width={size.width}
          height={size.height}
          globeImageUrl="/textures/earth-blue-marble.jpg"
          bumpImageUrl="/textures/earth-topology.png"
          backgroundImageUrl="/textures/night-sky.png"
          atmosphereColor="#4db8ff"
          atmosphereAltitude={0.18}
          polygonsData={features}
          polygonAltitude={(f) => (f === hovered ? 0.03 : 0.012)}
          polygonCapColor={(f) => {
            const feature = f as CountryFeature;
            const color = getStatus(feature.__country.people).color;
            const active = feature === hovered || feature.__country.id === selected?.id;
            return hexToRgba(color, active ? 0.85 : 0.6);
          }}
          polygonSideColor={() => "rgba(255, 255, 255, 0.08)"}
          polygonStrokeColor={(f) =>
            getStatus((f as CountryFeature).__country.people).color
          }
          polygonLabel={labelHtml}
          polygonsTransitionDuration={300}
          onPolygonHover={(f) => setHovered((f as CountryFeature) ?? null)}
          onPolygonClick={(f) => onSelect((f as CountryFeature).__country)}
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
            controls.minDistance = 120;
          }}
        />
      )}
    </div>
  );
}
