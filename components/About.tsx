'use client';

import React from 'react';
import AboutSection3 from "@/components/ui/about-section";

export function About() {
  // The inner section already carries `id="about"`, so the nav link
  // `href="#about"` lands on it directly.
  return <AboutSection3 />;
}

export default About;
