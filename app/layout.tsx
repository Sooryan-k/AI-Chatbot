import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/providers/theme-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { AppShell } from "@/components/layout/app-shell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = "https://zooperchat.vercel.app";
const description =
  "A ChatGPT style AI chat app with cloud synced history, streaming replies, projects, and shareable links. Sign in with an email link and your chats follow you across devices.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ZooperChat — AI chat with cloud synced history",
    template: "%s · ZooperChat",
  },
  description,
  applicationName: "ZooperChat",
  keywords: [
    "ZooperChat",
    "AI chat",
    "AI chatbot",
    "ChatGPT alternative",
    "streaming chat",
    "OpenRouter",
    "Supabase",
    "Next.js",
  ],
  authors: [{ name: "Sooryan K" }],
  creator: "Sooryan K",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "ZooperChat",
    title: "ZooperChat — AI chat with cloud synced history",
    description,
    url: siteUrl,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "ZooperChat — AI chat with cloud synced history",
    description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  category: "technology",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0c1311" },
  ],
};

// root layout for every page. it loads the fonts, sets the theme provider for
// dark and light mode, and wraps all pages in the app shell which handles the
// sidebar, top bar and auth gating.
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <AppShell>{children}</AppShell>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
