import { requireUser } from "@/server/services/session";
import { recommendations } from "@/server/services/food.service";
import { json, errorResponse } from "@/server/http/response";
export const runtime = "nodejs";
export async function GET() {
  try {
    const user = await requireUser();
    return json({ recommendations: recommendations(user.id) });
  } catch (error) {
    return errorResponse(error);
  }
}
