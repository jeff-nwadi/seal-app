import React from "react";
import { Navbar } from "@/components/Navbar";
import { DottedSurface } from "@/components/ui/dotted-surface";
import { DottedSurfaceHero } from "@/components/ui/dotted-surface-hero";
import { Feature } from "@/components/Feature";
import { HowItWorks } from "@/components/HowItWorks";
import { About } from "@/components/About";
import { InstallSection } from "@/components/InstallSection";
import { FinalCTA } from "@/components/FinalCTA";
import { Footer } from "@/components/Footer";

/**
 * Landing page composition.
 *
 * The page is a server component — none of the work here is
 * client-only. The fixed dotted-particle background is rendered once at
 * the page root (not inside the hero) so the texture spans every
 * section without each one having to mount its own canvas. `pointer-
 * events-none` on the canvas means clicks pass through to the
 * content underneath.
 */
export default function Home() {
	return (
		<div className="relative w-full min-h-screen bg-background text-foreground">
			{/* Fixed dotted particle field — sits behind every section.
			    DottedSurface is a client component; importing it from a
			    server component is fine because Next.js will cross the
			    boundary for us. */}
			<DottedSurface />

			<Navbar />

			{/* Hero — same dot background (the surface is fixed), the hero
			    itself is just a content layer. */}
			<DottedSurfaceHero />

			{/* About */}
			<About />

			{/* Features */}
			<Feature />

			{/* How it works */}
			<HowItWorks />

			{/* Install-as-app callout. Lives before the final CTA so
			    visitors see the option at least once before they convert. */}
			<InstallSection />

			{/* Final CTA — simple, single message, two actions. */}
			<FinalCTA />

			<Footer />
		</div>
	);
}
