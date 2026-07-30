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
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
      apple: "/favicon.svg",
    },
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
  const preferenceScript = `
    (() => {
      try {
        const root = document.documentElement;
        const savedTheme = localStorage.getItem("selah-theme") || "system";
        const resolvedTheme = savedTheme === "system"
          ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
          : savedTheme;
        root.dataset.theme = resolvedTheme;
        root.dataset.audioDockEnabled = localStorage.getItem("selah-audio-dock-enabled-v1") === "false" ? "false" : "true";
      } catch {
        document.documentElement.dataset.audioDockEnabled = "true";
      }
    })();
  `;
  const showBetaRibbon = process.env.NODE_ENV !== "production";

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: preferenceScript }} />
      </head>
      <body>
        {showBetaRibbon && <div className="beta-ribbon" aria-hidden="true">BETA</div>}
        {children}
      </body>
    </html>
  );
}
