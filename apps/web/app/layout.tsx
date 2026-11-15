import { APP_NAME, APP_TAGLINE } from "@repo/shared";
import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono, Tilt_Neon, Yellowtail } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});
const tiltNeon = Tilt_Neon({ subsets: ["latin"], variable: "--font-tilt-neon", display: "swap" });
// The logo's retro diner-sign script. Swap the font here to change it everywhere.
const logoFace = Yellowtail({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-logo-face",
  display: "swap",
});

// Where the site lives, so share images get full addresses. Vercel sets the
// variable in production; locally it falls back to the dev server.
const SITE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME}: ${APP_TAGLINE}`,
    template: `%s · ${APP_NAME}`,
  },
  description:
    "A swipe-based way to find a flat and the people in it. Swipe through flats, match with the lister, then chat.",
  applicationName: APP_NAME,
  metadataBase: new URL(SITE_URL),
  openGraph: { type: "website", siteName: APP_NAME, url: "/" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#07070c",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${geistMono.variable} ${bricolage.variable} ${tiltNeon.variable} ${logoFace.variable}`}
    >
      <head>
        {/* Photos come from other servers. Connecting early saves the first photo a few round
            trips. No crossOrigin here: photos are plain <img> requests, and a connection opened
            for the other kind would not be reused for them. */}
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
      </head>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
