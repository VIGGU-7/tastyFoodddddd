import { Assessment, Food, Profile, Rating } from "./types";
const normal = (v: string) => v.toLowerCase().trim();
export function assess(food: Food, profile?: Profile | null): Assessment {
  const details: string[] = [];
  const result = (
    verdict: Assessment["verdict"],
    reason: string,
  ): Assessment => ({
    verdict,
    reason,
    details,
    personalized: !!profile,
    modelVersion: food.gradeSource === "model" ? food.modelVersion : undefined,
  });
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
  for (const key of ["sugar", "carbs", "sodium", "saturatedFat"] as const) {
    if (limits[key] !== undefined && food.nutrients[key] === undefined)
      return result(
        "Not enough information",
        `Missing ${key} data needed to check your serving limit.`,
      );
    if (limits[key] !== undefined && food.nutrients[key]! > limits[key]!)
      return result(
        "Limit",
        `${key === "saturatedFat" ? "Saturated fat" : key} exceeds your selected per-serving limit.`,
      );
  }
  if (profile?.conditions.includes("Diabetes"))
    details.push(
      "Consider total carbohydrates and your care team’s meal plan; sugar alone does not determine glucose response.",
    );
  if (profile?.conditions.length)
    details.push(
      "Health conditions are context. Condition-specific suitability requires your own care-plan limits.",
    );
  if (
    food.nutrients.sugar === undefined ||
    food.nutrients.carbs === undefined ||
    food.nutrients.sodium === undefined ||
    food.nutrients.saturatedFat === undefined
  )
    return result(
      "Not enough information",
      "Nutrition is incomplete — a reliable assessment is unavailable.",
    );
  if (!food.grade && Object.values(limits).some((v) => v !== undefined))
    return result(
      "Good fit",
      "Within your recorded per-serving nutrient limits.",
    );
  if (!food.grade)
    return result(
      "Not enough information",
      "Nutrition is available, but no validated grade or model assessment is available.",
    );
  if (["d", "e"].includes(food.grade.toLowerCase()))
    return result(
      "Limit",
      "Lower nutrition grade — consider a better-rated alternative.",
    );
  return result(
    "Good fit",
    profile
      ? "Fits your recorded preferences and limits."
      : "Favorable nutrition grade for a general food choice.",
  );
}
function features(food: Food) {
  return [food.cuisine, food.category, ...food.ingredients].map(normal);
}
export function rank(
  foods: Food[],
  profile: Profile | null,
  ratings: Rating[] = [],
) {
  const weights = new Map<string, number>();
  for (const f of [
    ...(profile?.cuisines || []),
    ...(profile?.favorites || []),
  ].filter((f) => f.trim()))
    weights.set(normal(f), 2);
  for (const r of ratings.filter((r) => r.tried)) {
    const food = foods.find((f) => f.id === r.foodId);
    if (food)
      for (const f of features(food))
        weights.set(f, (weights.get(f) || 0) + (r.rating - 3) / 2);
  }
  return foods
    .map((food) => {
      const assessment = assess(food, profile);
      const fs = features(food);
      let taste =
        fs.reduce(
          (s, f) =>
            s +
            [...weights.entries()].reduce(
              (t, [key, w]) => t + (f.includes(key) ? w : 0),
              0,
            ),
          0,
        ) / Math.sqrt(fs.length || 1);
      if (profile?.goal === "More protein")
        taste += (food.nutrients.protein || 0) / 20;
      if (profile?.goal === "More fiber")
        taste += (food.nutrients.fiber || 0) / 10;
      if (profile?.goal === "Less sugar" && food.nutrients.sugar !== undefined)
        taste -= food.nutrients.sugar / 20;
      taste = Math.tanh(taste);
      return {
        food,
        assessment,
        score:
          { "Good fit": 4, Limit: 1, "Not enough information": 0, Avoid: -100 }[
            assessment.verdict
          ] + taste,
      };
    })
    .filter(
      (x) =>
        x.assessment.verdict !== "Avoid" &&
        !profile?.dislikes.some((d) =>
          features(x.food).some((f) => d.trim() && f.includes(normal(d))),
        ),
    )
    .sort((a, b) => b.score - a.score);
}
export function glucoseMgDl(value: number, unit: string) {
  return unit === "mmol/L" ? value * 18.0182 : value;
}
