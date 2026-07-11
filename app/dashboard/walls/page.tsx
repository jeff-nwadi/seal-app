import Link from "next/link"
import { Users, Plus, Lock, Unlock, Calendar, Hash } from "lucide-react"
import { getWalls } from "@/lib/dashboard/queries"
import type { Wall } from "@/lib/dashboard/queries"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ButtonLink } from "@/components/ui/button-link"
import { Badge } from "@/components/ui/badge"

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function timeUntil(iso: string): { isUnlocked: boolean; label: string } {
  const target = new Date(iso).getTime()
  const now = Date.now()
  if (target <= now) {
    return { isUnlocked: true, label: "Unlocked" }
  }
  const days = Math.ceil((target - now) / (1000 * 60 * 60 * 24))
  if (days < 30) return { isUnlocked: false, label: `${days} day${days === 1 ? "" : "s"}` }
  const months = Math.ceil(days / 30)
  return {
    isUnlocked: false,
    label: `${months} month${months === 1 ? "" : "s"}`,
  }
}

function WallCard({ wall }: { wall: Wall }) {
  const t = timeUntil(wall.openDate)
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <div className="min-w-0">
          <CardTitle className="truncate">{wall.name}</CardTitle>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Hash className="size-3" />
            {wall.slug}
          </p>
        </div>
        <Badge
          variant={t.isUnlocked ? "default" : "outline"}
          className="shrink-0 gap-1"
        >
          {t.isUnlocked ? (
            <Unlock className="size-3" aria-hidden />
          ) : (
            <Lock className="size-3" aria-hidden />
          )}
          {t.label}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="size-4" aria-hidden />
          <span>
            {t.isUnlocked ? "Opened" : "Opens"} {formatDate(wall.openDate)}
          </span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="size-4" aria-hidden />
          <span>
            {wall.contributions} contribution
            {wall.contributions === 1 ? "" : "s"}
          </span>
        </div>
        <div className="pt-1">
          <ButtonLink href={`/walls/${wall.id}`} variant="outline" size="sm" className="w-full">
            View wall
          </ButtonLink>
        </div>
      </CardContent>
    </Card>
  )
}

function WallGroup({
  title,
  walls,
  emptyMessage,
}: {
  title: string
  walls: Wall[]
  emptyMessage: string
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </h2>
        <span className="text-xs text-muted-foreground">
          {walls.length} {walls.length === 1 ? "wall" : "walls"}
        </span>
      </div>
      {walls.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {walls.map((w) => (
            <WallCard key={w.id} wall={w} />
          ))}
        </div>
      )}
    </section>
  )
}

export const metadata = {
  title: "Walls — Dashboard",
}

// Walls the user organizes or contributes to change every time they
// create / contribute / unlock one. Always re-fetch on navigation.
export const dynamic = "force-dynamic"

export default async function DashboardWallsPage() {
  const walls = await getWalls()
  const organize = walls.filter((w) => w.role === "organizer")
  const contribute = walls.filter((w) => w.role === "contributor")

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Walls</h1>
          <p className="text-sm text-muted-foreground">
            Public capsules that unlock for everyone on a shared date.
          </p>
        </div>
        <ButtonLink href="/walls/new">
          <Plus className="size-4" />
          New wall
        </ButtonLink>
      </div>

      <WallGroup
        title="You organize"
        walls={organize}
        emptyMessage="You haven't started a wall yet."
      />

      <WallGroup
        title="You contribute to"
        walls={contribute}
        emptyMessage="You haven't added to anyone else's wall yet."
      />
    </>
  )
}
