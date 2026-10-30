import type { Metadata } from "next";
import Script from "next/script";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "Medlyn · Clinical cockpit",
  description: "One clinician. One task. Source-linked patient facts.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} dark`}
      suppressHydrationWarning
    >
      <head>
        <Script
          id="medlyn-theme"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `try { document.documentElement.classList.toggle('dark', localStorage.getItem('medlyn-theme') !== 'light'); } catch (error) { console.warn('Theme preference unavailable', error); }`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
