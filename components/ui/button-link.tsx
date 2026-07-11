"use client"

import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import type { VariantProps } from "class-variance-authority"

/**
 * `Button` in this project is built on `@base-ui/react` and doesn't accept
 * `asChild`. Use this component for any Link that should look like a Button.
 * It composes `buttonVariants` with the same variant + size API so call
 * sites stay tidy.
 */
type ButtonLinkProps = VariantProps<typeof buttonVariants> & {
  href: string
  children: React.ReactNode
  className?: string
  prefetch?: boolean
  /** Forwarded to the underlying <Link> — useful for accessibility/SEO. */
  ariaLabel?: string
  target?: string
  rel?: string
}

export function ButtonLink({
  href,
  variant,
  size,
  className,
  children,
  prefetch,
  ariaLabel,
  target,
  rel,
}: ButtonLinkProps) {
  return (
    <Link
      href={href}
      prefetch={prefetch}
      target={target}
      rel={rel}
      aria-label={ariaLabel}
      className={buttonVariants({ variant, size, className })}
    >
      {children}
    </Link>
  )
}
