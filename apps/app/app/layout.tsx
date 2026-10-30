import { GeistMono } from "geist/font/mono";
import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Medlyn · Clinical cockpit",
  description: "One clinician. One task. Source-linked patient facts.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={cn(inter.variable, GeistMono.variable, "font-sans")}
      suppressHydrationWarning
    >
      <head>
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: static theme script must run before hydration to avoid a flash
          dangerouslySetInnerHTML={{
            __html: `try { if (localStorage.getItem('medlyn-theme') === 'dark') document.documentElement.classList.add('dark'); } catch (error) { document.documentElement.classList.remove('dark'); }`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
