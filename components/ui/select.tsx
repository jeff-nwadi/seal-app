"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface SelectOption {
  label: string
  value: string
}

/**
 * Minimal native `<select>` styled to match the project's `Input`
 * primitive. We don't reach for Radix Select here — the option set is
 * small (4 content types, 3 channels) and the form lives inside a
 * Server Component wrapper that doesn't benefit from a portal.
 */
const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & {
    options: SelectOption[]
    placeholder?: string
  }
>(({ className, options, placeholder, ...props }, ref) => {
  return (
    <select
      ref={ref}
      data-slot="select"
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50",
        className,
      )}
      {...props}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
})
Select.displayName = "Select"

export { Select }
