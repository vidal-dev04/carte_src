export type Status = {
  key: "vert" | "bleu" | "orange" | "jaune" | "rouge";
  label: string;
  message: string;
  color: string;
};

// Seuils modifiables : nombre minimum de personnes pour chaque statut.
// La liste est parcourue de haut en bas, le premier seuil atteint gagne.
// Les mêmes seuils s'appliquent aux pays et aux villes.
export const STATUSES: { min: number; status: Status }[] = [
  {
    min: 200,
    status: {
      key: "vert",
      label: "Félicitations !",
      message: "Bravo, objectif atteint. Que Dieu vous bénisse !",
      color: "#22c55e",
    },
  },
  {
    min: 100,
    status: {
      key: "bleu",
      label: "Continuez comme ça",
      message: "Vous êtes sur la bonne voie, persévérez !",
      color: "#3b82f6",
    },
  },
  {
    min: 50,
    status: {
      key: "orange",
      label: "Je vous encourage",
      message: "Courage, chaque âme compte. On avance !",
      color: "#f97316",
    },
  },
  {
    min: 20,
    status: {
      key: "jaune",
      label: "Vous pouvez faire mieux",
      message: "Encore un effort, le Seigneur compte sur vous.",
      color: "#eab308",
    },
  },
  {
    min: 0,
    status: {
      key: "rouge",
      label: "Réveillez-vous les soldats !",
      message: "Debout ! Il est temps de se mobiliser.",
      color: "#ef4444",
    },
  },
];

export function getStatus(people: number): Status {
  return (STATUSES.find(({ min }) => people >= min) ?? STATUSES[STATUSES.length - 1])
    .status;
}

export type City = {
  name: string;
  people: number;
  lat: number;
  lng: number;
};

export type Country = {
  /** Code ISO utilisé pour retrouver le pays dans le GeoJSON (propriété ADM0_A3) */
  id: string;
  name: string;
  subtitle?: string;
  lat: number;
  lng: number;
  /** Altitude de la caméra lors du zoom (plus grand = plus loin) */
  altitude: number;
  cities: City[];
  /** Somme des effectifs des villes — calculée automatiquement */
  people: number;
};

// Données fictives — à remplacer par les vrais effectifs.
// L'effectif d'un pays est la SOMME de ses villes : il suffit de
// modifier les villes, le total et les couleurs se recalculent.
const RAW_COUNTRIES: Omit<Country, "people">[] = [
  {
    id: "CIV",
    name: "Côte d'Ivoire",
    subtitle: "Abidjan",
    lat: 7.54,
    lng: -5.55,
    altitude: 0.6,
    cities: [
      { name: "Abidjan", people: 120, lat: 5.36, lng: -4.01 },
      { name: "San Pedro", people: 60, lat: 4.75, lng: -6.64 },
      { name: "Bouaké", people: 35, lat: 7.69, lng: -5.03 },
      { name: "Yamoussoukro", people: 15, lat: 6.82, lng: -5.28 },
      { name: "Man", people: 15, lat: 7.41, lng: -7.55 },
    ],
  },
  {
    id: "FRA",
    name: "France",
    subtitle: "Paris",
    lat: 46.6,
    lng: 2.4,
    altitude: 0.6,
    cities: [
      { name: "Paris", people: 70, lat: 48.86, lng: 2.35 },
      { name: "Lyon", people: 30, lat: 45.76, lng: 4.84 },
      { name: "Marseille", people: 22, lat: 43.3, lng: 5.37 },
      { name: "Strasbourg", people: 8, lat: 48.57, lng: 7.75 },
    ],
  },
  {
    id: "CAN",
    name: "Canada",
    subtitle: "Montréal",
    lat: 56.0,
    lng: -96.0,
    altitude: 1.5,
    cities: [
      { name: "Montréal", people: 40, lat: 45.5, lng: -73.57 },
      { name: "Toronto", people: 20, lat: 43.65, lng: -79.38 },
      { name: "Québec", people: 12, lat: 46.81, lng: -71.21 },
    ],
  },
  {
    id: "USA",
    name: "États-Unis",
    subtitle: "New York",
    lat: 39.8,
    lng: -98.6,
    altitude: 1.3,
    cities: [
      { name: "New York", people: 25, lat: 40.71, lng: -74.01 },
      { name: "Washington", people: 8, lat: 38.91, lng: -77.04 },
      { name: "Atlanta", people: 5, lat: 33.75, lng: -84.39 },
    ],
  },
  {
    id: "BEL",
    name: "Belgique",
    subtitle: "Bruxelles",
    lat: 50.6,
    lng: 4.7,
    altitude: 0.4,
    cities: [
      { name: "Bruxelles", people: 8, lat: 50.85, lng: 4.35 },
      { name: "Liège", people: 4, lat: 50.63, lng: 5.57 },
    ],
  },
];

export const COUNTRIES: Country[] = RAW_COUNTRIES.map((c) => ({
  ...c,
  people: c.cities.reduce((sum, city) => sum + city.people, 0),
}));

export const TOTAL_PEOPLE = COUNTRIES.reduce((sum, c) => sum + c.people, 0);
