import type { Metadata, Viewport } from "next";
import { Inter, Montserrat } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";
import { RegisterSW } from "@/components/register-sw";
import { ThemeProvider } from "@/components/theme-provider";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

/**
 * PWA manifest + iOS / Android meta. Apple specifically reads
 * `apple-mobile-web-app-capable` (not the modern `mobile-web-app-capable`
 *); we set both so the "Add to Home Screen" prompt works on Safari
 * and the install banner shows in Chrome on Android. The 32px favicon
 * covers the legacy `<link rel="icon">` browser tab; the 192/512 live
 * in the manifest for the home-screen icon.
 */
export const metadata: Metadata = {
  title: "Seal — Send it later.",
  description:
    "A time capsule for the things you want to say at the right moment. Text, audio, video, and images — sealed today, delivered on the date you choose.",
  metadataBase: new URL("https://seal.app"),
  applicationName: "Seal",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Seal",
  },
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "Seal — Send it later.",
    description: "A time capsule for the things you want to say at the right moment.",
    type: "website",
  },
};

export const viewport: Viewport = {
  // Brand primary (Betha Groups #3513A5) — matches `theme_color` in the
  // manifest and the Android splash screen background. The app itself
  // is light-themed (see `app/globals.css`), so the mobile browser
  // chrome should sit on white.
  themeColor: "#3513A5",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", montserrat.variable, inter.variable, "font-sans")}
      // `suppressHydrationWarning` on `<body>` silences the mismatch
      // caused by browser extensions (ColorZilla et al.) that inject
      // `cz-shortcut-listen` and similar attributes on the root. The
      // attributes only exist in the client DOM, never in SSR, so React
      // can't reconcile them. The warning is harmless but drowns out
      // real hydration bugs — suppress it only here, not elsewhere.
      suppressHydrationWarning
    >
      <body className="min-h-full bg-bg text-fg">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <TooltipProvider>
            {children}
            <Toaster
              theme="dark"
              position="top-center"
              richColors
              toastOptions={{
                classNames: {
                  toast:
                    "border border-border bg-card text-card-foreground shadow-md",
                },
              }}
            />
          </TooltipProvider>
          <RegisterSW />
        </ThemeProvider>
      </body>
    </html>
  );
}
