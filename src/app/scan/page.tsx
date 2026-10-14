import { Scanner } from "@/features/scanner/scanner";
import { currentUser } from "@/server/services/session";
export const metadata = { title: "Scan a food" };
export default async function ScanPage() {
  return <Scanner signedIn={!!(await currentUser())} />;
}
