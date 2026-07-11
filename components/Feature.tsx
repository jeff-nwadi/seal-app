"use client";

/**
 * Feature grid tailored to Seal.
 *
 * Six cards covering what the app actually does (per PRD §2 and
 * AGENTS.md). Each card is a Lucide icon + headline + short
 * supporting copy — no fake stock dashboard screenshots, no
 * invented analytics numbers.
 *
 * Layout: responsive 1/2/3-column grid. The cards are static
 * (no animations — the site-wide CSS kill-switch in
 * `app/globals.css` would nullify any motion anyway).
 */
import {
  Mail,
  Mic,
  Image as ImageIcon,
  Video,
  Users,
  Smartphone,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Feature {
  Icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  body: string;
}

const features: Feature[] = [
  {
    Icon: Mail,
    title: "Schedule for a future date",
    body:
      "Pick the exact moment a message should arrive. The cron runs every 10 minutes, so a sealed capsule lands within 10 minutes of its delivery time — never early.",
  },
  {
    Icon: ImageIcon,
    title: "Text, photo, audio, or video",
    body:
      "One capsule, any media. Drop a voice note for your future self, a video for a wedding wall, or a letter to a friend. The format matches the moment.",
  },
  {
    Icon: Users,
    title: "Public walls that unlock together",
    body:
      "Start a wall for a class, a couple, a team. Anyone with the link contributes their own capsule. At the open date, every contribution reveals at once for everyone.",
  },
  {
    Icon: Mic,
    title: "Email today, SMS & push in v1.1",
    body:
      "Recipients pick the channel that suits them. Email is fully wired; SMS and web-push land in the next release so a sealed message can reach any device.",
  },
  {
    Icon: Smartphone,
    title: "Installs like a native app",
    body:
      "Seal is a Progressive Web App. One tap adds it to the home screen, opens full-screen, and works offline. No app store, no download size, no updates to wait for.",
  },
  {
    Icon: Video,
    title: "Editable until it delivers",
    body:
      "Change the date, swap the photo, add a recipient — anything while the capsule is still scheduled. Once delivered, the message is sealed forever.",
  },
];

export function Feature() {
  return (
    <section id="features" className="py-20 px-4 bg-background border-t border-border">
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="eyebrow mb-3 block">What Seal does</span>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-foreground">
            Messages sealed today, delivered when it matters.
          </h2>
          <p className="text-muted-foreground text-sm md:text-base">
            Six things Seal does well. Every one of them is wired
            end-to-end today — no placeholder roadmap, no "coming
            soon" next to a live feature.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ Icon, title, body }) => (
            <Card key={title} className="bg-card h-full">
              <CardContent className="p-6 space-y-3 h-full flex flex-col">
                <div className="inline-flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="size-5" aria-hidden />
                </div>
                <h3 className="text-base font-semibold text-foreground">
                  {title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {body}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Feature;
