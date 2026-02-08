import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OG Chess",
  description: "Correspondence chess in a URL. Make a move, share the link.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
