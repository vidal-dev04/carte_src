/**
 * Répartition des membres du Sacerdoce Royal.
 *
 * Deux niveaux :
 *  - Coordination : Côte d'Ivoire (pays d'origine) + les zones à l'étranger
 *  - Intendance   : découpage interne d'une coordination (pour l'instant
 *                   seule la Côte d'Ivoire est détaillée)
 *
 * Pour mettre à jour les effectifs, il suffit de modifier les nombres
 * ci-dessous : les totaux, les tailles des marqueurs et les classements
 * se recalculent automatiquement.
 */

export type Intendance = {
  name: string;
  /** Nom raccourci pour les étiquettes de la carte (le nom complet reste
   *  affiché dans les listes et les infobulles) */
  short?: string;
  people: number;
  lat: number;
  lng: number;
  /** Regroupée avec les autres communes d'Abidjan quand on est dézoomé */
  inAbidjan?: boolean;
};

/** Nom à afficher sur la carte, forcément court */
export function mapLabel(entry: { name: string; short?: string }): string {
  return entry.short ?? entry.name;
}

export type Coordination = {
  /** Code ISO à 3 lettres pour tracer le pays, ou null pour une zone (Afrique) */
  id: string;
  iso: string | null;
  name: string;
  subtitle?: string;
  lat: number;
  lng: number;
  /** Altitude de la caméra lors du zoom (plus grand = plus loin) */
  altitude: number;
  intendances: Intendance[];
  /** Effectif saisi directement quand la coordination n'est pas détaillée */
  declared?: number;
};

const RAW: Coordination[] = [
  {
    id: "CIV",
    iso: "CIV",
    name: "Côte d'Ivoire",
    subtitle: "13 intendances",
    lat: 7.2,
    lng: -5.55,
    // Zoom serré : 9 repères à afficher sans que les étiquettes se marchent dessus
    altitude: 0.34,
    intendances: [
      { name: "Cocody", people: 396, lat: 5.3548, lng: -3.9865, inAbidjan: true },
      { name: "Bingerville", people: 93, lat: 5.3558, lng: -3.8858, inAbidjan: true },
      { name: "Yopougon", people: 88, lat: 5.345, lng: -4.0713, inAbidjan: true },
      { name: "Abobo", people: 43, lat: 5.4227, lng: -4.0206, inAbidjan: true },
      { name: "Marcory", people: 29, lat: 5.2969, lng: -3.9887, inAbidjan: true },
      { name: "San Pedro", people: 50, lat: 4.7485, lng: -6.6363 },
      { name: "Bassam", people: 23, lat: 5.2118, lng: -3.7386 },
      { name: "Agboville et alliés", short: "Agboville", people: 19, lat: 5.928, lng: -4.213 },
      {
        name: "Guiglo et les villes de l'Ouest",
        short: "Guiglo",
        people: 15,
        lat: 6.5441,
        lng: -7.4938,
      },
      {
        name: "Korhogo et les villes du Nord",
        short: "Korhogo",
        people: 13,
        lat: 9.458,
        lng: -5.6296,
      },
      { name: "Bouaké", people: 12, lat: 7.6906, lng: -5.03 },
      {
        name: "Abengourou et les villes de l'Est",
        short: "Abengourou",
        people: 11,
        lat: 6.7297,
        lng: -3.4964,
      },
      {
        name: "Yamoussoukro et alliés",
        short: "Yamoussoukro",
        people: 8,
        lat: 6.8276,
        lng: -5.2893,
      },
    ],
  },
  {
    id: "FRA",
    iso: "FRA",
    name: "France",
    lat: 46.6,
    lng: 2.4,
    altitude: 0.6,
    intendances: [],
    declared: 102,
  },
  {
    id: "CAN",
    iso: "CAN",
    name: "Canada",
    lat: 56.0,
    lng: -96.0,
    altitude: 1.5,
    intendances: [],
    declared: 55,
  },
  {
    id: "USA",
    iso: "USA",
    name: "USA",
    lat: 39.8,
    lng: -98.6,
    altitude: 1.3,
    intendances: [],
    declared: 27,
  },
  {
    id: "AFR",
    iso: null,
    name: "Afrique",
    subtitle: "Autres pays — détail à venir",
    lat: 2.0,
    lng: 17.0,
    altitude: 1.6,
    intendances: [],
    declared: 5,
  },
];

export type CoordinationWithTotal = Coordination & { people: number };

export const COORDINATIONS: CoordinationWithTotal[] = RAW.map((c) => ({
  ...c,
  people: c.intendances.length
    ? c.intendances.reduce((sum, i) => sum + i.people, 0)
    : (c.declared ?? 0),
}));

/**
 * Effectif total de l'église (chiffre de référence).
 * La somme des coordinations ci-dessus vaut 989 : les membres restants
 * ne sont pas encore rattachés à une coordination. L'écart est affiché
 * tel quel et disparaîtra dès que la répartition sera complétée.
 */
export const TOTAL_MEMBERS = 1076;

/** Somme des effectifs effectivement répartis */
export const LISTED_PEOPLE = COORDINATIONS.reduce((sum, c) => sum + c.people, 0);

/** Membres pas encore rattachés à une coordination */
export const UNASSIGNED = Math.max(0, TOTAL_MEMBERS - LISTED_PEOPLE);

/** Part d'un effectif dans le total de l'église */
export function shareOf(people: number): number {
  return people / TOTAL_MEMBERS;
}

/** La plus grande valeur affichée, sert d'échelle aux marqueurs et aux barres */
export const MAX_PEOPLE = Math.max(
  ...COORDINATIONS.map((c) => c.people),
  ...COORDINATIONS.flatMap((c) => c.intendances.map((i) => i.people))
);

/* ------------------------------------------------------------------ *
 *  Abidjan : les communes sont regroupées quand la carte est dézoomée
 * ------------------------------------------------------------------ */

export const ABIDJAN = { name: "Abidjan", lat: 5.348, lng: -3.99, altitude: 0.06 };

/** Altitude de caméra en dessous de laquelle les communes se séparent */
export const ABIDJAN_SPLIT_ALTITUDE = 0.14;

export function intendancesOf(
  coordination: CoordinationWithTotal | null,
  { grouped }: { grouped: boolean }
): Intendance[] {
  if (!coordination) return [];
  if (!grouped) return coordination.intendances;
  const communes = coordination.intendances.filter((i) => i.inAbidjan);
  if (communes.length < 2) return coordination.intendances;
  const total = communes.reduce((sum, i) => sum + i.people, 0);
  return [
    { ...ABIDJAN, people: total, inAbidjan: true },
    ...coordination.intendances.filter((i) => !i.inAbidjan),
  ];
}

/* ------------------------------------------------------------------ *
 *  Apparence
 * ------------------------------------------------------------------ */

/** Couleurs de la charte (logo Sacerdoce Royal) */
export const BRAND = {
  blue: "#29ABE2",
  lightBlue: "#4db8ff",
  gold: "#f5d84a",
};

/**
 * Code couleur par effectif : DÉSACTIVÉ en attendant les nouveaux seuils.
 * Pour le réactiver, passer COLOR_CODING à true et ajuster STATUSES —
 * toute l'interface (marqueurs, listes, légende, affiche) suivra.
 */
export const COLOR_CODING: boolean = false;

export type Status = { label: string; message: string; color: string };

export const STATUSES: { min: number; status: Status }[] = [
  {
    min: 200,
    status: {
      label: "Félicitations !",
      message: "Bravo, objectif atteint. Que Dieu vous bénisse !",
      color: "#22c55e",
    },
  },
  {
    min: 100,
    status: {
      label: "Continuez comme ça",
      message: "Vous êtes sur la bonne voie, persévérez !",
      color: "#3b82f6",
    },
  },
  {
    min: 50,
    status: {
      label: "Je vous encourage",
      message: "Courage, chaque âme compte. On avance !",
      color: "#f97316",
    },
  },
  {
    min: 20,
    status: {
      label: "Vous pouvez faire mieux",
      message: "Encore un effort, le Seigneur compte sur vous.",
      color: "#eab308",
    },
  },
  {
    min: 0,
    status: {
      label: "Réveillez-vous les soldats !",
      message: "Debout ! Il est temps de se mobiliser.",
      color: "#ef4444",
    },
  },
];

export function getStatus(people: number): Status | null {
  if (!COLOR_CODING) return null;
  return (STATUSES.find(({ min }) => people >= min) ?? STATUSES[STATUSES.length - 1])
    .status;
}

/** Couleur d'un effectif : bleu de la charte tant que le code couleur est off */
export function colorOf(people: number): string {
  return getStatus(people)?.color ?? BRAND.blue;
}

/**
 * Taille d'un marqueur : la SURFACE est proportionnelle à l'effectif
 * (racine carrée), c'est la règle de lecture correcte en cartographie.
 */
export function markerSize(people: number, min: number, max: number): number {
  const ratio = Math.sqrt(Math.max(0, people) / MAX_PEOPLE);
  return Math.round(min + (max - min) * ratio);
}

/** Repères de la légende des tailles */
export const SIZE_LEGEND = [400, 100, 10];
