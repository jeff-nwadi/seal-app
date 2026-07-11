"use client"

/**
 * Live-updating countdown to a wall's open date. Renders "X days,
 * Y hours" on a 1s interval so the locked page feels alive without
 * making a round-trip per second.
 */
import { useEffect, useState } from "react"
import { Clock } from "lucide-react"

interface Parts {
  total: number
  days: number
  hours: number
  minutes: number
  seconds: number
}

function diff(target: Date): Parts {
  const total = Math.max(0, target.getTime() - Date.now())
  const days = Math.floor(total / (1000 * 60 * 60 * 24))
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24)
  const minutes = Math.floor((total / (1000 * 60)) % 60)
  const seconds = Math.floor((total / 1000) % 60)
  return { total, days, hours, minutes, seconds }
}

export function WallCountdown({
  openDate,
  isOrganizer,
}: {
  openDate: Date
  isOrganizer: boolean
}) {
  const [parts, setParts] = useState<Parts>(() => diff(openDate))

  useEffect(() => {
    setParts(diff(openDate))
    const id = setInterval(() => setParts(diff(openDate)), 1000)
    return () => clearInterval(id)
  }, [openDate])

  if (parts.total <= 0) return null

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-6 text-center">
      <div className="flex items-center justify-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground mb-2">
        <Clock className="size-3.5" aria-hidden />
        {isOrganizer ? "Opens in" : "Unlocks in"}
      </div>
      <div
        className="grid grid-cols-4 gap-2 sm:gap-4 max-w-md mx-auto"
        role="timer"
        aria-live="polite"
      >
        <Part label="days" value={parts.days} />
        <Part label="hours" value={parts.hours} />
        <Part label="min" value={parts.minutes} />
        <Part label="sec" value={parts.seconds} />
      </div>
    </div>
  )
}

function Part({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-background px-2 py-3">
      <div className="text-2xl sm:text-3xl font-semibold tabular-nums">
        {String(value).padStart(2, "0")}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  )
}
