import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://carte-src.vercel.app"),
  title: "Sacerdoce Royal — Carte du monde",
  description:
    "Carte mondiale interactive des effectifs de l'église Sacerdoce Royal. Que ton règne vienne !",
  icons: { icon: "/logo-sr.png" },
  openGraph: {
    title: "Sacerdoce Royal — Carte du monde",
    description:
      "Carte mondiale interactive des effectifs de l'église Sacerdoce Royal. Que ton règne vienne !",
    images: [
      {
        url: "/logo-sr.png",
        width: 800,
        height: 800,
        alt: "Logo Sacerdoce Royal",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sacerdoce Royal — Carte du monde",
    description:
      "Carte mondiale interactive des effectifs de l'église Sacerdoce Royal. Que ton règne vienne !",
    images: ["/logo-sr.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
