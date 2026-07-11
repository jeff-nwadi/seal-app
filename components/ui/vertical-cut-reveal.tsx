'use client'

/**
 * Vertical-cut-reveal text.
 *
 * Originally wrapped each character in a framer-motion `<motion.span>`
 * that slid into place on mount. Animations are disabled site-wide
 * (see `app/globals.css`) so the per-character split adds zero visual
 * value but real hydration cost. Now it just renders the plain text.
 *
 * IMPORTANT: many of the framer-motion-era props (`splitBy`,
 * `staggerDuration`, `staggerFrom`, `reverse`, `transition`,
 * `wordLevelClassName`, `elementLevelClassName`, `autoStart`,
 * `onStart`, `onComplete`) are not valid HTML attributes. We have to
 * strip them before spreading the rest onto the underlying `<span>`,
 * or React warns about an unknown DOM prop.
 */
import { forwardRef, type HTMLAttributes, type MouseEventHandler } from "react"
import { cn } from "@/lib/utils"

interface TextProps {
  children: React.ReactNode
  reverse?: boolean
  transition?: unknown
  splitBy?: "words" | "characters" | "lines" | string
  staggerDuration?: number
  staggerFrom?: "first" | "last" | "center" | "random" | number
  containerClassName?: string
  wordLevelClassName?: string
  elementLevelClassName?: string
  onClick?: MouseEventHandler<HTMLSpanElement>
  onStart?: () => void
  onComplete?: () => void
  autoStart?: boolean
  reducedMotion?: boolean
}

export interface VerticalCutRevealRef {
  startAnimation: () => void
  reset: () => void
}

const VerticalCutReveal = forwardRef<VerticalCutRevealRef, TextProps & HTMLAttributes<HTMLSpanElement>>(
  (
    {
      children,
      containerClassName,
      onClick,
      // framer-motion-era props — strip before spreading onto the DOM
      reverse: _reverse,
      transition: _transition,
      splitBy: _splitBy,
      staggerDuration: _staggerDuration,
      staggerFrom: _staggerFrom,
      wordLevelClassName: _wordLevelClassName,
      elementLevelClassName: _elementLevelClassName,
      onStart: _onStart,
      onComplete: _onComplete,
      autoStart: _autoStart,
      reducedMotion: _reducedMotion,
      ...domProps
    },
    ref,
  ) => {
    const text =
      typeof children === "string"
        ? children
        : (children?.toString() ?? "")
    return (
      <span
        className={cn(containerClassName)}
        onClick={onClick}
        ref={ref as React.Ref<HTMLSpanElement>}
        {...domProps}
      >
        {text}
      </span>
    )
  },
)

VerticalCutReveal.displayName = "VerticalCutReveal"

export { VerticalCutReveal }
