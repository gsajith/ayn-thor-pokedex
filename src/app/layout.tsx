import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { STORAGE_KEY, THEME_MODES, DEFAULT_THEME } from "@/lib/theme";
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
  title: "Pokédex",
  description:
    "Type matchups at a glance for Pokémon ROM hacks, sized for the AYN Thor bottom screen.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#000000",
  viewportFit: "cover",
};

const THEME_BOOTSTRAP = `(function(){try{var m=localStorage.getItem(${JSON.stringify(
  STORAGE_KEY,
)});var a=${JSON.stringify(
  THEME_MODES,
)};document.documentElement.dataset.theme=a.indexOf(m)>-1?m:${JSON.stringify(
  DEFAULT_THEME,
)}}catch(e){document.documentElement.dataset.theme=${JSON.stringify(
  DEFAULT_THEME,
)}}})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        {/*
          Runs before first paint so a light-mode user does not get a black
          flash on every cold start. The static export prerenders without
          data-theme, and every app chunk is async, so React applies the theme
          far too late to avoid it.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: THEME_BOOTSTRAP,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
