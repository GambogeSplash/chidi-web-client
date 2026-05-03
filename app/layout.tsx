import type React from "react"
import type { Metadata } from "next"
import { Inter, Instrument_Serif } from "next/font/google"
import "./globals.css"
import { QueryProvider } from "@/lib/providers/query-provider"
import { Analytics } from "@vercel/analytics/react"
import { Toaster } from "sonner"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
})

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
  variable: "--font-instrument-serif",
})

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://chidi.app"
const SITE_DESCRIPTION =
  "AI assistant for chat commerce — Telegram and WhatsApp. I reply to your customers, track every order, and flag the ones that need you. Built in Lagos, for the people who sell through chat."

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Chidi — AI Business Assistant",
    template: "%s · Chidi",
  },
  description: SITE_DESCRIPTION,
  manifest: "/manifest.json",
  applicationName: "Chidi",
  authors: [{ name: "Chidi" }],
  creator: "Chidi",
  publisher: "Chidi",
  keywords: [
    "chat commerce",
    "Telegram commerce",
    "WhatsApp commerce",
    "AI assistant",
    "Lagos",
    "Accra",
    "Nairobi",
    "SME",
    "small business",
    "Africa",
    "Naija business",
    "Bumpa alternative",
    "Shopify alternative",
  ],
  // Explicit icon set — points to the Chidi logo at all sizes so every
  // browser + OS picks the right one.
  icons: {
    icon: [
      { url: "/logo.png", sizes: "any", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/logo.png",
    apple: [{ url: "/logo.png", sizes: "any", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Chidi",
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  openGraph: {
    type: "website",
    siteName: "Chidi",
    title: "Chidi — AI Business Assistant",
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    locale: "en_NG",
    images: [
      {
        url: "/icon-512.png",
        width: 512,
        height: 512,
        alt: "Chidi — AI assistant for chat commerce (Telegram + WhatsApp)",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Chidi — AI Business Assistant",
    description: SITE_DESCRIPTION,
    images: ["/icon-512.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
}

export const viewport = {
  themeColor: "#F7F5F3", // matches manifest theme_color (warm paper)
  width: "device-width",
  initialScale: 1,
  maximumScale: 5, // allow some zoom for accessibility — nuser-zoom is hostile
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${instrumentSerif.variable}`}>
      <head>
        <link rel="icon" href="/logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/logo.png" />
      </head>
      <body className="font-sans antialiased">
        <QueryProvider>{children}</QueryProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "var(--card)",
              color: "var(--chidi-text-primary)",
              border: "1px solid var(--chidi-border-default)",
              fontFamily: "var(--font-inter)",
              fontWeight: 500,
            },
            duration: 5000,
          }}
        />
        <Analytics />
      </body>
    </html>
  )
}
