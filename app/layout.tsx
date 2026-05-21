import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Memory Space — Your Cozy Digital Journal",
  description:
    "A beautifully encrypted, cozy scrapbook journal. Write your daily thoughts, pin memories to your personal map, and decorate pages with draggable stickers.",
  keywords: ["journal", "diary", "scrapbook", "memory", "private", "encrypted", "cozy"],
  authors: [{ name: "Memory Space" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Memory Space",
  },
  openGraph: {
    title: "Memory Space — Your Cozy Digital Journal",
    description: "A private, beautifully encrypted scrapbook journal space.",
    type: "website",
    locale: "en_US",
  },
};

export const viewport: Viewport = {
  themeColor: "#2D2A26",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="https://cdn-icons-png.flaticon.com/512/3652/3652191.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
