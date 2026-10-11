import { redirect } from "next/navigation";
import { currentUser } from "@/server/services/session";
import { AuthForm } from "@/features/auth/auth-form";
export const metadata = { title: "Sign in" };
export default async function SignIn({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = ["/recommendations", "/profile", "/journal", "/scan"].includes(
    params.next || "",
  )
    ? params.next!
    : "/recommendations";
  if (await currentUser()) redirect(next);
  return <AuthForm mode="sign-in" next={next} />;
}
