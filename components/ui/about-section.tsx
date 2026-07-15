"use client";

import {
  Mail,
  Mic,
  Image as ImageIcon,
  Video,
  Users,
  Smartphone,
} from "lucide-react";

/**
 * About section — what Seal is, who it is for, what you can do with it.
 *
 * Layout (Flipghost-style calm two-column):
 *   1. Centered header block — eyebrow, headline, intro paragraph.
 *   2. Two-column body — short story on the left, "what you can do"
 *      bullet list on the right.
 *   3. Hairline divider at the bottom, so the section rhythm matches
 *      the rest of the landing page.
 *
 * No imagery, no inline stats, no signup button — those live in the
 * hero and the FinalCTA. This section reads as one calm block of
 * prose so it doesn't compete with the page's primary CTAs.
 */
export default function AboutSection3() {
  return (
    <section
      id="about"
      className="bg-background"
    >
      <div className="mx-auto max-w-6xl px-6 py-24 md:px-8 md:py-32 lg:px-12">
        {/* Header */}
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <span className="eyebrow mb-3 block">About Seal</span>
          <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            A time capsule for the things you want to say at the right moment.
          </h2>
          <p className="mt-5 text-base text-muted-foreground md:text-lg">
            Seal is a small tool for one of the oldest feelings — wanting
            to tell someone something, and wanting to time it just right.
          </p>
        </div>

        {/* Two-column body */}
        <div className="grid gap-14 md:grid-cols-2 md:gap-16">
          {/* Left — the story */}
          <div className="space-y-5 text-base leading-relaxed text-muted-foreground">
            <p>
              We built Seal because the messages that matter most are
              rarely the ones we send in the moment. The birthday card
              you wish you&apos;d mailed. The note to your future self on
              the morning of a big change. The video for the people you
              love, opened together on a date that means something.
            </p>
            <p>
              Capsule is the medium. You write it today, pick a date, and
              we hold onto it until then — privately to one recipient, or
              as a contribution to a public wall that unlocks for
              everyone at the same moment.
            </p>
            <p>
              We don&apos;t add reactions, comments, or analytics. We just
              make sure your words arrive exactly when they should, on the
              channel the recipient prefers.
            </p>
          </div>

          {/* Right — what you can do */}
          <div>
            <p className="eyebrow mb-5 block">What you can do</p>
            <ul className="space-y-5">
              <Capability
                icon={Mail}
                title="Send a private message to one person"
                body="A letter, a voice note, a video. Sealed until the date you pick."
              />
              <Capability
                icon={Users}
                title="Start a wall that unlocks together"
                body="A wedding, a class reunion, a team milestone. Anyone with the link contributes their own capsule."
              />
              <Capability
                icon={ImageIcon}
                title="Use any media — text, audio, video, or image"
                body="One capsule, one flow. The format matches the moment."
              />
              <Capability
                icon={Smartphone}
                title="Reach them on the channel they prefer"
                body="Email today. SMS and web-push in the next release."
              />
            </ul>
          </div>
        </div>
      </div>

      {/* Hairline divider — same rhythm as the rest of the page */}
      <div className="mx-auto max-w-6xl px-6 md:px-8 lg:px-12">
        <div className="hairline" />
      </div>
    </section>
  );
}

function Capability({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  body: string;
}) {
  return (
    <li className="flex items-start gap-4">
      <span
        className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
        aria-hidden
      >
        <Icon className="size-4" />
      </span>
      <div>
        <p className="text-base font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {body}
        </p>
      </div>
    </li>
  );
}
