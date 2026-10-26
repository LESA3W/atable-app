// Cooking appliances collected in the Repas flow (kitchen context). Shared by the flow (app/page)
// and the profile page (edit the brand/model later). Stored client-side in localStorage.

export const APPLIANCES = [
  { key: "four", label: "Four", icon: "oven" },
  { key: "microondes", label: "Micro-ondes", icon: "microwave" },
  { key: "plaques", label: "Plaques", icon: "stovetop" },
  { key: "airfryer", label: "Air fryer", icon: "airfryer" },
  { key: "friteuse", label: "Friteuse", icon: "fryer" },
  { key: "blender", label: "Blender", icon: "blender" },
  { key: "cookeo", label: "Cuiseur auto", icon: "cooker" },
  { key: "vorwerk", label: "Vorwerk", icon: "vorwerk" },
  { key: "barbecue", label: "Barbecue", icon: "grill" },
] as const;

export type Appliance = (typeof APPLIANCES)[number]["key"];

export const STYLES_LS = "atable.repas.mealStyles";
export const APPLIANCES_LS = "atable.repas.appliances";
export const DETAIL_LS = "atable.repas.applianceDetail";

// Appliances that vary a lot by brand/model (changes what they can cook): when one is picked, ask
// its brand ("Quelle marque ?") then its model ("Quel modèle ?", the choices depend on the brand),
// and let the user edit it later in the profile. Model lists are best-effort; "Autre" (free text) is
// always offered on both steps so nothing is forced. Stored as "Marque · Modèle".
export type ApplianceBrand = { name: string; models: string[] };
export const APPLIANCE_DETAILS: Record<string, { label: string; brands: ApplianceBrand[] }> = {
  airfryer: {
    label: "Air fryer",
    brands: [
      { name: "Ninja", models: ["Air Fryer AF100", "Foodi Dual Zone AF300", "Foodi Dual Zone AF400", "Foodi MAX", "Flexdrawer"] },
      { name: "Philips", models: ["Airfryer Essential", "Airfryer 3000 Series", "Airfryer 5000 Series", "Airfryer XXL"] },
      { name: "Cosori", models: ["Lite", "Dual Blaze", "TurboBlaze", "Pro II", "Pro LE"] },
      { name: "Moulinex", models: ["Easy Fry", "Easy Fry Dual", "Easy Fry XXL", "Easy Fry Grill"] },
      { name: "Seb", models: ["Actifry", "Actifry Genius+", "Actifry Genius XL"] },
      { name: "Xiaomi", models: ["Smart Air Fryer 4L", "Smart Air Fryer 6.5L", "Air Fryer Pro"] },
    ],
  },
  cookeo: {
    label: "Cuiseur auto",
    brands: [
      { name: "Moulinex", models: ["Cookeo", "Cookeo Touch", "Cookeo Touch WiFi", "Companion", "i-Companion", "Companion XL"] },
      { name: "Instant Pot", models: ["Duo", "Duo Plus", "Pro", "Ultra"] },
      { name: "Ninja", models: ["Foodi", "Foodi MAX", "Foodi 11-en-1"] },
    ],
  },
  vorwerk: {
    label: "Vorwerk",
    brands: [{ name: "Vorwerk", models: ["TM7", "TM6", "TM5", "TM31"] }],
  },
};
