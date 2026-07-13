'use client';

/**
 * "Install Seal" landing-page section.
 *
 * The primary install surface on the landing page. Renders a large,
 * centered install button that:
 *   1. **Captures the browser's `beforeinstallprompt`** event so we can
 *      trigger the native install dialog on demand (the browser would
 *      otherwise show a tiny auto-mini-infobar at some unpredictable
 *      moment, which is easy to miss).
 *   2. **Pops the prompt up on click** — the button label literally
 *      says "Install Seal" so the action is unambiguous.
 *   3. **Falls back to manual instructions on iOS**, where the
 *      `beforeinstallprompt` event doesn't fire (Apple doesn't allow
 *      programmatic installs).
 *
 * The component self-hides once the app is installed (`display-mode:
 * standalone` or `navigator.standalone`), so users who already have
 * it don't see a no-op button.
 */
import React from 'react';
import { Smartphone, Wifi, Bell, Download, Check, Share, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn, handleEmDash } from '@/lib/utils';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

type InstallState = "hidden" | "available" | "ios" | "installed"

function isStandalone(): boolean {
  if (typeof window === "undefined") return false
  if (
    "standalone" in navigator &&
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  ) {
    return true
  }
  return window.matchMedia("(display-mode: standalone)").matches
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window)
}

const benefits = [
  {
    Icon: Smartphone,
    title: 'On your home screen',
    body: 'Seal launches like a regular app — no browser bar, no tab to dig out.',
  },
  {
    Icon: Wifi,
    title: 'Works offline',
    body: 'Open a saved capsule even with no signal. Drafts and your dashboard are cached.',
  },
  {
    Icon: Bell,
    title: 'Push delivery',
    body: 'When a capsule unlocks, your phone tells you — no need to keep this site open.',
  },
]

export function InstallSection() {
  const [state, setState] = React.useState<InstallState>("hidden")
  const [deferred, setDeferred] =
    React.useState<BeforeInstallPromptEvent | null>(null)
  const [showIosHelp, setShowIosHelp] = React.useState(false)
  const [installResult, setInstallResult] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (typeof window === "undefined") return
    if (isStandalone()) {
      setState("installed")
      return
    }
    if (isIos()) {
      setState("ios")
      return
    }
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
      setState("available")
    }
    const onInstalled = () => {
      setState("installed")
      setDeferred(null)
    }
    window.addEventListener("beforeinstallprompt", onPrompt)
    window.addEventListener("appinstalled", onInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

  const onInstallClick = React.useCallback(async () => {
    if (state === "ios") {
      setShowIosHelp((v) => !v)
      return
    }
    if (!deferred) {
      // Browser hasn't fired the prompt yet (or dismissed and won't
      // re-fire this session). Tell the user what to do as a fallback.
      setInstallResult(
        "Your browser hasn't enabled the install prompt yet. Try the browser's " +
          "menu (⋮ or ⌄) → \"Install Seal\" or \"Add to Home Screen\".",
      )
      return
    }
    try {
      // This is the call that pops the native install dialog up.
      await deferred.prompt()
      const choice = await deferred.userChoice
      setInstallResult(
        choice.outcome === "accepted"
          ? "Installing Seal — check your home screen in a moment."
          : "No worries — the option will be here whenever you're ready.",
      )
      setDeferred(null)
      if (choice.outcome !== "accepted") {
        // Respect the dismissal. The button stays visible but goes
        // into a "dismissed" state until the user does something to
        // re-trigger the browser's prompt (e.g. another visit).
      }
    } catch (err) {
      setInstallResult(
        "Something blocked the install prompt. Open the browser menu and look for " +
          '"Install Seal" or "Add to Home Screen".',
      )
      console.warn("[install] prompt failed", err)
    }
  }, [state, deferred])

  if (state === "installed") {
    return (
      <section
        id="install"
        className="py-16 px-4 bg-background border-t border-border"
      >
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground">
            <Check className="size-4 text-primary" aria-hidden />
            Seal is installed on this device.
          </div>
        </div>
      </section>
    )
  }

  return (
    <section
      id="install"
      className="py-20 px-4 bg-background border-t border-border"
    >
      <div className="max-w-5xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="eyebrow mb-3 block">Install Seal</span>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-foreground">
            Add Seal to your home screen
          </h2>
          <p className="text-muted-foreground text-sm md:text-base">
            {handleEmDash("Seal is a Progressive Web App. Tap the button — your browser will pop up the install dialog and Seal lands on your home screen in seconds.", "period")}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3 mb-10">
          {benefits.map(({ Icon, title, body }) => (
            <Card key={title} className="bg-card">
              <CardContent className="p-6 space-y-3">
                <div className="inline-flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="size-5" aria-hidden />
                </div>
                <h3 className="text-base font-semibold text-foreground">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{handleEmDash(body, "period")}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-col items-center gap-4">
          {/* The big, obvious install button. */}
          <Button
            onClick={onInstallClick}
            size="lg"
            className="rounded-full h-14 px-8 text-base font-semibold shadow-lg"
            aria-label={
              state === "ios"
                ? "Show steps to install Seal on iOS"
                : "Install Seal — opens your browser's install dialog"
            }
          >
            <Download className="size-5" aria-hidden />
            {state === "ios" ? "Install on iPhone" : "Install Seal — it's free"}
          </Button>

          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Check className="size-3.5" aria-hidden />
            No app store. No download. Click the button and the install
            dialog pops up.
          </p>

          {installResult && (
            <p
              role="status"
              className="text-sm text-muted-foreground max-w-md text-center mt-2"
            >
              {installResult}
            </p>
          )}

          {state === "ios" && showIosHelp && (
            <IosHelpCard onClose={() => setShowIosHelp(false)} />
          )}
        </div>
      </div>
    </section>
  )
}

function IosHelpCard({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-label="How to install Seal on iOS"
      className={cn(
        "mt-4 w-full max-w-md rounded-xl border border-border bg-card p-5 text-left shadow-lg",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold">Install on iPhone</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
      <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
        <li className="flex items-start gap-2">
          <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
            1
          </span>
          <span>
            Tap the <Share className="inline size-3.5 align-text-bottom" aria-hidden /> Share
            button in Safari.
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
            2
          </span>
          <span>Scroll and choose &ldquo;Add to Home Screen&rdquo;.</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
            3
          </span>
          <span>{handleEmDash('Tap "Add" — Seal opens from your home screen.', "period")}</span>
        </li>
      </ol>
    </div>
  )
}

export default InstallSection
