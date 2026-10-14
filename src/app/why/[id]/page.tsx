import { notFound } from "next/navigation";
import { currentUser } from "@/server/services/session";
import { foodDetails } from "@/server/services/food.service";
import { FoodDetails } from "@/features/nutrition/food-details";
import { HttpError } from "@/server/http/response";
export const metadata = { title: "Food insights" };
export default async function WhyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await currentUser();
  let result;
  try {
    result = await foodDetails(id, user?.id);
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) notFound();
    throw error;
  }
  return <FoodDetails {...result} signedIn={!!user} />;
}
