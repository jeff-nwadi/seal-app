"use client";

import { cn } from "@/lib/utils";
import { Layers, Search, Zap } from "lucide-react";
import type React from "react";

// The main props for the HowItWorks component
interface HowItWorksProps extends React.HTMLAttributes<HTMLElement> {}

// The props for a single step card
interface StepCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  benefits: string[];
}

/**
 * A single step card within the "How It Works" section.
 * It displays an icon, title, description, and a list of benefits.
 */
const StepCard: React.FC<StepCardProps> = ({
  icon,
  title,
  description,
  benefits,
}) => (
  <div
    className={cn(
      "relative rounded-2xl border border-border bg-card p-6 text-card-foreground transition-all duration-300 ease-in-out",
      "hover:scale-105 hover:shadow-lg hover:border-primary/50 hover:bg-muted"
    )}
  >
    {/* Icon */}
    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-primary">
      {icon}
    </div>
    {/* Title and Description */}
    <h3 className="mb-2 text-xl font-semibold text-foreground">{title}</h3>
    <p className="mb-6 text-muted-foreground text-sm leading-relaxed">{description}</p>
    {/* Benefits List */}
    <ul className="space-y-3">
      {benefits.map((benefit, index) => (
        <li key={index} className="flex items-center gap-3">
          <div className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-primary/20">
            <div className="h-2 w-2 rounded-full bg-primary"></div>
          </div>
          <span className="text-muted-foreground text-xs font-medium">{benefit}</span>
        </li>
      ))}
    </ul>
  </div>
);

/**
 * A responsive "How It Works" section that displays a 3-step process.
 * It is styled with shadcn/ui theme variables to support light and dark modes.
 */
export const HowItWorks: React.FC<HowItWorksProps> = ({
  className,
  ...props
}) => {
  const stepsData = [
    {
      icon: <Search className="h-6 w-6" />,
      title: "Write your message",
      description:
        "Type, record, or upload a text, audio, video, or image capsule. Add a recipient, or contribute it to a shared wall.",
      benefits: [
        "Any media — one capsule, one flow",
        "Pick a single recipient or a public wall",
        "Saves as a draft until you're ready",
      ],
    },
    {
      icon: <Layers className="h-6 w-6" />,
      title: "Pick the delivery date",
      description:
        "Choose the exact moment your capsule should arrive. We store it encrypted until then — no one sees it early.",
      benefits: [
        "Date and time, down to the minute",
        "Editable until the moment it delivers",
        "Once sealed, the content is permanent",
      ],
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: "We deliver it on time",
      description:
        "A scheduled job runs every 10 minutes and dispatches any capsule whose delivery moment has arrived — by email today, SMS and push soon.",
      benefits: [
        "Email channel is live today",
        "SMS and web-push in the next release",
        "Wall contributions unlock together on open_date",
      ],
    },
  ];

  return (
    <section
      id="how-it-works"
      className={cn("w-full bg-background border-y border-border", className)}
      {...props}
    >
      <div className="mx-auto max-w-6xl px-6 py-24 md:px-8 md:py-32 lg:px-12">
        {/* Section Header */}
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <span className="eyebrow mb-3 block">Process</span>
          <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            How it works
          </h2>
          <p className="mt-4 text-sm text-muted-foreground md:text-base">
            Our service uses advanced technologies for instant auto parts search
            across thousands of stores in your city
          </p>
        </div>

        {/* Step Indicators with Connecting Line */}
        <div className="relative mx-auto mb-12 w-full max-w-4xl">
          <div
            aria-hidden="true"
            className="absolute left-[16.6667%] top-1/2 h-[1px] w-[66.6667%] -translate-y-1/2 bg-border"
          ></div>
          {/* Use grid to align numbers with the card grid below */}
          <div className="relative grid grid-cols-3">
            {stepsData.map((_, index) => (
              <div
                key={index}
                // Center the number within its grid column
                className="flex h-8 w-8 items-center justify-center justify-self-center rounded-full bg-muted font-semibold text-foreground ring-4 ring-background text-sm"
              >
                {index + 1}
              </div>
            ))}
          </div>
        </div>

        {/* Steps Grid */}
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-3">
          {stepsData.map((step, index) => (
            <StepCard
              key={index}
              icon={step.icon}
              title={step.title}
              description={step.description}
              benefits={step.benefits}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
