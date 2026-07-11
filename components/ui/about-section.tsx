"use client";
import { VerticalCutReveal } from "@/components/ui/vertical-cut-reveal";
import { ArrowRight } from "lucide-react";

/**
 * About section. Previously animated scroll-into-view reveals via
 * framer-motion. Animations are disabled site-wide, so this is now a
 * static composition.
 */
export default function AboutSection3() {
  return (
    <section className="py-8 px-4 bg-background border-t border-border">
      <div className="max-w-6xl mx-auto">
        <div className="relative">
          {/* Header with eyebrow */}
          <div className="flex justify-between items-center mb-8 w-[85%] absolute lg:top-4 md:top-0 sm:-top-2 -top-3 z-10">
            <div className="flex items-center gap-2 text-xl">
              <span className="text-primary" aria-hidden>✱</span>
              <span className="eyebrow">WHO WE ARE</span>
            </div>
          </div>

          {/* Decorative SVG image */}
          <figure className="relative group">
            <svg className="w-full" width="100%" height="100%" viewBox="0 0 100 40">
              <defs>
                <clipPath id="clip-inverted" clipPathUnits="objectBoundingBox">
                  <path
                    d="M0.0998072 1H0.422076H0.749756C0.767072 1 0.774207 0.961783 0.77561 0.942675V0.807325C0.777053 0.743631 0.791844 0.731953 0.799059 0.734076H0.969813C0.996268 0.730255 1.00088 0.693206 0.999875 0.675159V0.0700637C0.999875 0.0254777 0.985045 0.00477707 0.977629 0H0.902473C0.854975 0 0.890448 0.138535 0.850165 0.138535H0.0204424C0.00408849 0.142357 0 0.180467 0 0.199045V0.410828C0 0.449045 0.0136283 0.46603 0.0204424 0.469745H0.0523086C0.0696245 0.471019 0.0735527 0.497877 0.0733523 0.511146V0.915605C0.0723903 0.983121 0.090588 1 0.0998072 1Z"
                    fill="#D9D9D9"
                  />
                </clipPath>
              </defs>
              <image
                clipPath="url(#clip-inverted)"
                preserveAspectRatio="xMidYMid slice"
                width="100%"
                height="100%"
                xlinkHref="https://images.unsplash.com/photo-1718601980986-0ce75101d52d?w=1200&auto=format&fit=crop"
              />
            </svg>
          </figure>

          {/* Stats */}
          <div className="flex flex-wrap lg:justify-start justify-between items-center py-3 text-sm">
            <div className="lg:absolute right-0 bottom-16 flex lg:flex-col flex-row-reverse lg:gap-0 gap-4">
              <div className="flex lg:text-4xl sm:text-3xl text-2xl items-center gap-2 mb-2">
                <span className="text-primary font-semibold">100+</span>
                <span className="text-muted-foreground uppercase">brands</span>
              </div>
              <div className="flex items-center gap-2 mb-2 sm:text-base text-xs">
                <span className="text-primary font-bold">30%</span>
                <span className="text-muted-foreground">higher engagement</span>
                <span className="text-border lg:hidden block">|</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <h2 className="sm:text-4xl md:text-5xl text-2xl !leading-[110%] font-bold text-foreground mb-8">
              <VerticalCutReveal
                splitBy="words"
                staggerDuration={0.1}
                staggerFrom="first"
                reverse={true}
              >
                Crafting Messages That Stand the Test of Time.
              </VerticalCutReveal>
            </h2>

            <div className="grid md:grid-cols-2 gap-8 text-muted-foreground">
              <div className="sm:text-base text-xs">
                <p className="leading-relaxed text-justify">
                  Seal builds tools that help people communicate across
                  time. Our Capsule platform lets you schedule messages —
                  text, audio, video or image — for future delivery to anyone.
                </p>
              </div>
              <div className="sm:text-base text-xs">
                <p className="leading-relaxed text-justify">
                  Whether it{''}s a private note to a loved one or a shared moment
                  unlocked together on a future date, every message matters.
                  We ensure your words arrive exactly when they should.
                </p>
              </div>
            </div>
          </div>

          <div className="md:col-span-1">
            <div className="text-right">
              <div className="mb-6">
                <p className="text-foreground font-medium mb-4">
                  Ready to send a message to the future?
                </p>
              </div>

              <a
                href="/sign-up"
                className="btn bg-primary text-primary-foreground ml-auto w-fit"
              >
                GET STARTED <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
