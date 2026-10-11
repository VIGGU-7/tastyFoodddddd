import { z } from "zod";
const tags = z.array(z.string().trim().min(1).max(60)).max(30);
export const profileSchema = z.object({
  name: z.string().max(80),
  allergies: tags,
  diet: z.enum(["Any", "Vegetarian", "Vegan", "Gluten-free"]),
  conditions: tags,
  cuisines: tags,
  favorites: tags,
  dislikes: tags,
  goal: z.string().max(120),
  limits: z.object({
    sugar: z.number().min(0).max(500).optional(),
    carbs: z.number().min(0).max(1000).optional(),
    sodium: z.number().min(0).max(20000).optional(),
    saturatedFat: z.number().min(0).max(500).optional(),
  }),
});
export const glucoseSchema = z
  .object({
    value: z.number().positive().max(2000),
    unit: z.enum(["mg/dL", "mmol/L"]),
    timing: z.enum(["fasting", "before-meal", "after-meal"]),
    timestamp: z.string().datetime(),
  })
  .refine(
    (v) => v.unit !== "mmol/L" || v.value <= 111,
    "Check glucose units and value",
  )
  .refine(
    (v) => Date.parse(v.timestamp) <= Date.now() + 60000,
    "Timestamp cannot be in the future",
  );
export const ratingSchema = z.object({
  foodId: z.string().min(1).max(100),
  rating: z.number().int().min(1).max(5),
  tried: z.literal(true),
});
