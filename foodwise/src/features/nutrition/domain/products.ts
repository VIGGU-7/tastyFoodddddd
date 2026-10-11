import { Food } from "./types";
import { predictGrade, modelCategory } from "./model";
const aliases: Record<string, string[]> = {
  Milk: ["milk", "lactose", "whey", "casein", "butter", "cheese", "cream"],
  Eggs: ["eggs", "egg"],
  Fish: ["fish", "salmon", "tuna"],
  Peanuts: ["peanuts", "peanut", "groundnut"],
  Soy: ["soy", "soybeans", "soya"],
  Gluten: ["gluten", "wheat", "barley", "rye", "oats"],
  Sesame: ["sesame", "tahini"],
  "Tree nuts": [
    "nuts",
    "almond",
    "almonds",
    "hazelnut",
    "hazelnuts",
    "cashew",
    "cashews",
    "walnut",
    "walnuts",
    "pistachio",
    "pistachios",
    "pecan",
    "pecans",
  ],
  Shellfish: ["crustaceans", "molluscs", "shrimp", "prawn", "crab", "lobster"],
};
export type ProductData = {
  nutriments?: Record<string, number>;
  serving_quantity?: number | string;
  serving_size?: string;
  allergens_tags?: string[];
  traces_tags?: string[];
  ingredients_text?: string;
  product_name?: string;
  categories_tags?: string[];
  ingredients_analysis_tags?: string[];
  nutrition_grades?: string;
  image_front_url?: string;
};
export function normalizeProduct(p: ProductData, barcode: string): Food {
  const n = p.nutriments || {};
  const predicted = predictGrade(n, modelCategory(p.categories_tags));
  const quantity = Number(p.serving_quantity);
  const grams =
    Number.isFinite(quantity) && quantity > 0 && quantity <= 10000
      ? quantity
      : undefined;
  const scale = grams ? grams / 100 : 1;
  const nutrient = (key: string) =>
    Number.isFinite(n[key + "_100g"]) &&
    n[key + "_100g"] >= 0 &&
    n[key + "_100g"] <= (key === "energy-kcal" ? 1000 : 100)
      ? n[key + "_100g"] * scale
      : undefined;
  const tags: string[] = [
    ...(p.allergens_tags || []),
    ...(p.traces_tags || []),
  ];
  const text = (tags.join(" ") + " " + (p.ingredients_text || ""))
    .toLowerCase()
    .replace(/[-_:]/g, " ");
  const allergens = Object.entries(aliases)
    .filter(([, words]) =>
      words.some((word) => new RegExp("\\b" + word + "\\b").test(text)),
    )
    .map(([key]) => key);
  const complete = !!p.ingredients_text && Array.isArray(p.allergens_tags);
  return {
    id: barcode,
    name: p.product_name || "Unnamed product",
    kind: "product",
    category: (p.categories_tags?.[0] || "Packaged food").replace(/^en:/, ""),
    cuisine: "International",
    ingredients: p.ingredients_text ? [p.ingredients_text] : [],
    allergens,
    ingredientsComplete: complete,
    dietVerified: (p.ingredients_analysis_tags || []).some((t: string) =>
      ["en:vegan", "en:vegetarian", "en:non-vegetarian"].includes(t),
    ),
    diet: (p.ingredients_analysis_tags || []).includes("en:vegan")
      ? ["Vegan", "Vegetarian"]
      : (p.ingredients_analysis_tags || []).includes("en:vegetarian")
        ? ["Vegetarian"]
        : [],
    serving: grams
      ? `${p.serving_size || grams + " g"}`
      : "100 g (serving size unavailable)",
    grams: grams || 100,
    nutrients: {
      energy: nutrient("energy-kcal"),
      sugar: nutrient("sugars"),
      carbs: nutrient("carbohydrates"),
      sodium:
        nutrient("sodium") !== undefined
          ? nutrient("sodium")! * 1000
          : undefined,
      saturatedFat: nutrient("saturated-fat"),
      protein: nutrient("proteins"),
      fiber: nutrient("fiber"),
    },
    grade: /^[a-e]$/.test(p.nutrition_grades || "")
      ? p.nutrition_grades
      : predicted?.grade,
    gradeSource: /^[a-e]$/.test(p.nutrition_grades || "")
      ? "source"
      : predicted
        ? "model"
        : undefined,
    modelVersion: predicted?.version,
    image: p.image_front_url,
    source:
      "Open Food Facts — check the physical label for current ingredients",
    sourceUrl: `https://world.openfoodfacts.org/product/${barcode}`,
    estimated: false,
  };
}
