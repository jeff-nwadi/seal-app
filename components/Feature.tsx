'use client';

import React from 'react';
import FeatureAccordionSection from "@/components/ui/feature-accordion-section";

export function Feature() {
  return (
    <section id="features" className="py-20 px-4 bg-background border-t border-border">
      <div className="max-w-6xl mx-auto flex flex-col items-center">
        <div className="text-center max-w-2xl mb-12">
          <span className="eyebrow mb-3 block">Features Overview</span>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-foreground">
            Everything you need, built to grow
          </h2>
          <p className="text-muted-foreground text-sm md:text-base">
            Explore our cutting-edge features. Toggle through each item to see dashboard previews and highlights.
          </p>
        </div>
        <FeatureAccordionSection />
      </div>
    </section>
  );
}

export default Feature;
