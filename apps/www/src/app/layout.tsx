import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const dmSans = localFont({
  src: "../../public/fonts/dm-sans-variable.woff2",
  variable: "--font-dm-sans",
  weight: "100 1000",
  display: "swap",
});

const dmMono = localFont({
  src: "../../public/fonts/dm-mono-regular.woff2",
  variable: "--font-dm-mono",
  weight: "400",
  display: "swap",
});

const abcMarist = localFont({
  src: [
    {
      path: "../../public/fonts/abc-marist-book.woff2",
      style: "normal",
    },
    {
      path: "../../public/fonts/abc-marist-book-italic.woff2",
      style: "italic",
    },
  ],
  variable: "--font-abc-marist",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Medlyn — The facts your task needs, with sources",
  description:
    "Tell Medlyn your role and your task. It shows one screen with only the facts that task needs, each linked to the sentence or table row it came from.",
  icons: {
    icon: [
      { url: "/images/favicon.svg", type: "image/svg+xml" },
      { url: "/images/favicon.png", type: "image/png" },
    ],
    apple: "/images/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${dmMono.variable} ${abcMarist.variable} antialiased`}
    >
      <body className="bg-background-primary font-body antialiased">{children}</body>
    </html>
  );
}
