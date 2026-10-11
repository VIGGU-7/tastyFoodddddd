import { requirePageUser } from "@/server/services/session";
import { userProfile } from "@/server/services/food.service";
import { ProfileForm } from "@/features/profile/profile-form";
export const metadata = { title: "Your preferences" };
export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const user = await requirePageUser("/profile");
  const params = await searchParams;
  return (
    <ProfileForm
      initial={userProfile(user.id)}
      name={user.name}
      welcome={params.welcome === "1"}
    />
  );
}
