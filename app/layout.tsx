import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Selah — Scripture, slowly",
  description: "A focused Bible reader with read-aloud, notes, highlights, commentary, and original-language study.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
