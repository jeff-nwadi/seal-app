"use client";

// All motion components have been replaced with plain elements.
// Animations are disabled site-wide (see `app/globals.css`) so the
// `motion.div` wrappers weren't doing anything visually — they were
// just adding a hydration step that briefly hid the content before
// the CSS rule forced it back to opacity 1. Rendering plain HTML
// skips that flash.
import { ArrowRight } from "lucide-react";

export function GlowyWavesHero() {
  return (
    <section
      className="relative isolate flex min-h-screen w-full items-center justify-center overflow-hidden bg-background"
      role="region"
      aria-label="Seal Capsule hero section"
    >
      {/* Soft primary glow overlay */}
      <div className="absolute inset-0 z-[1] pointer-events-none">
        <div className="absolute left-1/2 top-0 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-primary/[0.06] blur-[140px]" />
        <div className="absolute bottom-0 right-0 h-[360px] w-[360px] rounded-full bg-primary/[0.04] blur-[120px]" />
      </div>

      {/* Hero content */}
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center px-6 py-24 text-center md:px-8 lg:px-12">
        <div className="w-full">
          <p className="eyebrow mb-6 tracking-tight">Time-sealed messages</p>

          <h1 className="mb-6 text-4xl flex flex-col font-bold tracking-tight text-foreground md:text-6xl lg:text-7xl">
            <span>Send a message </span>
            <span>to the future</span>
          </h1>

          <p className="mx-auto mb-10 max-w-3xl text-lg text-muted-foreground md:text-xl">
            Capsule lets you schedule a message text, audio, video or image
            for future delivery. Share privately or contribute to a public wall
            that unlocks together on a shared date.
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
