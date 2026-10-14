import { requirePageUser } from "@/server/services/session";
import { readRecords } from "@/server/repositories/records.repository";
import { Journal } from "@/features/journal/journal";
export const metadata = { title: "Food journal" };
export default async function JournalPage() {
  const user = await requirePageUser("/journal");
  return <Journal records={readRecords(user.id)} />;
}
