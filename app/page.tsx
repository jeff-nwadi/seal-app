'use client';
import React from 'react';
import { Navbar } from "@/components/Navbar";
import { GlowyWavesHero } from "@/components/ui/glowy-waves-hero-shadcnui";
import { Feature } from "@/components/Feature";
import { HowItWorks } from "@/components/HowItWorks";
import { About } from "@/components/About";
import { CTA } from "@/components/CTA";
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

			{/* CTA Section */}
			<CTA />

			{/* Footer Section */}
			<Footer />
		</div>
	);
}
