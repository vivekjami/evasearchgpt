import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
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
  title: "EvaSearchGPT - Next-Gen AI Search",
  description: "Intelligent search that provides answers, not just links. Powered by multiple search sources and advanced AI.",
  keywords: "AI search, intelligent search, search engine, LLM search",
  authors: [{ name: "EvaSearchGPT Team" }],
  creator: "EvaSearchGPT Team",
  openGraph: {
    title: "EvaSearchGPT - AI-Powered Search",
    description: "Get comprehensive answers from multiple search sources with AI analysis",
    url: process.env.NEXT_PUBLIC_APP_URL,
    siteName: "EvaSearchGPT",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "EvaSearchGPT - AI-Powered Search",
    description: "Get comprehensive answers from multiple search sources with AI analysis",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
