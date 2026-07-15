'use client';

/**
 * Final call-to-action on the landing page.
 *
 * Simple by design: one short headline, one supporting line, and two
 * clear actions (primary "Get started" + secondary "Sign in"). The
 * old version was a marquee with five audience tags — a lot of
 * visual noise for the very last thing a visitor sees. This single,
 * calm card is easier to act on.
 *
 * Layout: a centered, brand-aligned card on the light background.
 * No animations, no marquee, no inline transforms — the global CSS
 * would kill them anyway.
 */
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ButtonLink } from '@/components/ui/button-link';

export function FinalCTA() {
  return (
    <section
      id="get-started"
      className="bg-background border-y border-border"
    >
      <div className="mx-auto max-w-3xl px-6 py-24 text-center md:px-8 md:py-32">
        <span className="eyebrow mb-4 block">Ready when you are</span>
        <h2 className="text-balance text-4xl font-bold tracking-tight text-foreground md:text-5xl">
          Seal a message for someone you love.
        </h2>
        <p className="mx-auto mb-10 mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
          Free to start. Schedule a note, an audio clip, or a video and
          we’ll deliver it on the date you pick.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <ButtonLink
            href="/sign-up"
            className="h-12 px-7 rounded-full text-base font-semibold"
          >
            Get started
            <ArrowRight className="size-4" aria-hidden />
          </ButtonLink>
          <ButtonLink
            href="/sign-in"
            variant="outline"
            className="h-12 px-7 rounded-full text-base"
          >
            I already have an account
          </ButtonLink>
        </div>

        <p className="mt-8 text-xs text-muted-foreground">
          No credit card. No app store. Open the link and you're in.
        </p>

        <div className="mt-10 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Link
            href="#features"
            className="underline underline-offset-4 hover:text-foreground"
          >
            See what&apos;s inside
          </Link>
          <span aria-hidden>·</span>
          <Link
            href="#install"
            className="underline underline-offset-4 hover:text-foreground"
          >
            Install as a web app
          </Link>
        </div>
      </div>
    </section>
  );
}

export default FinalCTA;
