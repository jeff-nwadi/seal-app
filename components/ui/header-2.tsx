'use client';
import React from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MenuToggleIcon } from '@/components/ui/menu-toggle-icon';
import { useScroll } from '@/components/ui/use-scroll';
import Link from 'next/link';
import Image from 'next/image';
import Logo from "@/public/images/Logo-seal.svg"

export function Header() {
	const [open, setOpen] = React.useState(false);
	const scrolled = useScroll(10);

	const links = [
		{ label: 'Features', href: '#features' },
		{ label: 'Pricing', href: '#pricing' },
		{ label: 'About', href: '#about' },
	];

	React.useEffect(() => {
		if (open) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}
		return () => {
			document.body.style.overflow = '';
		};
	}, [open]);

	return (
		<header
			className={cn(
				'sticky top-0 z-50 mx-auto w-full max-w-5xl border-b border-transparent md:rounded-md md:border md:transition-all md:ease-out',
				{
					'bg-background/95 supports-[backdrop-filter]:bg-background/50 border-border backdrop-blur-lg md:top-4 md:max-w-4xl ':
						scrolled && !open,
					'bg-background/90': open,
				},
			)}
		>
			<nav
				className={cn(
					'flex h-14 w-full items-center justify-between px-4 md:h-12 md:transition-all md:ease-out',
					{ 'md:px-2': scrolled },
				)}
			>
				{/* Brand wordmark */}
				<Link href="/" aria-label="Seal home">
					<WordmarkIcon className="h-4" />
				</Link>

				{/* Desktop links */}
				<div className="hidden items-center gap-2 md:flex">
					{links.map((link, i) => (
						<a key={i} className={buttonVariants({ variant: 'ghost' })} href={link.href}>
							{link.label}
						</a>
					))}
					<Button variant="outline" className="rounded-full">Sign In</Button>
					<Button className="rounded-full">Get Started</Button>
				</div>

				{/* Mobile toggle */}
				<Button
					size="icon"
					variant="outline"
					onClick={() => setOpen(!open)}
					className="md:hidden"
					aria-label={open ? 'Close menu' : 'Open menu'}
				>
					<MenuToggleIcon open={open} className="size-5" duration={300} />
				</Button>
			</nav>

			{/* Mobile drawer */}
			<div
				className={cn(
					'bg-background/90 fixed top-14 right-0 bottom-0 left-0 z-50 flex flex-col overflow-hidden border-y md:hidden',
					open ? 'block' : 'hidden',
				)}
			>
				<div
					data-slot={open ? 'open' : 'closed'}
					className={cn(
						'data-[slot=open]:animate-in data-[slot=open]:zoom-in-95 data-[slot=closed]:animate-out data-[slot=closed]:zoom-out-95 ease-out',
						'flex h-full w-full flex-col justify-between gap-y-2 p-4',
					)}
				>
					<div className="grid gap-y-2">
						{links.map((link) => (
							<a
								key={link.label}
								className={buttonVariants({ variant: 'ghost', className: 'justify-start' })}
								href={link.href}
								onClick={() => setOpen(false)}
							>
								{link.label}
							</a>
						))}
					</div>
					<div className="flex flex-col gap-2">
						<Button variant="outline" className="w-full rounded-full">Sign In</Button>
						<Button className="w-full rounded-full">Get Started</Button>
					</div>
				</div>
			</div>
		</header>
	);
}

export const WordmarkIcon = (props: React.ComponentProps<'div'>) => (
	<div className={cn("flex items-center gap-2 font-bold text-lg text-foreground font-sans", props.className)}>
		{/* Seal logo — concentric circle with envelope motif */}
		<Image src={Logo} alt="Seal logo" width={28} height={28} />
		<span className="tracking-widest uppercase logo font-bold text-foreground">Seal</span>
	</div>
);
