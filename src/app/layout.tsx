import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { ReduxProvider } from "@/state/providers";
import { Toaster } from "sonner";
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
  title: "Console Péage EDRHKAT",
  description:
    "Console de peage EDRHKAT pour la supervision des postes, lots de recus, transactions et rapports.",
  icons: {
    icon: [
      { url: "/apple-icon.png", type: "image/png", sizes: "180x180" },
    ],
    shortcut: [{ url: "/apple-icon.png", type: "image/png" }],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

const themeInitScript = `
(() => {
  try {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = (matches) => {
      document.documentElement.classList.toggle("dark", matches);
    };
    applyTheme(media.matches);
    const onChange = (event) => applyTheme(event.matches);
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", onChange);
    } else if (typeof media.addListener === "function") {
      media.addListener(onChange);
    }
  } catch (_) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/png" sizes="180x180" href="/apple-icon.png" />
        <link rel="shortcut icon" href="/apple-icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-icon.png" />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-background text-foreground antialiased`}
      >
        <ReduxProvider>
          {children}
          <Toaster
            richColors
            closeButton
            expand
            position="top-right"
            theme="system"
            toastOptions={{
              classNames: {
                toast:
                  "border border-border bg-card text-card-foreground shadow-xl",
                title: "text-sm font-semibold",
                description: "text-sm text-muted-foreground",
                actionButton: "bg-primary text-primary-foreground",
                cancelButton: "bg-muted text-foreground",
              },
            }}
          />
        </ReduxProvider>
      </body>
    </html>
  );
}
