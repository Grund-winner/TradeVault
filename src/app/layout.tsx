import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TradeVault — Trading Analytics Dashboard",
  description: "Professional trading analytics and journal for tracking, analyzing, and optimizing your trading performance.",
  keywords: ["TradeVault", "Trading", "Analytics", "Journal", "Performance"],
  authors: [{ name: "TradeVault" }],
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0a0a0f] text-white overflow-x-hidden`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
