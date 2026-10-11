import { z } from "zod";
import { currentUser } from "@/server/services/session";
import { scanFood } from "@/server/services/food.service";
import {
  json,
  errorResponse,
  checkOrigin,
  bodyJson,
} from "@/server/http/response";
export const runtime = "nodejs";
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const { code } = z.object({ code: z.string() }).parse(await bodyJson(req));
    const user = await currentUser();
    return json(await scanFood(code, user?.id));
  } catch (error) {
    return errorResponse(error);
  }
}
