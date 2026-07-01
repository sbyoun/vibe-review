import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "VibeReview",
  description: "A lightweight board for posting AI-built projects and collecting feedback.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
