import Link from "next/link"
import { Users, Plus, Lock, Unlock, Calendar, Hash } from "lucide-react"
import { getWalls, type Wall } from "@/lib/dashboard/queries"
import { getSession } from "@/lib/auth"
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

function WallGrid({ walls }: { walls: Wall[] }) {
  if (walls.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No walls yet.
        </CardContent>
      </Card>
    )
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {walls.map((w) => (
        <WallCard key={w.id} wall={w} />
      ))}
    </div>
  )
}

// Walls change every time the user creates / contributes / unlocks one.
// Always re-fetch on navigation so the index is consistent with the
// dashboard view at /dashboard/walls.
export const dynamic = "force-dynamic"

export default async function WallsIndexPage() {
  const session = await getSession()

  // Signed-out visitors get a marketing/landing view, not a 404. The
  // dashboard requires `requireSession()` and would redirect, but
  // `/walls` is also reachable from share links, so it has to render
  // something useful for everyone.
  if (!session) {
    return (
      <div className="mx-auto max-w-3xl space-y-8 py-12 text-center">
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight">Walls</h1>
          <p className="text-muted-foreground">
            Walls are public capsules that unlock for everyone on a shared
            date. Sign in to see the ones you organize or contribute to.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <ButtonLink href="/sign-in">Sign in</ButtonLink>
          <ButtonLink href="/sign-up" variant="outline">
            Create account
          </ButtonLink>
        </div>
        <p className="text-xs text-muted-foreground">
          Have a wall link? Open it directly — walls are viewable by anyone
          with the URL.
        </p>
      </div>
    )
  }

  const walls = await getWalls()
  const organize = walls.filter((w) => w.role === "organizer")
  const contribute = walls.filter((w) => w.role === "contributor")

  return (
    <div className="mx-auto max-w-5xl space-y-8 py-8 sm:py-12">
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

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            You organize
          </h2>
          <span className="text-xs text-muted-foreground">
            {organize.length} {organize.length === 1 ? "wall" : "walls"}
          </span>
        </div>
        {organize.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              You haven't started a wall yet.{" "}
              <Link href="/walls/new" className="text-primary hover:underline">
                Start one
              </Link>
              .
            </CardContent>
          </Card>
        ) : (
          <WallGrid walls={organize} />
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            You contribute to
          </h2>
          <span className="text-xs text-muted-foreground">
            {contribute.length} {contribute.length === 1 ? "wall" : "walls"}
          </span>
        </div>
        {contribute.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              You haven't added to anyone else's wall yet.
            </CardContent>
          </Card>
        ) : (
          <WallGrid walls={contribute} />
        )}
      </section>
    </div>
  )
}
