import type { Metadata } from "next";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl">
      <body className="antialiased">{children}</body>
    </html>
  );
}
