import { z } from "zod";
import { catalog } from "@/features/nutrition/domain/catalog";
import { assess } from "@/features/nutrition/domain/engine";
import {
  alternatives,
  recommend,
} from "@/features/nutrition/domain/recommendation-model";
import {
  normalizeProduct,
  type ProductData,
} from "@/features/nutrition/domain/products";
import type { Food, Profile } from "@/features/nutrition/domain/types";
import {
  cachedProduct,
  cacheProduct,
  readRecords,
  saveRecord,
} from "../repositories/records.repository";
import { HttpError } from "../http/response";
const barcodeSchema = z
  .string()
  .regex(/^\d{8,14}$/, "Enter a barcode with 8–14 digits.");
export async function lookupFood(code: string): Promise<Food> {
  const barcode = barcodeSchema.parse(code);
  const cache = cachedProduct(barcode);
  // Older cache entries lack the explicit serving basis needed for personal limit checks.
  if (cache && cache.servingKnown !== undefined) return cache;
  let response: Response;
  try {
    response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=product_name,nutriments,serving_quantity,serving_size,ingredients_text,allergens_tags,traces_tags,ingredients_analysis_tags,nutrition_grades,image_front_url,categories_tags`,
      {
        headers: { "User-Agent": "Foodwise/2.0 (nutrition education)" },
        signal: AbortSignal.timeout(15000),
        cache: "no-store",
      },
    );
  } catch {
    throw new HttpError(
      502,
      "The food database is taking too long. Please try again.",
    );
  }
  if (!response.ok)
    throw new HttpError(
      502,
      "The food database is unavailable. Please try again.",
    );
  const data = (await response.json()) as {
    status?: number;
    product?: ProductData;
  };
  if (data.status === 0 || !data.product)
    throw new HttpError(
      404,
      "We couldn’t find that product. Check the barcode and try again.",
    );
  const food = normalizeProduct(data.product, barcode);
  cacheProduct(barcode, food);
  return food;
}
export function userProfile(owner: string): Profile | null {
  const record = readRecords(owner).find((record) => record.kind === "profile");
  return record?.payload || null;
}
/** Read a single owner's context; another user's scans never become candidates. */
function recommendationContext(owner?: string) {
  const records = owner ? readRecords(owner) : [];
  const profile =
    records.find((record) => record.kind === "profile")?.payload || null;
  const ratings = records
    .filter((record) => record.kind === "rating")
    .map((record) => record.payload);
  const foods = new Map(catalog.map((food) => [food.id, food]));
  // Records arrive newest first, so keep the most recent label for each scanned product.
  for (const record of records) {
    if (record.kind === "scan" && !foods.has(record.payload.food.id)) {
      const scanned = record.payload.food;
      foods.set(scanned.id, {
        ...scanned,
        servingKnown:
          scanned.servingKnown ??
          !scanned.serving.includes("serving size unavailable"),
      });
    }
  }
  return { profile, ratings, foods: [...foods.values()] };
}
export function recommendations(owner: string) {
  const { foods, profile, ratings } = recommendationContext(owner);
  return recommend(foods, profile, ratings);
}
export async function scanFood(code: string, owner?: string) {
  const food = await lookupFood(code);
  const { foods, profile, ratings } = recommendationContext(owner);
  const assessment = assess(food, profile);
  if (owner) saveRecord(owner, "scan", { food, assessment });
  return {
    food,
    assessment,
    alternatives: owner
      ? alternatives(food, foods, profile, ratings)
      : undefined,
  };
}
export async function foodDetails(id: string, owner?: string) {
  const food = catalog.find((food) => food.id === id) || (await lookupFood(id));
  const { foods, profile, ratings } = recommendationContext(owner);
  return {
    food,
    assessment: assess(food, profile),
    alternatives: owner
      ? alternatives(food, foods, profile, ratings)
      : undefined,
  };
}
