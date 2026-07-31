/**
 * Répartition des membres du Sacerdoce Royal, organisée en arbre :
 *
 *   Monde
 *   ├── Afrique          (coordination)
 *   │   ├── Côte d'Ivoire  → 13 intendances → dont Abidjan → 5 communes
 *   │   └── Sénégal, Guinée, Niger, Bénin, Togo
 *   ├── France, Canada, USA (coordinations)
 *
 * On descend d'un niveau en cliquant sur un repère qui a des sous-unités.
 * Les effectifs des niveaux supérieurs sont la somme de leurs enfants ;
 * seules les feuilles portent un nombre saisi (`declared`).
 *
 * L'évaluation (couleur) est attribuée à la main, elle ne dépend pas
 * du nombre de membres.
 */

/* ------------------------------------------------------------------ *
 *  Évaluation : couleur attribuée à chaque entité
 * ------------------------------------------------------------------ */

export type Evaluation = "vert" | "bleu" | "rouge";

export const EVALUATIONS: Record<
  Evaluation,
  { label: string; short: string; color: string }
> = {
  vert: { label: "Félicitations", short: "Félicitations", color: "#22c55e" },
  bleu: {
    label: "Je vous encourage, vous pouvez faire mieux",
    short: "Je vous encourage",
    color: "#3b82f6",
  },
  rouge: { label: "Réveillez-vous", short: "Réveillez-vous", color: "#ef4444" },
};

/** Ordre d'affichage dans la légende */
export const EVALUATION_ORDER: Evaluation[] = ["vert", "bleu", "rouge"];

/** Gris neutre pour ce qui n'a pas encore été évalué */
export const NOT_RATED = "#94a3b8";

export function colorOf(evaluation?: Evaluation): string {
  return evaluation ? EVALUATIONS[evaluation].color : NOT_RATED;
}

export function labelOf(evaluation?: Evaluation): string | null {
  return evaluation ? EVALUATIONS[evaluation].label : null;
}

/* ------------------------------------------------------------------ *
 *  Arbre des lieux
 * ------------------------------------------------------------------ */

type RawPlace = {
  id: string;
  name: string;
  /** Nom raccourci pour les étiquettes de la carte */
  short?: string;
  /** Code ISO à 3 lettres pour tracer le pays sur le globe */
  iso?: string;
  /** Continent entier à colorer sur le globe (propriété CONTINENT du geojson) */
  continent?: string;
  lat: number;
  lng: number;
  /** Altitude de la caméra quand ce lieu devient le niveau courant */
  altitude: number;
  evaluation?: Evaluation;
  /** Effectif saisi — uniquement sur les feuilles */
  declared?: number;
  children?: RawPlace[];
  /** Nom des sous-unités, pour les libellés */
  unitLabel?: { one: string; many: string };
  /**
   * Ce lieu se déplie tout seul quand la caméra est assez proche
   * (cas d'Abidjan, dont les communes se superposent de loin).
   */
  autoExpand?: boolean;
};

export type Place = Omit<RawPlace, "children"> & {
  people: number;
  children?: Place[];
};

const INTENDANCES = { one: "intendance", many: "intendances" };
// const COMMUNES = { one: "commune", many: "communes" };
const PAYS = { one: "pays", many: "pays" };

const RAW_WORLD: RawPlace = {
  id: "world",
  name: "Monde",
  lat: 15,
  lng: -10,
  altitude: 2.2,
  unitLabel: { one: "coordination", many: "coordinations" },
  children: [
    {
      // La Côte d'Ivoire étant en Afrique, tout le continent forme
      // une seule coordination.
      id: "AFR",
      name: "Afrique",
      // Tout le continent porte la couleur de la coordination
      continent: "Africa",
      // Repère posé sur le Burkina Faso (pays non suivi) : sur la Côte
      // d'Ivoire, il laissait croire que les infos étaient celles du pays.
      lat: 12.3,
      lng: -1.6,
      altitude: 0.9,
      evaluation: "rouge",
      unitLabel: PAYS,
      children: [
        {
          id: "CIV",
          name: "Côte d'Ivoire",
          iso: "CIV",
          lat: 7.2,
          lng: -5.55,
          // Zoom serré : 9 repères sans que les étiquettes se marchent dessus
          altitude: 0.34,
          evaluation: "rouge",
          unitLabel: INTENDANCES,
          children: [
            {
              id: "ABJ",
              name: "Abidjan",
              lat: 5.348,
              lng: -3.99,
              altitude: 0.05,
              // unitLabel: COMMUNES,
              autoExpand: true,
              children: [
                {
                  id: "COC",
                  name: "Cocody",
                  lat: 5.3548,
                  lng: -3.9865,
                  altitude: 0.018,
                  evaluation: "bleu",
                  declared: 396,
                },
                {
                  id: "BGV",
                  name: "Bingerville",
                  lat: 5.3558,
                  lng: -3.8858,
                  altitude: 0.018,
                  evaluation: "bleu",
                  declared: 93,
                },
                {
                  id: "YOP",
                  name: "Yopougon",
                  lat: 5.345,
                  lng: -4.0713,
                  altitude: 0.018,
                  evaluation: "vert",
                  declared: 88,
                },
                // Abobo n'a pas encore reçu d'évaluation
                {
                  id: "ABO",
                  name: "Abobo",
                  lat: 5.4227,
                  lng: -4.0206,
                  altitude: 0.018,
                  declared: 43,
                },
                {
                  id: "MAR",
                  name: "Marcory",
                  lat: 5.2969,
                  lng: -3.9887,
                  altitude: 0.018,
                  evaluation: "bleu",
                  declared: 29,
                },
              ],
            },
            {
              id: "SPD",
              name: "San Pedro",
              lat: 4.7485,
              lng: -6.6363,
              altitude: 0.07,
              evaluation: "vert",
              declared: 50,
            },
            {
              id: "BSM",
              name: "Bassam",
              lat: 5.2118,
              lng: -3.7386,
              altitude: 0.07,
              evaluation: "bleu",
              declared: 23,
            },
            {
              id: "AGB",
              name: "Agboville et alliés",
              short: "Agboville",
              lat: 5.928,
              lng: -4.213,
              altitude: 0.07,
              evaluation: "bleu",
              declared: 19,
            },
            {
              id: "GUI",
              name: "Guiglo et les villes de l'Ouest",
              short: "Guiglo",
              lat: 6.5441,
              lng: -7.4938,
              altitude: 0.07,
              evaluation: "vert",
              declared: 15,
            },
            {
              id: "KOR",
              name: "Korhogo et les villes du Nord",
              short: "Korhogo",
              lat: 9.458,
              lng: -5.6296,
              altitude: 0.07,
              evaluation: "vert",
              declared: 13,
            },
            {
              id: "BKE",
              name: "Bouaké",
              lat: 7.6906,
              lng: -5.03,
              altitude: 0.07,
              evaluation: "rouge",
              declared: 12,
            },
            {
              id: "ABG",
              name: "Abengourou et les villes de l'Est",
              short: "Abengourou",
              lat: 6.7297,
              lng: -3.4964,
              altitude: 0.07,
              evaluation: "bleu",
              declared: 11,
            },
            {
              id: "YAM",
              name: "Yamoussoukro et alliés",
              short: "Yamoussoukro",
              lat: 6.8276,
              lng: -5.2893,
              altitude: 0.07,
              evaluation: "rouge",
              declared: 8,
            },
          ],
        },
        {
          id: "SEN",
          name: "Sénégal",
          iso: "SEN",
          lat: 14.5,
          lng: -14.45,
          altitude: 0.35,
          evaluation: "rouge",
          declared: 1,
        },
        {
          id: "GIN",
          name: "Guinée",
          iso: "GIN",
          lat: 9.95,
          lng: -11.0,
          altitude: 0.35,
          evaluation: "rouge",
          declared: 1,
        },
        {
          id: "NER",
          name: "Niger",
          iso: "NER",
          lat: 17.6,
          lng: 8.08,
          altitude: 0.6,
          evaluation: "rouge",
          declared: 1,
        },
        {
          id: "BEN",
          name: "Bénin",
          iso: "BEN",
          lat: 9.3,
          lng: 2.32,
          altitude: 0.35,
          evaluation: "rouge",
          declared: 1,
        },
        {
          id: "TGO",
          name: "Togo",
          iso: "TGO",
          lat: 8.6,
          lng: 0.82,
          altitude: 0.3,
          evaluation: "rouge",
          declared: 1,
        },
      ],
    },
    {
      id: "FRA",
      name: "France",
      iso: "FRA",
      lat: 46.6,
      lng: 2.4,
      altitude: 0.6,
      evaluation: "bleu",
      declared: 102,
    },
    {
      id: "CAN",
      name: "Canada",
      iso: "CAN",
      lat: 56.0,
      lng: -96.0,
      altitude: 1.5,
      evaluation: "vert",
      declared: 55,
    },
    {
      id: "USA",
      name: "USA",
      iso: "USA",
      lat: 39.8,
      lng: -98.6,
      altitude: 1.3,
      evaluation: "bleu",
      declared: 27,
    },
  ],
};

/** Calcule les effectifs de bas en haut */
function decorate(raw: RawPlace): Place {
  const children = raw.children?.map(decorate);
  const people = children?.length
    ? children.reduce((sum, c) => sum + c.people, 0)
    : (raw.declared ?? 0);
  return { ...raw, children, people };
}

export const WORLD: Place = decorate(RAW_WORLD);

/** Les coordinations, c'est-à-dire le premier niveau */
export const COORDINATIONS: Place[] = WORLD.children ?? [];

/** Tous les lieux de l'arbre, à plat */
export const ALL_PLACES: Place[] = (function flatten(p: Place): Place[] {
  return [p, ...(p.children ?? []).flatMap(flatten)];
})(WORLD);

export function findPlace(id: string): Place | null {
  return ALL_PLACES.find((p) => p.id === id) ?? null;
}

/** Chemin depuis le monde jusqu'à un lieu (fil d'Ariane) */
export function pathTo(id: string): Place[] {
  const walk = (node: Place, trail: Place[]): Place[] | null => {
    const next = [...trail, node];
    if (node.id === id) return next;
    for (const child of node.children ?? []) {
      const found = walk(child, next);
      if (found) return found;
    }
    return null;
  };
  return walk(WORLD, [])?.slice(1) ?? [];
}

/** Lieux dessinés en polygone sur le globe */
export const PLACES_WITH_ISO: Place[] = ALL_PLACES.filter((p) => p.iso);

/** Lieux qui colorent un continent entier (Afrique) */
export const CONTINENT_PLACES: Place[] = ALL_PLACES.filter((p) => p.continent);

/** Vues proposées dans l'aperçu imprimable */
export const OVERVIEW_VIEWS: Place[] = [
  WORLD,
  ...(WORLD.children ?? []).flatMap((c) =>
    // La Côte d'Ivoire mérite sa propre affiche, juste après l'Afrique
    c.id === "AFR"
      ? [c, ...(c.children ?? []).filter((g) => g.children?.length)]
      : [c]
  ),
];

/**
 * Sous-unités d'un lieu. Les nœuds « autoExpand » (Abidjan) sont remplacés
 * par leurs propres enfants dès que la caméra est assez proche.
 */
export function childrenOf(place: Place, { expanded }: { expanded: boolean }): Place[] {
  const children = place.children ?? [];
  if (!expanded) return children;
  return children.flatMap((c) =>
    c.autoExpand && c.children?.length ? c.children : [c]
  );
}

/** Altitude en dessous de laquelle les nœuds « autoExpand » se déplient */
export const AUTO_EXPAND_ALTITUDE = 0.14;

/** Nom à afficher sur la carte, forcément court */
export function mapLabel(place: Place): string {
  return place.short ?? place.name;
}

/** Libellé des sous-unités : « 13 intendances », « 6 pays »… */
export function unitsLabel(place: Place, count: number): string {
  const label = place.unitLabel ?? INTENDANCES;
  return `${count} ${count > 1 ? label.many : label.one}`;
}

/* ------------------------------------------------------------------ *
 *  Totaux
 * ------------------------------------------------------------------ */

/**
 * Effectif total de l'église (chiffre de référence).
 * La somme de l'arbre vaut 989 : les membres restants ne sont pas encore
 * rattachés à une coordination. L'écart est affiché tel quel.
 */
export const TOTAL_MEMBERS = 1076;

/** Somme des effectifs effectivement répartis */
export const LISTED_PEOPLE = WORLD.people;

/** Membres pas encore rattachés à une coordination */
export const UNASSIGNED = Math.max(0, TOTAL_MEMBERS - LISTED_PEOPLE);

/** Part d'un effectif dans le total de l'église */
export function shareOf(people: number): number {
  return people / TOTAL_MEMBERS;
}

/** Reste-t-il des entités sans évaluation ? (pour la légende) */
export const HAS_UNRATED = ALL_PLACES.some(
  (p) => p.id !== "world" && !p.evaluation
);

/* ------------------------------------------------------------------ *
 *  Apparence
 * ------------------------------------------------------------------ */

/** Couleurs de la charte (logo Sacerdoce Royal) */
export const BRAND = {
  blue: "#29ABE2",
  lightBlue: "#4db8ff",
  gold: "#f5d84a",
};
