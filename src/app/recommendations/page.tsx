import { requirePageUser } from "@/server/services/session";
import { recommendations, userProfile } from "@/server/services/food.service";
import { readRecords } from "@/server/repositories/records.repository";
import { Recommendations } from "@/features/discovery/recommendations";
export const metadata = { title: "For you" };
export default async function RecommendationsPage() {
  const user = await requirePageUser("/recommendations");
  const ratings = readRecords(user.id)
    .filter((record) => record.kind === "rating")
    .map((record) => record.payload);
  return (
    <Recommendations
      items={recommendations(user.id)}
      profile={userProfile(user.id)}
      name={user.name}
      ratings={ratings}
    />
  );
}
