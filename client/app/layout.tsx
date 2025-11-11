import type { Metadata } from "next";
import { Geist, Geist_Mono, Rock_Salt } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ClientOnly } from "@/components/client-only";
import { ToastProvider } from "@/contexts/toast-context";
import { ClerkProvider } from "@clerk/nextjs";
import { OnboardingGate } from "@/components/OnboardingGate";
import { NotificationsStoreProvider } from "@/providers/notifications-store-provider";
import { NotificationFetcher } from "@/components/notification-fetcher";
import { 
  SITE_CONFIG, 
  BASE_KEYWORDS, 
  OPEN_GRAPH_DEFAULTS, 
  TWITTER_DEFAULTS,
  METADATA_TEMPLATES
} from "@/lib/seo-config";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Handwritten/accent font close to "Rockybilly" vibe
const accent = Rock_Salt({
  variable: "--font-accent",
  weight: "400",
  subsets: ["latin"],
});

// SEO-optimized metadata for maximum search engine visibility
export const metadata: Metadata = {
  metadataBase: new URL(SITE_CONFIG.url),
  title: {
    default: METADATA_TEMPLATES.home.title,
    template: "%s | Reunait - Missing Person Platform"
  },
  description: METADATA_TEMPLATES.home.description,
  keywords: [...BASE_KEYWORDS],
  authors: [{ name: "Reunait Team" }],
  creator: SITE_CONFIG.name,
  publisher: SITE_CONFIG.name,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    ...OPEN_GRAPH_DEFAULTS,
    url: SITE_CONFIG.url,
    title: METADATA_TEMPLATES.home.title,
    description: METADATA_TEMPLATES.home.description,
    images: [...OPEN_GRAPH_DEFAULTS.images],
  },
  twitter: {
    ...TWITTER_DEFAULTS,
    title: METADATA_TEMPLATES.home.title,
    description: METADATA_TEMPLATES.home.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION,
    yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION,
    yahoo: process.env.NEXT_PUBLIC_YAHOO_VERIFICATION,
  },
  alternates: {
    canonical: SITE_CONFIG.url,
  },
  category: "Missing Person Search Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} ${accent.variable} antialiased`}>
        <ClerkProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
          >
            <NotificationsStoreProvider>
              <ToastProvider>
                {/* SSE connection persists across all navigation - only one connection per session */}
                <ClientOnly>
                  <NotificationFetcher />
                </ClientOnly>
                <div className="min-h-screen flex flex-col">
                  <Navbar />
                  <main className="flex-1 pt-24">
                    <OnboardingGate>
                      {children}
                    </OnboardingGate>
                  </main>
                  <Footer />
                </div>
              </ToastProvider>
            </NotificationsStoreProvider>
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
