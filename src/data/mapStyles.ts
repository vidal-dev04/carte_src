export type MapStyle = {
  id: "satellite" | "routes" | "relief";
  label: string;
  hint: string;
  icon: string;
  /** Tuiles servies par ArcGIS Online (mêmes fonds que la plupart des apps de carto) */
  tileUrl: (x: number, y: number, level: number) => string;
  attribution: string;
  /** Fond clair : les contours et l'atmosphère sont adaptés */
  light: boolean;
};

const arcgis = (service: string) => (x: number, y: number, level: number) =>
  `https://server.arcgisonline.com/ArcGIS/rest/services/${service}/MapServer/tile/${level}/${y}/${x}`;

export const MAP_STYLES: MapStyle[] = [
  {
    id: "satellite",
    label: "Satellite",
    hint: "Vue réelle depuis l'espace",
    icon: "🛰️",
    tileUrl: arcgis("World_Imagery"),
    attribution: "Imagerie © Esri, Maxar, Earthstar Geographics",
    light: false,
  },
  {
    id: "routes",
    label: "Routes",
    hint: "Villes, routes et frontières",
    icon: "🛣️",
    tileUrl: arcgis("World_Street_Map"),
    attribution: "Fond de carte © Esri, HERE, Garmin, OpenStreetMap",
    light: true,
  },
  {
    id: "relief",
    label: "Relief",
    hint: "Montagnes et topographie",
    icon: "⛰️",
    tileUrl: arcgis("World_Topo_Map"),
    attribution: "Fond topographique © Esri, USGS, NOAA",
    light: true,
  },
];

export const DEFAULT_STYLE = MAP_STYLES[0];
