"use client";

import { motion, type Variants } from "framer-motion";
import { ArrowRight } from "lucide-react";


// const heroStats: { label: string; value: string }[] = [
//   { label: "Capsules delivered", value: "12K+" },
//   { label: "Public walls created", value: "3.4K" },
//   { label: "Messages scheduled", value: "98K+" },
// ];

const containerVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, staggerChildren: 0.12 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

const statsVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.6, ease: "easeOut", staggerChildren: 0.08 },
  },
};

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
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full"
        >
          <motion.p variants={itemVariants} className="eyebrow mb-6 tracking-tight">
            Time-sealed messages
          </motion.p>

          <motion.h1
            variants={itemVariants}
            className="mb-6 text-4xl flex flex-col font-bold tracking-tight text-foreground md:text-6xl lg:text-7xl"
          >
           <span>Send a message </span> 
            <span>to the future</span>
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="mx-auto mb-10 max-w-3xl text-lg text-muted-foreground md:text-xl"
          >
            Capsule lets you schedule a message text, audio, video or image
            for future delivery. Share privately or contribute to a public wall
            that unlocks together on a shared date.
          </motion.p>

          <motion.div
            variants={itemVariants}
            className="mb-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <a href="#" className="btn bg-primary text-primary-foreground">
              Create a Capsule
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <a href="#features" className="btn btn-ghost">
              See how it works
            </a>
          </motion.div>

          {/* <motion.div
            variants={statsVariants}
            className="grid gap-4 rounded-2xl border border-border/30 bg-background/70 p-6 backdrop-blur-sm sm:grid-cols-3"
          >
            {heroStats.map((stat) => (
              <motion.div
                key={stat.label}
                variants={itemVariants}
                className="space-y-1"
              >
                <div className="text-xs tracking-[0.3em] text-muted-foreground">
                  {stat.label}
                </div>
                <div className="text-3xl font-bold text-foreground">
                  {stat.value}
                </div>
              </motion.div>
            ))}
          </motion.div> */}

        </motion.div>
      </div>
    </section>
  );
}
