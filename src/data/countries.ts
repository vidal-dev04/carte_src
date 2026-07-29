export type Status = {
  key: "vert" | "bleu" | "orange" | "jaune" | "rouge";
  label: string;
  message: string;
  color: string;
};

// Seuils modifiables : nombre minimum de personnes pour chaque statut.
// La liste est parcourue de haut en bas, le premier seuil atteint gagne.
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

export type Country = {
  /** Code ISO utilisé pour retrouver le pays dans le GeoJSON (propriété ADM0_A3) */
  id: string;
  name: string;
  subtitle?: string;
  people: number;
  lat: number;
  lng: number;
  /** Altitude de la caméra lors du zoom (plus grand = plus loin) */
  altitude: number;
};

// Données fictives — à remplacer par les vrais effectifs.
export const COUNTRIES: Country[] = [
  {
    id: "CIV",
    name: "Côte d'Ivoire",
    subtitle: "Abidjan",
    people: 245,
    lat: 7.54,
    lng: -5.55,
    altitude: 0.6,
  },
  {
    id: "FRA",
    name: "France",
    subtitle: "Paris",
    people: 130,
    lat: 46.6,
    lng: 2.4,
    altitude: 0.6,
  },
  {
    id: "CAN",
    name: "Canada",
    subtitle: "Montréal",
    people: 72,
    lat: 56.0,
    lng: -96.0,
    altitude: 1.5,
  },
  {
    id: "USA",
    name: "États-Unis",
    subtitle: "New York",
    people: 38,
    lat: 39.8,
    lng: -98.6,
    altitude: 1.3,
  },
  {
    id: "BEL",
    name: "Belgique",
    subtitle: "Bruxelles",
    people: 12,
    lat: 50.6,
    lng: 4.7,
    altitude: 0.4,
  },
];

export const TOTAL_PEOPLE = COUNTRIES.reduce((sum, c) => sum + c.people, 0);
