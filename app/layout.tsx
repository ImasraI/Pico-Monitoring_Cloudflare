import type { Metadata, Viewport } from "next";
import "./globals.css";
import "@/components/marketing/styles/tokens.css";
import "@/components/marketing/styles/site.css";
import "@/components/marketing/styles/enhance.css";

export const metadata: Metadata = {
  title: "Pico Monitoring | پایش درمان ارتودنسی",
  description: "ارتباط پزشک و بیمار در مسیر درمان ارتودنسی",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/assets/favicon.svg",
    shortcut: "/assets/favicon.svg",
  },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: "#009fa8",
};

/* Runs before first paint so the stored theme, the scripting flag and the motion
   preference are all in place on the first frame. The reveal layer only hides
   content under html.has-js, so applying it here also removes the flicker that
   would otherwise appear once the client effects start. Mirrors the bootstrap in
   the standalone public site's index.html. */
const bootstrap = `(function(){var root=document.documentElement;try{var stored=localStorage.getItem("pm-theme");var dark=stored==="dark"||(stored!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);root.setAttribute("data-theme",dark?"dark":"light");}catch(error){root.setAttribute("data-theme","light");}root.classList.add("has-js");if(window.matchMedia("(prefers-reduced-motion: reduce)").matches)root.classList.add("motion-off");})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootstrap }} />
        <link
          rel="preload"
          as="font"
          type="font/woff2"
          href="/fonts/vazirmatn-arabic.woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          as="font"
          type="font/woff2"
          href="/fonts/vazirmatn-latin.woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
