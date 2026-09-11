import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RAMPED | Minimalist Strength & Cardio Tracking",
  description: "Track your lifts, monitor cardio engine metrics, and visualize training progression with zero fluff.",
  metadataBase: new URL('https://www.ramped.fit/'), // Replace with your actual live URL
  openGraph: {
    title: "RAMPED | Minimalist Strength & Cardio Tracking",
    description: "Track your lifts, monitor cardio engine metrics, and visualize training progression with zero fluff.",
    url: "https://www.ramped.fit/", // Replace with your actual live URL
    siteName: "RAMPED",
    images: [
      {
        url: "/ramped_logo.png", // Or a dedicated 1200x630 banner in your /public folder
        width: 1200,
        height: 630,
        alt: "RAMPED Fitness Tracker",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "RAMPED | Minimalist Strength & Cardio Tracking",
    description: "Track your lifts, monitor cardio engine metrics, and visualize training progression with zero fluff.",
    images: ["/ramped_logo.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      {/* Deep Charcoal Background & Off-White Text */}
      <body className="bg-[#0D0D0F] text-[#F1F3F4] antialiased">
        {children}
      </body>
    </html>
  )
}
