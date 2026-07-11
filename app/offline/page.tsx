/**
 * Offline fallback page.
 *
 * Served by the service worker when a navigation request fails the
 * network AND the requested URL isn't in the pre-cached shell. Kept
 * as a Server Component so it doesn't need JS — the browser just
 * renders it from the cache.
 */
import Link from "next/link"
import { WifiOff } from "lucide-react"

export const metadata = {
  title: "Offline — Seal",
  robots: { index: false, follow: false },
}

export const dynamic = "force-static"

export default function OfflinePage() {
  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center bg-background px-4 py-16 text-center">
      <div className="max-w-sm space-y-4">
        <WifiOff className="size-12 mx-auto text-muted-foreground" aria-hidden />
        <h1 className="text-2xl font-semibold tracking-tight">
          You&apos;re offline
        </h1>
        <p className="text-sm text-muted-foreground">
          Seal couldn&apos;t reach the network. Once you&apos;re back online,
          any capsule you try to send will queue and deliver at the time
          you picked.
        </p>
        <Link
          href="/"
          className="inline-block text-sm text-primary hover:underline"
        >
          Try again
        </Link>
      </div>
    </div>
  )
}
