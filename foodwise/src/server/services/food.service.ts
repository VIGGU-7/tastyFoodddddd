import { z } from "zod";
import { catalog } from "@/features/nutrition/domain/catalog";
import { assess, rank } from "@/features/nutrition/domain/engine";
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
  if (cache) return cache;
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
export function recommendations(owner: string) {
  const records = readRecords(owner);
  const profile =
    records.find((record) => record.kind === "profile")?.payload || null;
  const ratings = records
    .filter((record) => record.kind === "rating")
    .map((record) => record.payload);
  return rank(catalog, profile, ratings);
}
export async function scanFood(code: string, owner?: string) {
  const food = await lookupFood(code);
  const assessment = assess(food, owner ? userProfile(owner) : null);
  if (owner) saveRecord(owner, "scan", { food, assessment });
  return { food, assessment };
}
export async function foodDetails(id: string, owner?: string) {
  const food = catalog.find((food) => food.id === id) || (await lookupFood(id));
  return { food, assessment: assess(food, owner ? userProfile(owner) : null) };
}
