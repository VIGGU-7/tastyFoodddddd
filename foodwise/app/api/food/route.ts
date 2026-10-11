import { NextRequest, NextResponse } from "next/server";
import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";
import { catalog } from "../../../lib/food/catalog";
import { normalizeProduct } from "../../../lib/food/products";
import {
  profileSchema,
  ratingSchema,
  glucoseSchema,
} from "../../../lib/food/validation";
import { assess, rank } from "../../../lib/food/engine";
import { Profile, Rating } from "../../../lib/food/types";
import { artifact } from "../../../lib/food/model";
export const dynamic = "force-dynamic";
function database() {
  if (!env.DB) throw new Error("Database unavailable");
  return env.DB;
}
const json = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
async function rows(owner: string, kind?: string) {
  return database()
    .prepare(
      `SELECT id,kind,payload,created_at FROM records WHERE owner = ? ${kind ? "AND kind = ?" : ""} ORDER BY CASE WHEN kind = 'profile' THEN 0 ELSE 1 END, created_at DESC LIMIT 500`,
    )
    .bind(...(kind ? [owner, kind] : [owner]))
    .all<{ id: string; kind: string; payload: string; created_at: number }>();
}
export async function GET(req: NextRequest) {
  try {
    const action = req.nextUrl.searchParams.get("action") || "session";
    const user = await getChatGPTUser();
    if (action === "session")
      return json({ user: user ? { name: user.displayName } : null });
    if (action === "catalog") return json({ foods: catalog });
    if (action === "model")
      return json({
        status: artifact.status,
        version: artifact.version,
        metrics: artifact.metrics,
        message: artifact.message,
      });
    if (action === "records") {
      if (!user)
        return json({ error: "Sign in to access saved records." }, 401);
      const data = await rows(user.userId);
      return json({
        records: data.results.map((r) => ({
          ...r,
          payload: JSON.parse(r.payload),
        })),
      });
    }
    if (action === "barcode") {
      const barcode = req.nextUrl.searchParams.get("code") || "";
      if (!/^\d{8,14}$/.test(barcode))
        return json({ error: "Enter an 8–14 digit barcode." }, 400);
      const cached = await database()
        .prepare(
          "SELECT payload,cached_at FROM product_cache WHERE barcode = ?",
        )
        .bind(barcode)
        .first<{ payload: string; cached_at: number }>();
      if (cached && Date.now() - cached.cached_at < 86400000)
        return json({ food: JSON.parse(cached.payload) });
      const response = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=product_name,nutriments,serving_quantity,serving_size,ingredients_text,allergens_tags,traces_tags,ingredients_analysis_tags,nutrition_grades,image_front_url,categories_tags`,
        {
          headers: { "User-Agent": "Foodwise/1.0 (personal nutrition guide)" },
          signal: AbortSignal.timeout(12000),
        },
      );
      if (!response.ok)
        return json(
          {
            error: "The food data provider is unavailable. Try again shortly.",
          },
          502,
        );
      const data: any = await response.json();
      if (!data.product || data.status === 0)
        return json(
          {
            error:
              "Product not found. Try another barcode or check the physical label.",
          },
          404,
        );
      const food = normalizeProduct(data.product, barcode);
      await database()
        .prepare(
          "INSERT INTO product_cache (barcode,payload,cached_at) VALUES (?,?,?) ON CONFLICT(barcode) DO UPDATE SET payload=excluded.payload,cached_at=excluded.cached_at",
        )
        .bind(barcode, JSON.stringify(food), Date.now())
        .run();
      return json({ food });
    }
    return json({ error: "Unknown operation." }, 400);
  } catch (error) {
    console.error(
      "Food request failed",
      error instanceof Error ? error.name : "unknown",
    );
    return json(
      { error: "Unable to load this information. Please try again." },
      503,
    );
  }
}
export async function POST(req: NextRequest) {
  try {
    const origin = req.headers.get("origin");
    if (origin && origin !== req.nextUrl.origin)
      return json({ error: "Request origin is not allowed." }, 403);
    const body = await req.json();
    const action = body.action;
    const user = await getChatGPTUser();
    if (action === "recommendations") {
      const profile = body.profile ? profileSchema.parse(body.profile) : null;
      const ratings = Array.isArray(body.ratings)
        ? body.ratings.slice(0, 500).map((r: any) => ({
            ...ratingSchema.parse(r),
            createdAt: Number(r.createdAt) || Date.now(),
          }))
        : [];
      return json({
        recommendations: rank(catalog, profile as Profile, ratings as Rating[]),
      });
    }
    if (!user)
      return json(
        { error: "Sign in to save information to your account." },
        401,
      );
    if (action === "delete") {
      await database()
        .prepare("DELETE FROM records WHERE owner = ?")
        .bind(user.userId)
        .run();
      return json({ ok: true });
    }
    let kind: string,
      payload: unknown,
      id = crypto.randomUUID();
    if (action === "profile") {
      kind = "profile";
      payload = profileSchema.parse(body.data);
      id = `profile:${user.userId}`;
    } else if (action === "glucose") {
      kind = "glucose";
      payload = glucoseSchema.parse(body.data);
    } else if (action === "rating") {
      kind = "rating";
      payload = ratingSchema.parse(body.data);
      id = `rating:${user.userId}:${(payload as any).foodId}`;
    } else if (action === "recommendation") {
      const food = catalog.find((f) => f.id === body.foodId);
      if (!food) return json({ error: "Choose a catalog food first." }, 400);
      const p = (await rows(user.userId, "profile")).results[0];
      const profile = p ? JSON.parse(p.payload) : null;
      kind = "recommendation";
      payload = {
        foodId: food.id,
        name: food.name,
        assessment: assess(food, profile),
      };
    } else if (action === "scan") {
      const barcode = String(body.code || "");
      if (!/^\d{8,14}$/.test(barcode))
        return json({ error: "Invalid barcode." }, 400);
      const cached = await database()
        .prepare("SELECT payload FROM product_cache WHERE barcode = ?")
        .bind(barcode)
        .first<{ payload: string }>();
      if (!cached) return json({ error: "Look up the product first." }, 400);
      const p = (await rows(user.userId, "profile")).results[0];
      const profile = p ? JSON.parse(p.payload) : null;
      const food = JSON.parse(cached.payload);
      kind = "scan";
      payload = { food, assessment: assess(food, profile) };
    } else return json({ error: "Unknown operation." }, 400);
    await database()
      .prepare(
        "INSERT INTO records (id,owner,kind,payload,created_at) VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,created_at=excluded.created_at WHERE owner=excluded.owner",
      )
      .bind(id, user.userId, kind, JSON.stringify(payload), Date.now())
      .run();
    return json({ ok: true, id });
  } catch (error) {
    if (error instanceof SyntaxError || (error as any)?.name === "ZodError")
      return json({ error: "Check the submitted fields and try again." }, 400);
    console.error(
      "Save failed",
      error instanceof Error ? error.name : "unknown",
    );
    return json(
      {
        error:
          "Could not save. Your account data has not been confirmed saved.",
      },
      503,
    );
  }
}
