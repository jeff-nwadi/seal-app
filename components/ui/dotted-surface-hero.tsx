"use client";

// Hero section. The dotted particle field is rendered once at the page
// root in `app/page.tsx` (fixed behind all sections), so this component
// only paints the content layer + the two brand-purple glows that sit
// on top of the dots to give the headline visual weight.
//
// `pointer-events-none` on the glow layer means clicks pass through to
// the CTAs underneath.
import { ArrowRight } from "lucide-react";

export function DottedSurfaceHero() {
  return (
    <section
      id="hero"
      className="relative isolate flex min-h-screen w-full items-center justify-center overflow-hidden bg-background"
      role="region"
      aria-label="Seal Capsule hero section"
    >
      {/* Soft brand-purple glows on top of the dots. */}
      <div className="absolute inset-0 z-[1] pointer-events-none">
        <div className="absolute left-1/2 top-0 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[#3513A5]/[0.10] blur-[140px]" />
        <div className="absolute bottom-0 right-0 h-[360px] w-[360px] rounded-full bg-[#3513A5]/[0.06] blur-[120px]" />
      </div>

      {/* Hero content — centered single-column with a tighter measure on
         the subhead so it doesn't sprawl across the viewport. */}
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center px-6 py-24 text-center md:px-8 lg:px-12">
        <div className="w-full">
          <p className="eyebrow mb-6 tracking-tight">Time-sealed messages</p>

          <h1 className="mb-6 text-balance text-4xl font-bold tracking-tight text-foreground md:text-6xl lg:text-7xl">
            Send a message to the future
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-balance text-base text-muted-foreground md:text-lg">
            Capsule lets you schedule a message — text, audio, video, or
            image — for future delivery. Share privately, or contribute to a
            public wall that unlocks together on a shared date.
          </p>

          <div className="mb-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href="/sign-up" className="btn bg-primary text-primary-foreground">
              Create a Capsule
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <a href="#features" className="btn btn-ghost">
              See how it works
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
