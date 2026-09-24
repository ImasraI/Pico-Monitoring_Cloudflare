import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DANTO | پایش درمان ارتودنسی",
  description: "ارتباط پزشک و بیمار در مسیر درمان ارتودنسی",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
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
