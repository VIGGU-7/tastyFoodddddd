import { z } from "zod";
import { requireUser } from "@/server/services/session";
import {
  glucoseSchema,
  ratingSchema,
} from "@/features/nutrition/domain/validation";
import { catalog } from "@/features/nutrition/domain/catalog";
import {
  readRecords,
  saveRecord,
} from "@/server/repositories/records.repository";
import {
  json,
  errorResponse,
  checkOrigin,
  bodyJson,
  HttpError,
} from "@/server/http/response";
export const runtime = "nodejs";
export async function GET() {
  try {
    const user = await requireUser();
    return json({ records: readRecords(user.id) });
  } catch (error) {
    return errorResponse(error);
  }
}
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const user = await requireUser();
    const body = z
      .object({ kind: z.enum(["rating", "glucose"]), data: z.unknown() })
      .parse(await bodyJson(req));
    if (body.kind === "rating") {
      const rating = ratingSchema.parse(body.data);
      if (!catalog.some((food) => food.id === rating.foodId))
        throw new HttpError(400, "Choose a food from the catalog.");
      saveRecord(
        user.id,
        "rating",
        { ...rating, createdAt: Date.now() },
        rating.foodId,
      );
    } else saveRecord(user.id, "glucose", glucoseSchema.parse(body.data));
    return json({ ok: true }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
