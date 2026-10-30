import localFont from "next/font/local";
import { siteMetadata, siteViewport } from "@/lib/seo";
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

export const metadata = siteMetadata;
export const viewport = siteViewport;

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
