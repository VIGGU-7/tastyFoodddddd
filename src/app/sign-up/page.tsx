import { redirect } from "next/navigation";
import { currentUser } from "@/server/services/session";
import { AuthForm } from "@/features/auth/auth-form";
export const metadata = { title: "Create account" };
export default async function SignUp() {
  if (await currentUser()) redirect("/recommendations");
  return <AuthForm mode="sign-up" next="/recommendations" />;
}
