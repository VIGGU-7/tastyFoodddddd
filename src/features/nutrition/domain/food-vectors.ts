import type { Food } from "./types";

export type FoodVector = Record<string, number>;

/** Use words rather than substrings: a preference for rice must not match licorice. */
export function words(text: string): string[] {
  return text.toLowerCase().match(/[a-z]+/g) || [];
}

export function foodText(food: Food): string {
  return [food.name, food.category, food.cuisine, ...food.ingredients].join(
    " ",
  );
}

/** Fit inverse document frequency on public food descriptions only, never user data. */
export function fitVocabulary(foods: Food[]): FoodVector {
  const counts: FoodVector = {};
  for (const food of foods) {
    for (const word of new Set(words(foodText(food)))) {
      counts[word] = (counts[word] || 0) + 1;
    }
  }
  return Object.fromEntries(
    Object.entries(counts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([word, count]) => [
        word,
        Math.log((1 + foods.length) / (1 + count)) + 1,
      ]),
  );
}

export function vectorize(text: string, vocabulary: FoodVector): FoodVector {
  const vector: FoodVector = {};
  for (const word of words(text)) {
    if (Object.hasOwn(vocabulary, word))
      vector[word] = (vector[word] || 0) + vocabulary[word];
  }
  const length = Math.hypot(...Object.values(vector));
  return length
    ? Object.fromEntries(
        Object.entries(vector).map(([word, weight]) => [word, weight / length]),
      )
    : {};
}

/** Unit vectors make the dot product a cosine similarity, independent of text length. */
export function similarity(left: FoodVector, right: FoodVector): number {
  return Object.entries(left).reduce(
    (total, [word, weight]) => total + weight * (right[word] || 0),
    0,
  );
}

export function matchesPreference(food: Food, preference: string): boolean {
  const tokens = new Set(words(foodText(food)));
  const preferenceWords = words(preference);
  return (
    preferenceWords.length > 0 &&
    preferenceWords.every((word) => tokens.has(word))
  );
}
