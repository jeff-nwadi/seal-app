'use client';
import React from 'react';
import { Navbar } from "@/components/Navbar";
import { GlowyWavesHero } from "@/components/ui/glowy-waves-hero-shadcnui";
import { Feature } from "@/components/Feature";
import { HowItWorks } from "@/components/HowItWorks";
import { About } from "@/components/About";
import { InstallSection } from "@/components/InstallSection";
import { FinalCTA } from "@/components/FinalCTA";
import { Footer } from "@/components/Footer";

export default function Home() {
	return (
		<div className="w-full min-h-screen bg-background">
			<Navbar />

			{/* Main Hero Section */}
			<GlowyWavesHero />

			{/* About Section */}
			<About />

			{/* Feature Section */}
			<Feature />

			{/* How It Works Section */}
			<HowItWorks />

			{/* Install-as-app callout. Lives before the final CTA so
			    visitors see the option at least once before they convert. */}
			<InstallSection />

			{/* Final CTA — simple, single message, two actions. */}
			<FinalCTA />

			{/* Footer Section */}
			<Footer />
		</div>
	);
}
