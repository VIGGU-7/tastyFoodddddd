import { cookies } from "next/headers";
import { requireUser } from "@/server/services/session";
import { deleteAccount, SESSION_COOKIE } from "@/server/services/auth.service";
import { json, errorResponse, checkOrigin } from "@/server/http/response";
export const runtime = "nodejs";
export async function DELETE(req: Request) {
  try {
    checkOrigin(req);
    const user = await requireUser();
    deleteAccount(user.id);
    (await cookies()).delete(SESSION_COOKIE);
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
