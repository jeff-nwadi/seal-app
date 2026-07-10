import type { Metadata, Viewport } from "next";
import { Inter, Montserrat } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

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

export const metadata: Metadata = {
  title: "Seal — Send it later.",
  description:
    "A time capsule for the things you want to say at the right moment. Text, audio, video, and images — sealed today, delivered on the date you choose.",
  metadataBase: new URL("https://seal.app"),
  openGraph: {
    title: "Seal — Send it later.",
    description:
      "A time capsule for the things you want to say at the right moment.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
  colorScheme: "light",
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
        {children}
      </body>
    </html>
  );
}
