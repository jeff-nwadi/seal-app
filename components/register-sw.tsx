"use client"

/**
 * Service worker registration.
 *
 * Mounted in the root layout. On load, registers `/sw.js` (served
 * from `public/`) and watches for a new SW waiting to activate —
 * when one is found, we post `SKIP_WAITING` to it so the user gets
 * the new shell on the next navigation without a manual refresh.
 *
 * Why hand-rolled: `next-pwa` / `@ducanh2912/next-pwa` are unmaintained
 * against Next 16 + Turbopack, and the registration contract is short
 * enough to own inline. The SW itself lives at `public/sw.js`.
 *
 * Dev caveat: `next dev` doesn't reliably serve the SW at
 * `/sw.js` because Turbopack writes assets to `/_next/`. The
 * `next build` + `next start` flow does serve it (it's a static
 * file in `public/`). We only register on `production` builds AND
 * when the browser exposes `navigator.serviceWorker` — that way
 * dev users don't see stale-shell bugs.
 */
import { useEffect } from "react"
import { toast } from "sonner"

export function RegisterSW() {
  useEffect(() => {
    if (typeof window === "undefined") return
    if (!("serviceWorker" in navigator)) return
    // Dev / Turbopack: skip — `next build` + `next start` is what
    // the user installs as a PWA from. (We could register in dev too,
    // but a hot-reload loop over a stale SW is a known footgun.)
    if (process.env.NODE_ENV !== "production") return

    const onLoad = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          // If a new SW is already waiting, surface it so the user
          // knows the shell was just refreshed. Most installs hit the
          // cold path (no waiting worker), so this toast is rare.
          if (reg.waiting) {
            toast.info("A new version of Seal is ready.", {
              description: "Reload to update.",
              action: {
                label: "Reload",
                onClick: () => {
                  reg.waiting?.postMessage("SKIP_WAITING")
                  window.location.reload()
                },
              },
            })
          }

          // Listen for future waiting workers (i.e. the user has the
          // app open while a new build deploys).
          reg.addEventListener("updatefound", () => {
            const newWorker = reg.installing
            if (!newWorker) return
            newWorker.addEventListener("statechange", () => {
              if (
                newWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                toast.info("A new version of Seal is ready.", {
                  description: "Reload to update.",
                  action: {
                    label: "Reload",
                    onClick: () => {
                      newWorker.postMessage("SKIP_WAITING")
                      window.location.reload()
                    },
                  },
                })
              }
            })
          })
        })
        .catch((err) => {
          // Silent: a failed registration shouldn't bother the user.
          // We log so a developer can see it in the console.
          console.warn("[sw] registration failed", err)
        })

      // When the new SW takes over, the page is reloaded with the
      // new shell. (Optional — some apps prefer to refresh silently.
      // The toast above already tells the user what's happening.)
      let reloading = false
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (reloading) return
        reloading = true
        window.location.reload()
      })
    }

    if (document.readyState === "complete") {
      onLoad()
    } else {
      window.addEventListener("load", onLoad)
      return () => window.removeEventListener("load", onLoad)
    }
  }, [])

  return null
}
