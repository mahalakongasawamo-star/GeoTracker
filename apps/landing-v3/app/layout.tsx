import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Instrument_Serif } from "next/font/google";
import "./globals.css";

// Geist + Geist Mono ship as separate next/font packages from Vercel; loading
// via the official `geist` package is preferred over Google Fonts for both
// because it eliminates CLS and includes weight 800 (used by the hero).
const instrumentSerif = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-instrument-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GeoTracker — AI Visibility Audit",
  description:
    "See what the AI engines tell people who ask for the best business in your category — in your city. Free, live in 12 seconds.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} ${instrumentSerif.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
