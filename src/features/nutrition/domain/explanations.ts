import type { Food, Profile } from "./types";

export const nutritionReferences = {
  daily: {
    label: "FDA daily values (general label references)",
    url: "https://www.fda.gov/food/nutrition-facts-label/daily-value-nutrition-and-supplement-facts-labels",
  },
  sugar: {
    label: "FDA: total sugars and added sugars",
    url: "https://www.fda.gov/food/nutrition-facts-label/added-sugars-nutrition-facts-label",
  },
  diabetes: {
    label: "NIDDK: food and diabetes",
    url: "https://www.niddk.nih.gov/health-information/diabetes/overview/healthy-living-with-diabetes",
  },
  heart: {
    label: "NHLBI: heart-healthy foods",
    url: "https://www.nhlbi.nih.gov/health/heart-healthy-living/healthy-foods",
  },
};

export const nutrientLabels = {
  sugar: "Total sugar",
  addedSugar: "Added sugar",
  carbs: "Carbohydrates",
  sodium: "Sodium",
  saturatedFat: "Saturated fat",
  protein: "Protein",
  fiber: "Fiber",
} as const;

export const formatAmount = (value: number) => Number(value.toFixed(1));
export const nutrientUnit = (key: string) => (key === "sodium" ? "mg" : "g");

/** Explain measured nutrients; never treat daily label values as clinical targets. */
export function explainNutrition(food: Food, profile?: Profile | null) {
  const details: string[] = [];
  const high: string[] = [];
  const health: string[] = [];
  const references = [nutritionReferences.daily];
  const quantity = `Per ${food.serving}`;

  for (const [key, daily] of [
    ["sodium", 2300],
    ["saturatedFat", 20],
    ["addedSugar", 50],
  ] as const) {
    const amount = food.nutrients[key];
    if (amount === undefined) continue;
    const percent = Math.round((amount / daily) * 100);
    const isHigh = amount / daily >= 0.2 && food.servingKnown !== false;
    const explanation = `${quantity}: ${formatAmount(amount)} ${nutrientUnit(key)} ${nutrientLabels[key].toLowerCase()} — ${percent}% of the FDA daily value of ${daily} ${nutrientUnit(key)}${isHigh ? "; high for one serving" : ""}.`;
    details.push(explanation);
    if (isHigh) high.push(explanation);
  }
  details.push(
    "Daily values are general label references for adults and children aged 4 and older, based on a 2,000-calorie diet; your needs can differ. This does not measure your total intake today.",
  );

  // Total sugar includes naturally occurring sugar. It has no FDA daily value.
  if (food.nutrients.sugar !== undefined) {
    details.push(
      `${quantity}: ${formatAmount(food.nutrients.sugar)} g total sugar. Total sugar has no FDA daily value${food.nutrients.addedSugar === undefined ? "; added sugar was not supplied, so its daily percentage cannot be calculated" : "; added sugar is listed separately"}.`,
    );
    references.push(nutritionReferences.sugar);
  }

  if (profile?.conditions.includes("Diabetes")) {
    health.push(
      `You recorded diabetes. ${food.nutrients.carbs === undefined ? "Carbohydrate data is missing, so we cannot check it against your meal plan." : `This quantity contains ${formatAmount(food.nutrients.carbs)} g carbohydrates, which can raise blood glucose. Compare the portion with your care-plan carbohydrate target.`}`,
    );
    references.push(nutritionReferences.diabetes);
  }
  for (const [condition, key, explanation] of [
    [
      "High blood pressure",
      "sodium",
      "Reducing sodium can help manage blood pressure.",
    ],
    [
      "High cholesterol",
      "saturatedFat",
      "Limiting saturated fat can help manage LDL cholesterol.",
    ],
  ] as const) {
    if (!profile?.conditions.includes(condition)) continue;
    const amount = food.nutrients[key];
    health.push(
      `You recorded ${condition.toLowerCase()}. ${amount === undefined ? `${nutrientLabels[key]} data is missing.` : `This quantity contains ${formatAmount(amount)} ${nutrientUnit(key)} ${nutrientLabels[key].toLowerCase()}.`} ${explanation} Follow your own care-plan limits.`,
    );
    if (!references.includes(nutritionReferences.heart))
      references.push(nutritionReferences.heart);
  }
  details.push(...health);
  return { details, high, health, references };
}
