import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") || "selah-bible-reader.bradley-hatfield00.chatgpt.site";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const imageUrl = `${protocol}://${host}/og.png`;

  return {
    title: "Selah — Scripture, slowly",
    description: "A focused Bible reader with synchronized read-aloud, notes, highlights, commentary, and original-language study.",
    openGraph: {
      title: "Selah — Scripture, slowly",
      description: "Read whole chapters, listen with synchronized verse highlighting, and study more deeply.",
      images: [{ url: imageUrl, width: 1536, height: 1024, alt: "Selah Bible reader" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Selah — Scripture, slowly",
      description: "A focused Bible reader with synchronized audio and study tools.",
      images: [imageUrl],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
