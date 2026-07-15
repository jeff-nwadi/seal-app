'use client';

import React from 'react';
import { HowItWorks as HowItWorksSection } from "@/components/ui/how-it-works";

export function HowItWorks() {
  // The inner section uses `id="how-it-works"`; the header nav links to
  // `#how` so the active section is unambiguous from the URL alone.
  return (
    <div id="how">
      <HowItWorksSection />
    </div>
  );
}

export default HowItWorks;
