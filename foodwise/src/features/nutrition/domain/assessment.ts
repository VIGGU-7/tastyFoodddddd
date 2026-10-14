import type { Assessment, Food, Profile } from "./types";
import {
  explainNutrition,
  formatAmount,
  nutrientLabels,
  nutrientUnit,
} from "./explanations";

const normal = (v: string) => v.toLowerCase().trim();
export function assess(food: Food, profile?: Profile | null): Assessment {
  const explanation = explainNutrition(food, profile);
  const details = [...explanation.details];
  const result = (
    verdict: Assessment["verdict"],
    reason: string,
  ): Assessment => ({
    verdict,
    reason,
    details,
    personalized: !!profile,
    references: explanation.references,
    modelVersion: food.gradeSource === "model" ? food.modelVersion : undefined,
  });
  // Known conflicts always take priority over nutrition and personal taste.
  const conflicts = (profile?.allergies || []).filter((a) =>
    food.allergens.some((b) => normal(b) === normal(a)),
  );
  if (conflicts.length)
    return result(
      "Avoid",
      `Contains ${conflicts.join(", ")} — conflicts with your allergy profile.`,
    );
  if (
    profile?.diet &&
    profile.diet !== "Any" &&
    !food.diet.includes(profile.diet)
  ) {
    if (food.dietVerified)
      return result(
        "Avoid",
        `Does not match your ${profile.diet.toLowerCase()} diet.`,
      );
    return result(
      "Not enough information",
      "Diet compatibility could not be verified.",
    );
  }
  if ((profile?.allergies.length || 0) > 0 && !food.ingredientsComplete)
    return result(
      "Not enough information",
      "Ingredients are incomplete — allergy compatibility is unknown.",
    );
  details.push(
    `Nutrition is shown per ${food.serving}.`,
    food.estimated
      ? "Nutrition is estimated; preparation and portion size can change it."
      : "Nutrition comes from the product source.",
  );
  if (food.grade)
    details.push(
      `Nutrition grade ${food.grade.toUpperCase()} (${food.gradeSource === "model" ? "model estimate" : "source grade"}); this is not a medical safety rating.`,
    );
  const limits = profile?.limits || {};
  // Per-serving limits cannot be compared to a guessed serving size.
  if (
    food.servingKnown === false &&
    Object.values(limits).some((limit) => limit !== undefined)
  )
    return result(
      "Not enough information",
      "Serving size is unavailable — your per-serving limits cannot be checked against 100 g values.",
    );
  for (const key of ["sugar", "carbs", "sodium", "saturatedFat"] as const) {
    if (limits[key] !== undefined && food.nutrients[key] === undefined)
      return result(
        "Not enough information",
        `Missing ${key} data needed to check your serving limit.`,
      );
    if (limits[key] !== undefined && food.nutrients[key]! > limits[key]!)
      return result(
        "Limit",
        `${profile?.conditions.length ? `You recorded ${profile.conditions.join(" and ").toLowerCase()}. ` : ""}${nutrientLabels[key]} ${key === "carbs" ? "are" : "is"} ${formatAmount(food.nutrients[key]!)} ${nutrientUnit(key)} per ${food.serving}, above your saved limit of ${limits[key]} ${nutrientUnit(key)}. Choose a smaller portion or an alternative within your limit.`,
      );
  }
  if (
    food.nutrients.sugar === undefined ||
    food.nutrients.carbs === undefined ||
    food.nutrients.sodium === undefined ||
    food.nutrients.saturatedFat === undefined
  )
    return result(
      "Not enough information",
      `${explanation.health[0] || explanation.high[0] || "Nutrition is incomplete."} A full assessment is unavailable.`,
    );
  if (explanation.high.length)
    return result(
      "Limit",
      [explanation.health[0], explanation.high[0]].filter(Boolean).join(" "),
    );
  if (!food.grade && Object.values(limits).some((v) => v !== undefined))
    return result(
      "Good fit",
      explanation.health[0] ||
        "Within your recorded per-serving nutrient limits.",
    );
  if (!food.grade)
    return result(
      "Not enough information",
      `${explanation.health[0] || explanation.details.find((detail) => detail.includes("total sugar")) || "Nutrition is available."} No nutrition grade is available.`,
    );
  if (["d", "e"].includes(food.grade.toLowerCase()))
    return result(
      "Limit",
      `${explanation.health[0] || explanation.details.find((detail) => detail.includes("total sugar")) || "Lower nutrition grade."} Consider a better-rated alternative.`,
    );
  return result(
    "Good fit",
    explanation.health[0] ||
      (profile
        ? "Fits your recorded restrictions and limits; taste preferences are used separately for recommendations."
        : explanation.details.find((detail) =>
            detail.includes("total sugar"),
          ) || "Favorable nutrition grade for a general food choice."),
  );
}
export function glucoseMgDl(value: number, unit: string) {
  return unit === "mmol/L" ? value * 18.0182 : value;
}
