import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { currentUser } from "@/server/services/session";
export const metadata: Metadata = {
  title: {
    default: "Foodwise — A little more you.",
    template: "%s · Foodwise",
  },
  description:
    "Scan a food, understand its nutrition grade, and discover personalized food choices. Clear answers, honest limits.",
  icons: { icon: "/favicon.svg" },
};
export const runtime = "nodejs";
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  return (
    <html lang="en">
      <body>
        <AppShell user={user}>{children}</AppShell>
      </body>
    </html>
  );
}
