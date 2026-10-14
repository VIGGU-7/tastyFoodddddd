import artifact from "./recommendation-artifact.json";
import { assess } from "./assessment";
import {
  foodText,
  matchesPreference,
  similarity,
  vectorize,
  words,
} from "./food-vectors";
import { formatAmount, nutrientLabels, nutrientUnit } from "./explanations";
import type { Food, Profile, Rating } from "./types";

export const recommendationModel = artifact;

function passesRestrictions(food: Food, profile: Profile | null): boolean {
  if (!profile) return true;
  if (assess(food, profile).verdict === "Avoid") return false;
  if (
    profile.dislikes.some((preference) => matchesPreference(food, preference))
  )
    return false;
  if (profile.allergies.length && !food.ingredientsComplete) return false;
  if (
    profile.diet !== "Any" &&
    (!food.dietVerified || !food.diet.includes(profile.diet))
  )
    return false;
  return Object.entries(profile.limits).every(([key, limit]) => {
    if (limit === undefined) return true;
    const amount = food.nutrients[key as keyof Food["nutrients"]];
    return (
      food.servingKnown !== false && amount !== undefined && amount <= limit
    );
  });
}

/** All nutrient ranking uses 100 g values, so smaller portions do not win by accident. */
function per100(food: Food, key: keyof Food["nutrients"]): number | undefined {
  const value = food.nutrients[key];
  return value !== undefined && food.grams && food.grams > 0
    ? (value * 100) / food.grams
    : undefined;
}

function goalFeature(profile: Profile | null): {
  key: "protein" | "fiber" | "sugar";
  direction: number;
  scale: number;
} | null {
  switch (profile?.goal) {
    case "More protein":
      return { key: "protein", direction: 1, scale: 20 };
    case "More fiber":
      return { key: "fiber", direction: 1, scale: 10 };
    case "Less sugar":
      return { key: "sugar", direction: -1, scale: 20 };
    default:
      return null;
  }
}

/** Rank with a learned food vocabulary and only this account's explicit feedback. */
export function recommend(
  foods: Food[],
  profile: Profile | null,
  ratings: Rating[] = [],
) {
  const encode = (text: string) => vectorize(text, artifact.vocabulary);
  const preferenceVector = encode(
    [...(profile?.cuisines || []), ...(profile?.favorites || [])].join(" "),
  );
  const foodVectors = new Map(
    foods.map((food) => [food.id, encode(foodText(food))]),
  );

  // Only the latest tried rating per food contributes; duplicate history must not amplify taste.
  const latestRatings = new Map<string, Rating>();
  for (const rating of ratings
    .filter((rating) => rating.tried)
    .sort((a, b) => b.createdAt - a.createdAt)) {
    if (!latestRatings.has(rating.foodId))
      latestRatings.set(rating.foodId, rating);
  }

  return foods
    .filter((food) => passesRestrictions(food, profile))
    .map((food) => {
      const assessment = assess(food, profile);
      const vector = foodVectors.get(food.id)!;
      const preference = similarity(vector, preferenceVector);
      const reasons: string[] = [];
      for (const favorite of [
        ...(profile?.cuisines || []),
        ...(profile?.favorites || []),
      ]) {
        if (matchesPreference(food, favorite))
          reasons.push(`Matches your preference for ${favorite}.`);
      }

      let feedback = 0;
      let positiveMatch = false;
      for (const rating of latestRatings.values()) {
        const ratedVector = foodVectors.get(rating.foodId);
        if (!ratedVector) continue;
        const match = similarity(vector, ratedVector);
        feedback += (match * (rating.rating - 3)) / 2;
        if (rating.rating >= 4 && match >= 0.2) positiveMatch = true;
      }
      if (positiveMatch) reasons.push("Similar to foods you rated highly.");
      feedback /= Math.sqrt(latestRatings.size || 1);

      const goal = goalFeature(profile);
      const goalAmount = goal ? per100(food, goal.key) : undefined;
      const goalScore =
        goal && goalAmount !== undefined
          ? goal.direction * Math.tanh(goalAmount / goal.scale)
          : 0;
      if (goal && goalAmount !== undefined)
        reasons.push(
          `${formatAmount(goalAmount)} ${nutrientUnit(goal.key)} ${nutrientLabels[goal.key].toLowerCase()} per 100 g; considered for your ${profile!.goal.toLowerCase()} goal.`,
        );
      if (!reasons.length)
        reasons.push(
          profile
            ? "A starting suggestion; add favorites or tried-food ratings to refine it."
            : "A general suggestion until you save your preferences.",
        );

      // Nutrition is a separate, bounded priority. This score is an ordering value, not a grade or probability.
      const nutritionPriority = {
        "Good fit": 4,
        Limit: 1,
        "Not enough information": 0,
        Avoid: -100,
      }[assessment.verdict];
      return {
        food,
        assessment,
        score:
          nutritionPriority + Math.tanh(preference * 2 + feedback + goalScore),
        reasons,
        recommendationModelVersion: artifact.version,
      };
    })
    .sort((a, b) => b.score - a.score || a.food.id.localeCompare(b.food.id));
}

/** Substitutes need a comparable food role, not just the same cuisine. */
function comparable(source: Food, candidate: Food): boolean {
  if (source.category.toLowerCase() === candidate.category.toLowerCase())
    return true;
  const mainIngredient = words(source.ingredients[0] || "").filter(
    (word) => !["salt", "water", "oil"].includes(word),
  );
  const candidateMain = new Set(words(candidate.ingredients[0] || ""));
  return (
    mainIngredient.length > 0 &&
    mainIngredient.length <= 4 &&
    mainIngredient.some((word) => candidateMain.has(word))
  );
}

export function alternatives(
  source: Food,
  foods: Food[],
  profile: Profile | null,
  ratings: Rating[] = [],
) {
  const originalAssessment = assess(source, profile);
  return recommend(foods, profile, ratings)
    .filter(
      ({ food, assessment }) =>
        food.id !== source.id &&
        comparable(source, food) &&
        food.ingredientsComplete &&
        food.servingKnown !== false &&
        assessment.verdict !== "Limit" &&
        ["sugar", "carbs", "sodium", "saturatedFat"].every(
          (key) => food.nutrients[key as keyof Food["nutrients"]] !== undefined,
        ),
    )
    .flatMap((item) => {
      const reasons: string[] = [];
      if (originalAssessment.verdict === "Avoid")
        reasons.push(
          "Does not share the recorded allergy or diet conflict in this food.",
        );
      const goal = goalFeature(profile);
      // A swap must not worsen a known nutrient relevant to the user's goal or conditions.
      const priorities: {
        key: keyof typeof nutrientLabels;
        higherIsBetter: boolean;
      }[] = [
        ...(goal
          ? [{ key: goal.key, higherIsBetter: goal.direction > 0 }]
          : []),
        ...(profile?.conditions.includes("Diabetes")
          ? [{ key: "carbs" as const, higherIsBetter: false }]
          : []),
        ...(profile?.conditions.includes("High blood pressure")
          ? [{ key: "sodium" as const, higherIsBetter: false }]
          : []),
        ...(profile?.conditions.includes("High cholesterol")
          ? [{ key: "saturatedFat" as const, higherIsBetter: false }]
          : []),
      ];
      if (
        priorities.some(({ key, higherIsBetter }) => {
          const before = per100(source, key);
          const after = per100(item.food, key);
          return (
            before !== undefined &&
            (after === undefined ||
              (higherIsBetter ? after < before : after > before))
          );
        })
      )
        return [];
      const keys = new Set<keyof typeof nutrientLabels>([
        ...(goal ? [goal.key] : []),
        ...(profile?.conditions.includes("Diabetes") ? ["carbs" as const] : []),
        ...(profile?.conditions.includes("High blood pressure")
          ? ["sodium" as const]
          : []),
        ...(profile?.conditions.includes("High cholesterol")
          ? ["saturatedFat" as const]
          : []),
        "sugar",
        "sodium",
        "saturatedFat",
      ]);
      for (const key of keys) {
        const before = per100(source, key);
        const after = per100(item.food, key);
        const higherIsBetter = key === "protein" || key === "fiber";
        if (
          before === undefined ||
          after === undefined ||
          (higherIsBetter ? after <= before : after >= before)
        )
          continue;
        reasons.push(
          `${higherIsBetter ? "More" : "Less"} ${nutrientLabels[key].toLowerCase()}: ${formatAmount(after)} vs ${formatAmount(before)} ${nutrientUnit(key)} per 100 g.`,
        );
      }
      if (!reasons.length) return [];
      return [{ ...item, reasons: [...reasons, ...item.reasons] }];
    })
    .slice(0, 3);
}
