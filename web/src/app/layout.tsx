import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AnatomLabs Plus — Performance. Decoded.",
  description:
    "The most advanced human performance ecosystem ever built. From micronutrient tracking to elite coaching — all in one integrated experience.",
  keywords: [
    "human performance",
    "micronutrient tracking",
    "biomarkers",
    "elite coaching",
    "nutrition science",
  ],
  openGraph: {
    title: "AnatomLabs Plus — Performance. Decoded.",
    description:
      "The most advanced human performance ecosystem ever built.",
    type: "website",
    siteName: "AnatomLabs Plus",
  },
  twitter: {
    card: "summary_large_image",
    title: "AnatomLabs Plus — Performance. Decoded.",
    description:
      "The most advanced human performance ecosystem ever built.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning className={`${inter.variable} antialiased`}>{children}</body>
    </html>
  );
}
