import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, sessionUser } from "./auth.service";
import { HttpError } from "../http/response";
export async function currentUser() {
  return sessionUser((await cookies()).get(SESSION_COOKIE)?.value);
}
export async function requireUser() {
  const user = await currentUser();
  if (!user)
    throw new HttpError(
      401,
      "Sign in to access your personal recommendations.",
    );
  return user;
}
export async function requirePageUser(path: string) {
  const user = await currentUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(path)}`);
  return user;
}
