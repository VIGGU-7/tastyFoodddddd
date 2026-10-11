import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Foodwise — Good food. Your way.",
  description:
    "Discover foods that fit your taste and nutrition preferences. Scan, understand, and find your next favorite.",
  icons: { icon: "/favicon.svg" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
