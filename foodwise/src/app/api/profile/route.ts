import { requireUser } from "@/server/services/session";
import { profileSchema } from "@/features/nutrition/domain/validation";
import { saveRecord } from "@/server/repositories/records.repository";
import { userProfile } from "@/server/services/food.service";
import {
  json,
  errorResponse,
  checkOrigin,
  bodyJson,
} from "@/server/http/response";
export const runtime = "nodejs";
export async function GET() {
  try {
    const user = await requireUser();
    return json({ profile: userProfile(user.id) });
  } catch (error) {
    return errorResponse(error);
  }
}
export async function PUT(req: Request) {
  try {
    checkOrigin(req);
    const user = await requireUser();
    const profile = profileSchema.parse(await bodyJson(req));
    saveRecord(user.id, "profile", profile, "current");
    return json({ profile });
  } catch (error) {
    return errorResponse(error);
  }
}
