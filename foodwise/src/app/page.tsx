import { Overview } from "@/features/discovery/overview";
import { currentUser } from "@/server/services/session";
export default async function Home() {
  return <Overview user={await currentUser()} />;
}
