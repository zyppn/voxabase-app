import type { Metadata, Viewport } from "next";
import { Mona_Sans } from "next/font/google";
import "./globals.css";

// The landing page's typeface: a variable width axis for display headings.
const mona = Mona_Sans({
  variable: "--font-mona",
  subsets: ["latin"],
  axes: ["wdth"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "VoxaBase — Client Deliverables Portal",
  description: "Deliver client work like a studio. Upload files, share one branded link, and collect payment — all in one portal.",
};

export const viewport: Viewport = {
  themeColor: "#0c0b10",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${mona.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-ink text-paper font-sans">{children}</body>
    </html>
  );
}
