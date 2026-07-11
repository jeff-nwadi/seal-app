import { notFound } from "next/navigation"
import Link from "next/link"
import { Lock, Unlock, Calendar, Users, Plus, ArrowLeft } from "lucide-react"
import { getWallById, getWallBySlug, getWallCapsulesForViewer, countWallCapsules } from "@/lib/wall-access"
import { getSession } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ButtonLink } from "@/components/ui/button-link"
import { WallGrid } from "@/components/WallGrid"
import { WallCountdown } from "@/components/WallCountdown"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function WallPage({ params }: PageProps) {
  const { id } = await params
  const session = await getSession()
  // The path segment is ambiguous on purpose — UUIDs start with hex,
  // slugs are kebab-case. We try id first (the dashboard links use
  // the canonical id), then fall back to slug (the shareable URL).
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  const view = isUuid
    ? await getWallById(id, session?.id ?? null)
    : await getWallBySlug(id, session?.id ?? null)
  if (!view) notFound()

  // CRITICAL: AGENTS.md non-negotiable. If the wall is locked and the
  // viewer is not the organizer, `getWallCapsulesForViewer` returns
  // `null` and we render the locked placeholder. The `null` -> 404
  // branch happens only if the wall id doesn't exist; for a locked
  // wall, we explicitly do NOT 404 (we want to show the countdown to
  // a curious viewer who landed on the URL). So the wall metadata
  // is fetched separately from the (sealed) capsule list.
  const capsules = await getWallCapsulesForViewer(id, session?.id ?? null)
  const contributionCount = capsules?.length ?? (await countWallCapsules(id))
  const isLockedForViewer = capsules === null

  return (
    <div className="w-full min-h-screen bg-background px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-5xl space-y-8">
        <ButtonLink href="/dashboard/walls" variant="ghost" size="sm" className="-ml-2">
          <ArrowLeft className="size-4" />
          All walls
        </ButtonLink>

        <header className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <h1 className="text-3xl font-semibold tracking-tight">{view.wall.name}</h1>
              {view.wall.description && (
                <p className="text-sm text-muted-foreground max-w-2xl">
                  {view.wall.description}
                </p>
              )}
            </div>
            <Badge variant={view.isUnlocked ? "default" : "outline"} className="gap-1">
              {view.isUnlocked ? (
                <Unlock className="size-3" aria-hidden />
              ) : (
                <Lock className="size-3" aria-hidden />
              )}
              {view.isUnlocked ? "Unlocked" : "Sealed"}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="size-4" aria-hidden />
              {view.isUnlocked ? "Opened" : "Opens"}{" "}
              {formatDateTime(view.wall.openDate)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="size-4" aria-hidden />
              {contributionCount} contribution{contributionCount === 1 ? "" : "s"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Link
                href={`/walls/${view.wall.slug}`}
                className="text-primary hover:underline"
              >
                /{view.wall.slug}
              </Link>
            </span>
          </div>
        </header>

        {!view.isUnlocked && (
          <WallCountdown openDate={view.wall.openDate} isOrganizer={view.isOrganizer} />
        )}

        {isLockedForViewer ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Lock className="size-4" aria-hidden />
                Sealed until the open date
              </CardTitle>
              <CardDescription>
                The {contributionCount} contribution
                {contributionCount === 1 ? "" : "s"} to this wall are
                hidden until it unlocks. You can still{" "}
                {session ? "add yours" : "sign in to add yours"}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {Array.from({ length: Math.max(contributionCount, 4) }).map(
                  (_, i) => (
                    <div
                      key={i}
                      className="aspect-square rounded-lg border border-border bg-muted/40 flex items-center justify-center"
                      aria-hidden
                    >
                      <Lock className="size-5 text-muted-foreground/60" />
                    </div>
                  ),
                )}
              </div>
              {session && !view.isUnlocked && (
                <div className="mt-6 flex justify-center">
                  <ButtonLink href={`/capsules/new?wallId=${view.wall.id}`}>
                    <Plus className="size-4" />
                    Add your contribution
                  </ButtonLink>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <WallGrid items={capsules} viewerName={session?.name ?? null} />
        )}
      </div>
    </div>
  )
}

function formatDateTime(d: Date): string {
  return d.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}
