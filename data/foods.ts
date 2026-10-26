import type { Food } from "@/lib/types";

export interface Category {
  id: string;
  label: string;
  emoji: string;
  icon: string; // line icon (in components/Icon) shown instead of the emoji in the UI
}

export const CATEGORIES: Category[] = [
  { id: "viandes", label: "Viandes", emoji: "🥩", icon: "meat" },
  { id: "charcuterie", label: "Charcuterie", emoji: "🥓", icon: "sausage" },
  { id: "poissons", label: "Poissons & fruits de mer", emoji: "🐟", icon: "fish" },
  { id: "legumes", label: "Légumes", emoji: "🥦", icon: "carrot" },
  { id: "feculents", label: "Féculents", emoji: "🥔", icon: "wheat" },
  { id: "laitages", label: "Œufs & laitages", emoji: "🥚", icon: "egg" },
  { id: "fromages", label: "Fromages", emoji: "🧀", icon: "cheese" },
  { id: "fruits", label: "Fruits", emoji: "🍎", icon: "apple" },
  { id: "fruits-secs", label: "Fruits secs & graines", emoji: "🥜", icon: "peanut" },
  { id: "petit-dej", label: "Petit-déjeuner", emoji: "🥐", icon: "croissant" },
  { id: "boulangerie", label: "Pains & viennoiseries", emoji: "🥖", icon: "bread" },
  { id: "boissons", label: "Boissons", emoji: "🥤", icon: "cup" },
  { id: "sucre", label: "Sucré & desserts", emoji: "🍫", icon: "candy" },
  { id: "apero", label: "Apéritif & snacks", emoji: "🥨", icon: "apero" },
  { id: "epices", label: "Herbes & épices", emoji: "🌿", icon: "herb" },
  { id: "extras", label: "Extras & sauces", emoji: "🥫", icon: "sauce" },
  { id: "bio-vegetal", label: "Bio & végétal", emoji: "🌱", icon: "sprout" },
  { id: "plats", label: "Plats complets", emoji: "🍲", icon: "pot" },
  { id: "salades", label: "Salades", emoji: "🥗", icon: "saladbowl" },
  { id: "quiches", label: "Quiches & tartes salées", emoji: "🥧", icon: "pieslice" },
  { id: "soupes", label: "Soupes", emoji: "🍵", icon: "soup" },
];

// Order the taste deck asks about things, most useful first. Rating a whole dish ("lasagnes")
// tells the meal generator far more, far faster, than rating a raw ingredient — so the composite
// categories come first: PLATS, then the starter-ish ones, then desserts, and only after that the
// raw ingredients, with the peripherals (spices, drinks) last. Change the order here and both decks
// follow. Any category missing from this list simply sorts to the end.
export const CATEGORY_ORDER: string[] = [
  // plats
  "plats",
  // entrées
  "salades",
  "soupes",
  "quiches",
  // desserts
  "sucre",
  // then the ingredients
  "viandes",
  "poissons",
  "feculents",
  "legumes",
  "fromages",
  "charcuterie",
  "laitages",
  "fruits",
  "boulangerie",
  "petit-dej",
  "bio-vegetal",
  "fruits-secs",
  "apero",
  "extras",
  "epices",
  "boissons",
];

const CATEGORY_RANK: Record<string, number> = Object.fromEntries(
  CATEGORY_ORDER.map((id, i) => [id, i]),
);

// Sort key for the taste deck. Unknown categories (e.g. a future one) land after the known ones
// instead of jumping to the front.
export function categoryRank(categoryId: string): number {
  return CATEGORY_RANK[categoryId] ?? CATEGORY_ORDER.length;
}

// SECOND sort key, applied inside each category: what French households actually eat most often
// (everyday 2026 eating, not gastronomy). A deck that opens on pizza / pâtes / poulet collects useful
// answers far sooner than one opening on panais / bulots. Anything absent keeps its catalogue order,
// after the ranked ones — so this list only needs the items worth pulling forward.
export const POPULAR_ORDER: string[] = [
  // plats
  "pizza", "bolognaise", "hamburger", "croque-monsieur", "lasagnes", "hachis-parmentier", "quiche",
  "sandwich", "couscous-plat", "tacos", "gratin-pates", "kebab", "sushis", "panini", "curry", "chili",
  "paella", "pot-au-feu", "boeuf-bourguignon", "tartiflette", "choucroute", "cassoulet",
  "nouilles-asiat", "risotto", "burrito", "tajine", "moussaka", "boulettes", "pad-thai",
  "gratin-legumes", "fondue", "brandade", "quenelles", "tomates-farcies", "soupe-veloute",
  // salades
  "sal-verte", "carottes-rapees", "sal-composee", "sal-tomate-mozza", "taboule", "sal-cesar",
  "sal-nicoise", "coleslaw", "sal-pates", "sal-riz", "piemontaise", "macedoine", "sal-betterave",
  "sal-grecque", "sal-chevre-chaud", "sal-lentilles",
  // soupes
  "soupe-legumes", "veloute-tomate", "veloute-potiron", "soupe-poireaux", "veloute-carottes",
  "veloute-champignons", "soupe-oignon", "veloute-courgette", "minestrone", "gaspacho",
  "soupe-poisson", "soupe-asiat",
  // quiches
  "quiche-lorraine", "quiche-poireaux", "quiche-thon", "quiche-3fromages", "quiche-jambon",
  "quiche-saumon", "tarte-legumes", "tarte-oignon", "feuillete", "tourte",
  // sucré / desserts
  "chocolat-tablette", "biscuits", "glace", "compote", "cookies", "creme-dessert", "gateau",
  "tarte-pommes", "mousse-chocolat", "flan", "madeleines", "bonbons", "gaufres", "riz-au-lait",
  "creme-brulee", "tiramisu", "brownie", "speculoos", "macarons",
  // viandes
  "poulet", "steak-hache", "jambon-blanc", "porc", "saucisses", "lardons", "dinde", "steak",
  "merguez", "cordon-bleu", "veau", "agneau", "roti", "nuggets", "canard", "brochettes", "jambon-cru",
  "entrecote", "boudin", "lapin", "bavette", "gigot", "travers-porc", "magret", "paupiettes",
  "pintade", "foie",
  // poissons
  "saumon", "thon", "cabillaud", "poisson-pane", "crevettes", "moules", "saumon-fume", "surimi",
  "truite", "sardines", "lieu", "dorade", "bar", "calamars", "huitres", "gambas", "saint-jacques",
  "sole", "anchois", "crabe", "lotte", "homard", "bulots", "poulpe",
  // féculents
  "pates", "riz", "pommes-de-terre", "pain", "frites", "puree", "semoule", "lentilles",
  "gratin-dauphinois", "ravioli", "gnocchi", "quinoa", "pois-chiches", "haricots-rouges", "boulgour",
  "ble", "polenta", "tortellini", "vermicelles", "flageolets", "haricots-blancs", "pommes-noisettes",
  "sarrasin",
  // légumes
  "tomates", "carottes", "salade-verte", "courgettes", "haricots-verts", "oignons", "poireaux",
  "champignons", "petits-pois", "brocolis", "concombre", "aubergines", "poivrons", "epinards",
  "chou-fleur", "avocat", "mais", "ail", "endives", "betterave", "ratatouille", "courge", "asperges",
  "radis", "navet", "echalote", "celeri", "fenouil", "choux-bruxelles", "patate-douce", "butternut",
  "blette", "chou-rouge", "chou-blanc", "mache", "roquette", "artichaut", "panais", "feves",
  "chou-kale", "germes-soja", "chou-romanesco",
  // fromages
  "fromage-rape", "gruyere", "comte", "raclette", "cheddar", "vache-qui-rit", "kiri", "babybel",
  "boursin", "parmesan", "tomme", "cantal", "gouda", "reblochon", "saint-nectaire", "mascarpone",
  "beaufort", "ricotta", "munster", "maroilles",
  // charcuterie
  "saucisson-sec", "chorizo", "pate", "rillettes", "bacon", "knacki", "chipolatas",
  "saucisse-toulouse", "rosette", "mortadelle", "salami", "coppa", "chair-saucisse", "boudin-blanc",
  "jambonneau", "andouillette", "pate-croute",
  // œufs & laitages
  "oeufs", "yaourt", "creme-fraiche", "camembert", "omelette", "fromage-blanc", "mozzarella",
  "chevre", "yaourt-fruits", "petit-suisse", "creme-liquide", "fromage-dur", "feta", "bleu",
  "yaourt-grec", "skyr", "fromage-frais", "faisselle",
  // fruits
  "pomme", "banane", "orange", "fraises", "raisin", "peche", "poire", "melon", "kiwi", "ananas",
  "citron", "mangue", "cerises", "fruits-rouges", "prune", "pamplemousse", "citron-vert", "figue",
  "grenade", "litchi", "rhubarbe", "mures", "cassis", "groseille", "fruit-passion",
];

const POPULAR_RANK: Record<string, number> = Object.fromEntries(
  POPULAR_ORDER.map((id, i) => [id, i]),
);

export function popularityRank(foodId: string): number {
  return POPULAR_RANK[foodId] ?? Number.MAX_SAFE_INTEGER;
}

// "Précision à la demande": an OPTIONAL nuance on a food. For foods in these categories, the taste
// page lets you say you like the food but not in a given FORM (cherry yes, cherry yogurt no). The
// base like/meh/dislike stays fast; forms open only if the person taps "préciser". Stored under
// `${foodId}#${key}` in the same preferences map — no schema change.
export type Variant = { key: string; label: string };
export const VARIANTS_BY_CAT: Record<string, Variant[]> = {
  fruits: [
    { key: "nature", label: "Nature (frais)" },
    { key: "yaourt", label: "En yaourt" },
    { key: "compote", label: "En compote" },
    { key: "gateau", label: "En gâteau / tarte" },
    { key: "bonbon", label: "En bonbon" },
    { key: "jus", label: "En jus / smoothie" },
    { key: "glace", label: "En glace / sorbet" },
  ],
  legumes: [
    { key: "cru", label: "Cru" },
    { key: "cuit", label: "Cuit (vapeur / bouilli)" },
    { key: "poele", label: "Poêlé / sauté" },
    { key: "soupe", label: "En soupe / velouté" },
    { key: "gratin", label: "En gratin" },
    { key: "puree", label: "En purée" },
  ],
  viandes: [
    { key: "grille", label: "Grillé / poêlé" },
    { key: "mijote", label: "Mijoté / en sauce" },
    { key: "pane", label: "Pané / frit" },
    { key: "hache", label: "Haché / boulettes" },
    { key: "roti", label: "Rôti / au four" },
  ],
  poissons: [
    { key: "nature", label: "Grillé / nature" },
    { key: "pane", label: "Pané / frit" },
    { key: "sauce", label: "En sauce" },
    { key: "cru", label: "Cru (sushi / tartare)" },
    { key: "fume", label: "Fumé" },
  ],
  feculents: [
    { key: "nature", label: "Nature" },
    { key: "gratin", label: "Gratiné" },
    { key: "salade", label: "En salade" },
    { key: "poele", label: "Poêlé / sauté" },
  ],
  fromages: [
    { key: "nature", label: "Nature" },
    { key: "fondu", label: "Fondu / gratiné" },
    { key: "sauce", label: "En sauce" },
  ],
  laitages: [
    { key: "nature", label: "Nature" },
    { key: "sucre", label: "Sucré / aromatisé" },
  ],
};
export function variantsFor(categoryId: string): Variant[] {
  return VARIANTS_BY_CAT[categoryId] ?? [];
}

export const FOODS: Food[] = [
  // Viandes
  { id: "poulet", label: "Poulet", category: "viandes" },
  { id: "dinde", label: "Dinde", category: "viandes" },
  { id: "steak-hache", label: "Steak haché / bœuf", category: "viandes" },
  { id: "steak", label: "Steak (pièce de bœuf)", category: "viandes" },
  { id: "veau", label: "Veau", category: "viandes" },
  { id: "porc", label: "Porc", category: "viandes" },
  { id: "agneau", label: "Agneau / mouton", category: "viandes" },
  { id: "lapin", label: "Lapin", category: "viandes" },
  { id: "canard", label: "Canard", category: "viandes" },
  { id: "saucisses", label: "Saucisses", category: "viandes" },
  { id: "merguez", label: "Merguez", category: "viandes" },
  { id: "jambon-blanc", label: "Jambon blanc", category: "viandes" },
  { id: "jambon-cru", label: "Jambon cru / charcuterie", category: "viandes" },
  { id: "lardons", label: "Lardons", category: "viandes" },
  { id: "boudin", label: "Boudin noir", category: "viandes" },
  { id: "foie", label: "Foie / abats", category: "viandes" },
  { id: "cordon-bleu", label: "Cordon bleu", category: "viandes" },
  { id: "nuggets", label: "Nuggets / poulet pané", category: "viandes" },

  // Poissons & fruits de mer
  { id: "saumon", label: "Saumon", category: "poissons" },
  { id: "thon", label: "Thon", category: "poissons" },
  { id: "cabillaud", label: "Cabillaud / colin", category: "poissons" },
  { id: "poisson-pane", label: "Poisson pané", category: "poissons" },
  { id: "truite", label: "Truite", category: "poissons" },
  { id: "sardines", label: "Sardines / maquereau", category: "poissons" },
  { id: "crevettes", label: "Crevettes", category: "poissons" },
  { id: "moules", label: "Moules", category: "poissons" },
  { id: "huitres", label: "Huîtres", category: "poissons" },
  { id: "calamars", label: "Calamars", category: "poissons" },
  { id: "surimi", label: "Surimi", category: "poissons" },

  // Légumes
  { id: "tomates", label: "Tomates", category: "legumes" },
  { id: "carottes", label: "Carottes", category: "legumes" },
  { id: "haricots-verts", label: "Haricots verts", category: "legumes" },
  { id: "petits-pois", label: "Petits pois", category: "legumes" },
  { id: "courgettes", label: "Courgettes", category: "legumes" },
  { id: "aubergines", label: "Aubergines", category: "legumes" },
  { id: "brocolis", label: "Brocolis", category: "legumes" },
  { id: "chou-fleur", label: "Chou-fleur", category: "legumes" },
  { id: "choux-bruxelles", label: "Choux de Bruxelles", category: "legumes" },
  { id: "epinards", label: "Épinards", category: "legumes" },
  { id: "poireaux", label: "Poireaux", category: "legumes" },
  { id: "champignons", label: "Champignons", category: "legumes" },
  { id: "poivrons", label: "Poivrons", category: "legumes" },
  { id: "salade-verte", label: "Salade verte", category: "legumes" },
  { id: "concombre", label: "Concombre", category: "legumes" },
  { id: "avocat", label: "Avocat", category: "legumes" },
  { id: "mais", label: "Maïs", category: "legumes" },
  { id: "betterave", label: "Betterave", category: "legumes" },
  { id: "ratatouille", label: "Ratatouille", category: "legumes" },
  { id: "endives", label: "Endives", category: "legumes" },
  { id: "asperges", label: "Asperges", category: "legumes" },
  { id: "courge", label: "Courge / potiron", category: "legumes" },
  { id: "oignons", label: "Oignons", category: "legumes" },
  { id: "ail", label: "Ail", category: "legumes" },

  // Féculents
  { id: "pates", label: "Pâtes", category: "feculents" },
  { id: "riz", label: "Riz", category: "feculents" },
  { id: "pommes-de-terre", label: "Pommes de terre", category: "feculents" },
  { id: "puree", label: "Purée", category: "feculents" },
  { id: "frites", label: "Frites", category: "feculents" },
  { id: "gratin-dauphinois", label: "Gratin dauphinois", category: "feculents" },
  { id: "semoule", label: "Semoule / couscous", category: "feculents" },
  { id: "quinoa", label: "Quinoa", category: "feculents" },
  { id: "lentilles", label: "Lentilles", category: "feculents" },
  { id: "pois-chiches", label: "Pois chiches", category: "feculents" },
  { id: "haricots-rouges", label: "Haricots rouges", category: "feculents" },
  { id: "pain", label: "Pain", category: "feculents" },
  { id: "polenta", label: "Polenta", category: "feculents" },

  // Œufs & laitages
  { id: "oeufs", label: "Œufs", category: "laitages" },
  { id: "omelette", label: "Omelette", category: "laitages" },
  { id: "yaourt", label: "Yaourt nature", category: "laitages" },
  { id: "fromage-blanc", label: "Fromage blanc", category: "laitages" },
  { id: "fromage-dur", label: "Fromage à pâte dure (comté, emmental)", category: "laitages" },
  { id: "camembert", label: "Camembert / brie", category: "laitages" },
  { id: "chevre", label: "Chèvre", category: "laitages" },
  { id: "bleu", label: "Bleu / roquefort", category: "laitages" },
  { id: "mozzarella", label: "Mozzarella", category: "laitages" },
  { id: "feta", label: "Feta", category: "laitages" },

  // Plats complets
  { id: "pizza", label: "Pizza", category: "plats" },
  { id: "lasagnes", label: "Lasagnes", category: "plats" },
  { id: "hamburger", label: "Hamburger", category: "plats" },
  { id: "tacos", label: "Tacos / wraps", category: "plats" },
  { id: "quiche", label: "Quiche", category: "plats" },
  { id: "croque-monsieur", label: "Croque-monsieur", category: "plats" },
  { id: "hachis-parmentier", label: "Hachis parmentier", category: "plats" },
  { id: "gratin-pates", label: "Gratin de pâtes", category: "plats" },
  { id: "curry", label: "Curry", category: "plats" },
  { id: "chili", label: "Chili con carne", category: "plats" },
  { id: "couscous-plat", label: "Couscous (plat)", category: "plats" },
  { id: "paella", label: "Paella", category: "plats" },
  { id: "sushis", label: "Sushis", category: "plats" },
  { id: "soupe-veloute", label: "Soupe / velouté", category: "plats" },
  { id: "tartiflette", label: "Tartiflette / raclette", category: "plats" },
  { id: "pot-au-feu", label: "Pot-au-feu / blanquette", category: "plats" },
  { id: "bolognaise", label: "Bolognaise", category: "plats" },
  { id: "risotto", label: "Risotto", category: "plats" },
  { id: "nouilles-asiat", label: "Nouilles asiatiques (wok)", category: "plats" },
  { id: "burrito", label: "Burrito / mexicain", category: "plats" },

  // Fruits
  { id: "pomme", label: "Pomme", category: "fruits" },
  { id: "banane", label: "Banane", category: "fruits" },
  { id: "orange", label: "Orange / clémentine", category: "fruits" },
  { id: "fraises", label: "Fraises", category: "fruits" },
  { id: "raisin", label: "Raisin", category: "fruits" },
  { id: "kiwi", label: "Kiwi", category: "fruits" },
  { id: "ananas", label: "Ananas", category: "fruits" },
  { id: "melon", label: "Melon / pastèque", category: "fruits" },
  { id: "peche", label: "Pêche / abricot", category: "fruits" },
  { id: "poire", label: "Poire", category: "fruits" },
  { id: "mangue", label: "Mangue", category: "fruits" },
  { id: "fruits-rouges", label: "Fruits rouges (framboise, myrtille)", category: "fruits" },

  // Extras & sauces
  { id: "epice", label: "Plats épicés / piquants", category: "extras" },
  { id: "sauce-tomate", label: "Sauce tomate", category: "extras" },
  { id: "mayonnaise", label: "Mayonnaise", category: "extras" },
  { id: "moutarde", label: "Moutarde", category: "extras" },
  { id: "bechamel", label: "Béchamel / sauce crème", category: "extras" },
  { id: "curry-coco", label: "Plats au curry / coco", category: "extras" },
  { id: "dessert-chocolat", label: "Desserts au chocolat", category: "extras" },
  { id: "crepes", label: "Crêpes / pancakes", category: "extras" },

  // Salades
  { id: "sal-verte", label: "Salade verte (laitue nature)", category: "salades" },
  { id: "sal-composee", label: "Salade composée / mêlée", category: "salades" },
  { id: "sal-cesar", label: "Salade César (poulet, parmesan)", category: "salades" },
  { id: "taboule", label: "Taboulé", category: "salades" },
  { id: "sal-pates", label: "Salade de pâtes", category: "salades" },
  { id: "sal-riz", label: "Salade de riz", category: "salades" },
  { id: "piemontaise", label: "Piémontaise (patate-mayo)", category: "salades" },
  { id: "coleslaw", label: "Coleslaw (chou-carotte)", category: "salades" },
  { id: "sal-tomate-mozza", label: "Tomates-mozzarella", category: "salades" },
  { id: "sal-nicoise", label: "Niçoise (thon-œuf)", category: "salades" },
  { id: "sal-grecque", label: "Grecque (feta-concombre)", category: "salades" },
  { id: "carottes-rapees", label: "Carottes râpées", category: "salades" },
  { id: "sal-betterave", label: "Salade de betterave", category: "salades" },
  { id: "sal-lentilles", label: "Salade de lentilles", category: "salades" },
  { id: "macedoine", label: "Macédoine", category: "salades" },
  { id: "sal-chevre-chaud", label: "Chèvre chaud", category: "salades" },

  // Quiches & tartes salées
  { id: "quiche-lorraine", label: "Quiche lorraine (lardons)", category: "quiches" },
  { id: "quiche-poireaux", label: "Quiche aux poireaux", category: "quiches" },
  { id: "quiche-3fromages", label: "Quiche 3 fromages", category: "quiches" },
  { id: "quiche-thon", label: "Quiche thon-tomate", category: "quiches" },
  { id: "quiche-saumon", label: "Quiche saumon-épinards", category: "quiches" },
  { id: "tarte-legumes", label: "Tarte aux légumes / courgettes", category: "quiches" },
  { id: "tarte-oignon", label: "Tarte à l'oignon", category: "quiches" },
  { id: "feuillete", label: "Feuilleté / friand", category: "quiches" },
  { id: "tourte", label: "Tourte (viande)", category: "quiches" },
  { id: "quiche-jambon", label: "Quiche jambon-fromage", category: "quiches" },

  // Soupes
  { id: "soupe-legumes", label: "Soupe de légumes (mélange)", category: "soupes" },
  { id: "veloute-tomate", label: "Velouté de tomate", category: "soupes" },
  { id: "veloute-potiron", label: "Velouté potiron / courge", category: "soupes" },
  { id: "soupe-poireaux", label: "Poireaux-pommes de terre", category: "soupes" },
  { id: "veloute-champignons", label: "Velouté de champignons", category: "soupes" },
  { id: "soupe-oignon", label: "Soupe à l'oignon (gratinée)", category: "soupes" },
  { id: "minestrone", label: "Minestrone (légumes-pâtes)", category: "soupes" },
  { id: "veloute-carottes", label: "Velouté de carottes", category: "soupes" },
  { id: "veloute-courgette", label: "Velouté courgette / brocoli", category: "soupes" },
  { id: "gaspacho", label: "Gaspacho (froid)", category: "soupes" },
  { id: "soupe-poisson", label: "Soupe de poisson", category: "soupes" },
  { id: "soupe-asiat", label: "Soupe asiatique (pho / ramen)", category: "soupes" },

  // ===== Common French supermarket items (Carrefour / Super U / Leclerc) =====

  // Charcuterie
  { id: "saucisson-sec", label: "Saucisson sec", category: "charcuterie" },
  { id: "chorizo", label: "Chorizo", category: "charcuterie" },
  { id: "rosette", label: "Rosette", category: "charcuterie" },
  { id: "pate", label: "Pâté de campagne", category: "charcuterie" },
  { id: "rillettes", label: "Rillettes", category: "charcuterie" },
  { id: "mortadelle", label: "Mortadelle", category: "charcuterie" },
  { id: "bacon", label: "Bacon", category: "charcuterie" },
  { id: "knacki", label: "Knacki", category: "charcuterie" },
  { id: "chipolatas", label: "Chipolatas", category: "charcuterie" },
  { id: "coppa", label: "Coppa", category: "charcuterie" },
  { id: "salami", label: "Salami", category: "charcuterie" },
  { id: "andouillette", label: "Andouillette", category: "charcuterie" },
  { id: "pate-croute", label: "Pâté en croûte", category: "charcuterie" },
  { id: "jambonneau", label: "Jambonneau", category: "charcuterie" },
  { id: "boudin-blanc", label: "Boudin blanc", category: "charcuterie" },
  { id: "saucisse-toulouse", label: "Saucisse de Toulouse", category: "charcuterie" },
  { id: "chair-saucisse", label: "Chair à saucisse", category: "charcuterie" },

  // Fromages
  { id: "reblochon", label: "Reblochon", category: "fromages" },
  { id: "raclette", label: "Raclette", category: "fromages" },
  { id: "munster", label: "Munster", category: "fromages" },
  { id: "cantal", label: "Cantal", category: "fromages" },
  { id: "tomme", label: "Tomme de Savoie", category: "fromages" },
  { id: "comte", label: "Comté", category: "fromages" },
  { id: "beaufort", label: "Beaufort", category: "fromages" },
  { id: "gruyere", label: "Gruyère", category: "fromages" },
  { id: "saint-nectaire", label: "Saint-Nectaire", category: "fromages" },
  { id: "boursin", label: "Boursin", category: "fromages" },
  { id: "vache-qui-rit", label: "Vache qui rit", category: "fromages" },
  { id: "kiri", label: "Kiri", category: "fromages" },
  { id: "babybel", label: "Babybel", category: "fromages" },
  { id: "gouda", label: "Gouda", category: "fromages" },
  { id: "cheddar", label: "Cheddar", category: "fromages" },
  { id: "parmesan", label: "Parmesan", category: "fromages" },
  { id: "ricotta", label: "Ricotta", category: "fromages" },
  { id: "mascarpone", label: "Mascarpone", category: "fromages" },
  { id: "maroilles", label: "Maroilles", category: "fromages" },
  { id: "fromage-rape", label: "Fromage râpé", category: "fromages" },

  // Petit-déjeuner
  { id: "cereales", label: "Céréales", category: "petit-dej" },
  { id: "muesli", label: "Muesli", category: "petit-dej" },
  { id: "granola", label: "Granola", category: "petit-dej" },
  { id: "confiture", label: "Confiture", category: "petit-dej" },
  { id: "miel", label: "Miel", category: "petit-dej" },
  { id: "pate-tartiner", label: "Pâte à tartiner", category: "petit-dej" },
  { id: "beurre", label: "Beurre", category: "petit-dej" },
  { id: "biscottes", label: "Biscottes", category: "petit-dej" },
  { id: "brioche", label: "Brioche", category: "petit-dej" },
  { id: "pain-de-mie", label: "Pain de mie", category: "petit-dej" },
  { id: "chocolat-poudre", label: "Chocolat en poudre", category: "petit-dej" },
  { id: "flocons-avoine", label: "Flocons d'avoine", category: "petit-dej" },
  { id: "beurre-cacahuete", label: "Beurre de cacahuète", category: "petit-dej" },
  { id: "sirop-erable", label: "Sirop d'érable", category: "petit-dej" },

  // Pains & viennoiseries
  { id: "baguette", label: "Baguette", category: "boulangerie" },
  { id: "croissant", label: "Croissant", category: "boulangerie" },
  { id: "pain-chocolat", label: "Pain au chocolat", category: "boulangerie" },
  { id: "chausson-pomme", label: "Chausson aux pommes", category: "boulangerie" },
  { id: "pain-aux-raisins", label: "Pain aux raisins", category: "boulangerie" },
  { id: "pain-complet", label: "Pain complet", category: "boulangerie" },
  { id: "pain-cereales", label: "Pain aux céréales", category: "boulangerie" },
  { id: "pain-campagne", label: "Pain de campagne", category: "boulangerie" },
  { id: "pita", label: "Pain pita", category: "boulangerie" },
  { id: "naan", label: "Naan", category: "boulangerie" },
  { id: "pain-burger", label: "Pains burger", category: "boulangerie" },
  { id: "fougasse", label: "Fougasse", category: "boulangerie" },

  // Boissons
  { id: "jus-orange", label: "Jus d'orange", category: "boissons" },
  { id: "jus-pomme", label: "Jus de pomme", category: "boissons" },
  { id: "jus-multifruits", label: "Jus multifruits", category: "boissons" },
  { id: "lait", label: "Lait", category: "boissons" },
  { id: "soda-cola", label: "Soda / cola", category: "boissons" },
  { id: "limonade", label: "Limonade", category: "boissons" },
  { id: "sirop", label: "Sirop (menthe, grenadine)", category: "boissons" },
  { id: "eau-gazeuse", label: "Eau gazeuse", category: "boissons" },
  { id: "eau-plate", label: "Eau minérale", category: "boissons" },
  { id: "the", label: "Thé", category: "boissons" },
  { id: "cafe", label: "Café", category: "boissons" },
  { id: "chocolat-chaud", label: "Chocolat chaud", category: "boissons" },
  { id: "smoothie", label: "Smoothie", category: "boissons" },
  { id: "biere", label: "Bière", category: "boissons" },
  { id: "vin-rouge", label: "Vin rouge", category: "boissons" },
  { id: "vin-blanc", label: "Vin blanc", category: "boissons" },
  { id: "cidre", label: "Cidre", category: "boissons" },
  { id: "champagne", label: "Champagne / crémant", category: "boissons" },

  // Sucré & desserts
  { id: "chocolat-tablette", label: "Chocolat (tablette)", category: "sucre" },
  { id: "biscuits", label: "Biscuits", category: "sucre" },
  { id: "cookies", label: "Cookies", category: "sucre" },
  { id: "glace", label: "Glace", category: "sucre" },
  { id: "compote", label: "Compote", category: "sucre" },
  { id: "creme-dessert", label: "Crème dessert", category: "sucre" },
  { id: "mousse-chocolat", label: "Mousse au chocolat", category: "sucre" },
  { id: "flan", label: "Flan", category: "sucre" },
  { id: "gaufres", label: "Gaufres", category: "sucre" },
  { id: "madeleines", label: "Madeleines", category: "sucre" },
  { id: "bonbons", label: "Bonbons", category: "sucre" },
  { id: "gateau", label: "Gâteau", category: "sucre" },
  { id: "riz-au-lait", label: "Riz au lait", category: "sucre" },
  { id: "creme-brulee", label: "Crème brûlée", category: "sucre" },
  { id: "tarte-pommes", label: "Tarte aux pommes", category: "sucre" },
  { id: "tiramisu", label: "Tiramisu", category: "sucre" },
  { id: "macarons", label: "Macarons", category: "sucre" },
  { id: "brownie", label: "Brownie", category: "sucre" },
  { id: "speculoos", label: "Spéculoos", category: "sucre" },

  // Apéritif & snacks
  { id: "chips", label: "Chips", category: "apero" },
  { id: "olives", label: "Olives", category: "apero" },
  { id: "crackers", label: "Crackers", category: "apero" },
  { id: "guacamole", label: "Guacamole", category: "apero" },
  { id: "tapenade", label: "Tapenade", category: "apero" },
  { id: "houmous", label: "Houmous", category: "apero" },
  { id: "gressins", label: "Gressins", category: "apero" },
  { id: "tortillas-chips", label: "Tortillas / nachos", category: "apero" },
  { id: "pretzels", label: "Bretzels", category: "apero" },
  { id: "popcorn", label: "Pop-corn", category: "apero" },
  { id: "nems", label: "Nems", category: "apero" },

  // Herbes & épices
  { id: "basilic", label: "Basilic", category: "epices" },
  { id: "persil", label: "Persil", category: "epices" },
  { id: "coriandre", label: "Coriandre", category: "epices" },
  { id: "thym", label: "Thym", category: "epices" },
  { id: "romarin", label: "Romarin", category: "epices" },
  { id: "curcuma", label: "Curcuma", category: "epices" },
  { id: "paprika", label: "Paprika", category: "epices" },
  { id: "cumin", label: "Cumin", category: "epices" },
  { id: "cannelle", label: "Cannelle", category: "epices" },
  { id: "gingembre", label: "Gingembre", category: "epices" },
  { id: "poivre", label: "Poivre", category: "epices" },
  { id: "sel", label: "Sel", category: "epices" },
  { id: "ciboulette", label: "Ciboulette", category: "epices" },
  { id: "menthe", label: "Menthe", category: "epices" },
  { id: "laurier", label: "Laurier", category: "epices" },
  { id: "herbes-provence", label: "Herbes de Provence", category: "epices" },
  { id: "vanille", label: "Vanille", category: "epices" },
  { id: "piment", label: "Piment d'Espelette", category: "epices" },

  // Fruits secs & graines
  { id: "noix", label: "Noix", category: "fruits-secs" },
  { id: "amandes", label: "Amandes", category: "fruits-secs" },
  { id: "noisettes", label: "Noisettes", category: "fruits-secs" },
  { id: "cacahuetes", label: "Cacahuètes", category: "fruits-secs" },
  { id: "pistaches", label: "Pistaches", category: "fruits-secs" },
  { id: "raisins-secs", label: "Raisins secs", category: "fruits-secs" },
  { id: "pruneaux", label: "Pruneaux", category: "fruits-secs" },
  { id: "dattes", label: "Dattes", category: "fruits-secs" },
  { id: "abricots-secs", label: "Abricots secs", category: "fruits-secs" },
  { id: "noix-cajou", label: "Noix de cajou", category: "fruits-secs" },
  { id: "graines-courge", label: "Graines de courge", category: "fruits-secs" },
  { id: "noix-coco", label: "Noix de coco râpée", category: "fruits-secs" },

  // Viandes (suite)
  { id: "roti", label: "Rôti", category: "viandes" },
  { id: "brochettes", label: "Brochettes", category: "viandes" },
  { id: "pintade", label: "Pintade", category: "viandes" },
  { id: "bavette", label: "Bavette", category: "viandes" },
  { id: "entrecote", label: "Entrecôte", category: "viandes" },
  { id: "gigot", label: "Gigot d'agneau", category: "viandes" },
  { id: "travers-porc", label: "Travers de porc", category: "viandes" },
  { id: "paupiettes", label: "Paupiettes", category: "viandes" },
  { id: "magret", label: "Magret de canard", category: "viandes" },

  // Poissons & fruits de mer (suite)
  { id: "saumon-fume", label: "Saumon fumé", category: "poissons" },
  { id: "dorade", label: "Dorade", category: "poissons" },
  { id: "bar", label: "Bar / loup", category: "poissons" },
  { id: "lieu", label: "Lieu noir", category: "poissons" },
  { id: "sole", label: "Sole", category: "poissons" },
  { id: "anchois", label: "Anchois", category: "poissons" },
  { id: "saint-jacques", label: "Noix de Saint-Jacques", category: "poissons" },
  { id: "crabe", label: "Crabe", category: "poissons" },
  { id: "homard", label: "Homard", category: "poissons" },
  { id: "gambas", label: "Gambas", category: "poissons" },
  { id: "bulots", label: "Bulots", category: "poissons" },
  { id: "poulpe", label: "Poulpe", category: "poissons" },
  { id: "lotte", label: "Lotte", category: "poissons" },

  // Légumes (suite)
  { id: "radis", label: "Radis", category: "legumes" },
  { id: "navet", label: "Navet", category: "legumes" },
  { id: "fenouil", label: "Fenouil", category: "legumes" },
  { id: "blette", label: "Blette", category: "legumes" },
  { id: "artichaut", label: "Artichaut", category: "legumes" },
  { id: "celeri", label: "Céleri", category: "legumes" },
  { id: "patate-douce", label: "Patate douce", category: "legumes" },
  { id: "echalote", label: "Échalote", category: "legumes" },
  { id: "chou-rouge", label: "Chou rouge", category: "legumes" },
  { id: "chou-blanc", label: "Chou blanc", category: "legumes" },
  { id: "chou-kale", label: "Chou kale", category: "legumes" },
  { id: "mache", label: "Mâche", category: "legumes" },
  { id: "roquette", label: "Roquette", category: "legumes" },
  { id: "butternut", label: "Courge butternut", category: "legumes" },
  { id: "panais", label: "Panais", category: "legumes" },
  { id: "feves", label: "Fèves", category: "legumes" },
  { id: "germes-soja", label: "Germes de soja", category: "legumes" },
  { id: "chou-romanesco", label: "Chou romanesco", category: "legumes" },

  // Féculents (suite)
  { id: "boulgour", label: "Boulgour", category: "feculents" },
  { id: "gnocchi", label: "Gnocchi", category: "feculents" },
  { id: "ravioli", label: "Raviolis frais", category: "feculents" },
  { id: "ble", label: "Blé / ébly", category: "feculents" },
  { id: "vermicelles", label: "Vermicelles", category: "feculents" },
  { id: "tortellini", label: "Tortellinis", category: "feculents" },
  { id: "flageolets", label: "Flageolets", category: "feculents" },
  { id: "haricots-blancs", label: "Haricots blancs", category: "feculents" },
  { id: "pommes-noisettes", label: "Pommes noisettes", category: "feculents" },
  { id: "sarrasin", label: "Sarrasin", category: "feculents" },

  // Œufs & laitages (suite)
  { id: "petit-suisse", label: "Petit-suisse", category: "laitages" },
  { id: "skyr", label: "Skyr", category: "laitages" },
  { id: "creme-fraiche", label: "Crème fraîche", category: "laitages" },
  { id: "creme-liquide", label: "Crème liquide", category: "laitages" },
  { id: "fromage-frais", label: "Fromage frais", category: "laitages" },
  { id: "yaourt-grec", label: "Yaourt grec", category: "laitages" },
  { id: "yaourt-fruits", label: "Yaourt aux fruits", category: "laitages" },
  { id: "faisselle", label: "Faisselle", category: "laitages" },

  // Fruits (suite)
  { id: "cerises", label: "Cerises", category: "fruits" },
  { id: "prune", label: "Prunes", category: "fruits" },
  { id: "citron", label: "Citron", category: "fruits" },
  { id: "citron-vert", label: "Citron vert", category: "fruits" },
  { id: "pamplemousse", label: "Pamplemousse", category: "fruits" },
  { id: "figue", label: "Figues", category: "fruits" },
  { id: "grenade", label: "Grenade", category: "fruits" },
  { id: "litchi", label: "Litchis", category: "fruits" },
  { id: "rhubarbe", label: "Rhubarbe", category: "fruits" },
  { id: "groseille", label: "Groseilles", category: "fruits" },
  { id: "cassis", label: "Cassis", category: "fruits" },
  { id: "mures", label: "Mûres", category: "fruits" },
  { id: "fruit-passion", label: "Fruit de la passion", category: "fruits" },

  // Extras & sauces (suite)
  { id: "ketchup", label: "Ketchup", category: "extras" },
  { id: "pesto", label: "Pesto", category: "extras" },
  { id: "sauce-soja", label: "Sauce soja", category: "extras" },
  { id: "harissa", label: "Harissa", category: "extras" },
  { id: "sauce-barbecue", label: "Sauce barbecue", category: "extras" },
  { id: "huile-olive", label: "Huile d'olive", category: "extras" },
  { id: "huile-tournesol", label: "Huile de tournesol", category: "extras" },
  { id: "vinaigre", label: "Vinaigre", category: "extras" },
  { id: "vinaigre-balsamique", label: "Vinaigre balsamique", category: "extras" },
  { id: "cornichons", label: "Cornichons", category: "extras" },
  { id: "vinaigrette", label: "Vinaigrette", category: "extras" },
  { id: "sauce-blanche", label: "Sauce blanche", category: "extras" },
  { id: "concentre-tomate", label: "Concentré de tomate", category: "extras" },
  { id: "nuoc-mam", label: "Nuoc-mâm", category: "extras" },
  { id: "farine", label: "Farine", category: "extras" },
  { id: "levure", label: "Levure", category: "extras" },
  { id: "maizena", label: "Maïzena", category: "extras" },
  { id: "pate-feuilletee", label: "Pâte feuilletée", category: "extras" },

  // Plats complets (suite)
  { id: "boeuf-bourguignon", label: "Bœuf bourguignon", category: "plats" },
  { id: "cassoulet", label: "Cassoulet", category: "plats" },
  { id: "choucroute", label: "Choucroute", category: "plats" },
  { id: "fondue", label: "Fondue savoyarde", category: "plats" },
  { id: "gratin-legumes", label: "Gratin de légumes", category: "plats" },
  { id: "brandade", label: "Brandade de morue", category: "plats" },
  { id: "moussaka", label: "Moussaka", category: "plats" },
  { id: "boulettes", label: "Boulettes de viande", category: "plats" },
  { id: "pad-thai", label: "Pad thaï", category: "plats" },
  { id: "tajine", label: "Tajine", category: "plats" },
  { id: "quenelles", label: "Quenelles", category: "plats" },
  { id: "tomates-farcies", label: "Tomates farcies", category: "plats" },
  { id: "kebab", label: "Kebab", category: "plats" },
  { id: "panini", label: "Panini", category: "plats" },
  { id: "sandwich", label: "Sandwich", category: "plats" },

  // Bio & végétal
  { id: "tofu", label: "Tofu", category: "bio-vegetal" },
  { id: "tempeh", label: "Tempeh", category: "bio-vegetal" },
  { id: "seitan", label: "Seitan", category: "bio-vegetal" },
  { id: "steak-vegetal", label: "Steak végétal", category: "bio-vegetal" },
  { id: "galette-vegetale", label: "Galettes végétales", category: "bio-vegetal" },
  { id: "lait-amande", label: "Lait d'amande", category: "bio-vegetal" },
  { id: "lait-soja", label: "Lait de soja", category: "bio-vegetal" },
  { id: "lait-coco", label: "Lait de coco", category: "bio-vegetal" },
  { id: "yaourt-soja", label: "Yaourt au soja", category: "bio-vegetal" },
  { id: "falafel", label: "Falafels", category: "bio-vegetal" },
];

export const FOOD_BY_ID: Record<string, Food> = Object.fromEntries(
  FOODS.map((f) => [f.id, f]),
);

export function foodLabel(id: string): string {
  return FOOD_BY_ID[id]?.label ?? id;
}
