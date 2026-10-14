import { z } from "zod";
import { cookies } from "next/headers";
import {
  authThrottle,
  createSession,
  registerAccount,
  signInAccount,
  revokeSession,
  SESSION_COOKIE,
  SESSION_DURATION,
} from "@/server/services/auth.service";
import { currentUser } from "@/server/services/session";
import {
  bodyJson,
  checkOrigin,
  errorResponse,
  json,
  HttpError,
} from "@/server/http/response";
export const runtime = "nodejs";
const credentials = z.object({
  email: z
    .string()
    .trim()
    .email("Enter a valid email address.")
    .max(254)
    .transform((v) => v.toLowerCase()),
  password: z.string().min(8, "Use at least 8 characters.").max(128),
  name: z.string().trim().min(2, "Enter your name.").max(80).optional(),
});
export async function GET() {
  return json({ user: await currentUser() });
}
export async function POST(
  req: Request,
  context: { params: Promise<{ action: string }> },
) {
  try {
    checkOrigin(req);
    const { action } = await context.params;
    const jar = await cookies();
    if (action === "sign-out") {
      const token = jar.get(SESSION_COOKIE)?.value;
      if (token) revokeSession(token);
      jar.delete(SESSION_COOKIE);
      return json({ ok: true });
    }
    if (!["sign-in", "sign-up"].includes(action))
      throw new HttpError(404, "Unknown account action.");
    const input = credentials.parse(await bodyJson(req));
    authThrottle(input.email);
    if (action === "sign-up" && !input.name)
      throw new HttpError(400, "Enter your name.");
    const user =
      action === "sign-up"
        ? await registerAccount(input.name!, input.email, input.password)
        : await signInAccount(input.email, input.password);
    const previous = jar.get(SESSION_COOKIE)?.value;
    if (previous) revokeSession(previous);
    jar.set(SESSION_COOKIE, createSession(user.id), {
      httpOnly: true,
      sameSite: "lax",
      secure:
        new URL(req.url).protocol === "https:" ||
        req.headers.get("x-forwarded-proto") === "https",
      path: "/",
      maxAge: SESSION_DURATION,
    });
    return json({ user }, action === "sign-up" ? 201 : 200);
  } catch (error) {
    return errorResponse(error);
  }
}
