import type { Metadata, Viewport } from "next";
import { Inter, Montserrat } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";
import { RegisterSW } from "@/components/register-sw";

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
  // Brand primary — matches `theme_color` in the manifest and the
  // splash screen background on Android. Neutral dark palette uses
  // the page background so the mobile browser chrome blends in.
  themeColor: "#101010",
  colorScheme: "dark",
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
    >
      <body className="min-h-full bg-bg text-fg">
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
      </body>
    </html>
  );
}
