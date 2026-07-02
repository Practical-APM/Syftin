import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://syftin.io",
  ),
  title: "Syftin | Structured Web Data for Business Teams",
  description:
    "Syftin turns public website data into clean JSON datasets for pricing, research, and analytics. Built for e-commerce, company registries, and job market teams.",
  keywords: [
    "web data extraction",
    "structured JSON datasets",
    "alternative data",
    "e-commerce price tracking",
    "job market data",
    "company registry data",
    "India business data",
  ],
  openGraph: {
    title: "Syftin | Structured Web Data for Business Teams",
    description:
      "Get clean, structured data from public websites. Track prices, research companies, and analyze job listings without building scrapers in-house.",
    type: "website",
    images: [{ url: "/syftin-512.png", width: 512, height: 512, alt: "Syftin" }],
  },
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/syftin-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/syftin-192.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/favicon-32.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} h-full`}>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
