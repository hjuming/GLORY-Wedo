import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "御之旅 — 行程規劃及報價",
  description: "NOBLE HOUSE GLORY — 御居所 HOUSE HOTEL",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body
        style={{
          margin: 0,
          fontFamily: "'Noto Sans TC', 'Hiragino Sans', sans-serif",
        }}
      >
        {children}
      </body>
    </html>
  );
}
