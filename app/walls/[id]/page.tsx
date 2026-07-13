import { notFound } from "next/navigation"
import { Lock, Unlock, Calendar, Users, Plus, ArrowLeft } from "lucide-react"
import { getWallById, getWallBySlug, getWallCapsulesForViewer, countWallCapsules } from "@/lib/wall-access"
import { getSession } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ButtonLink } from "@/components/ui/button-link"
import { WallGrid } from "@/components/WallGrid"
import { WallCountdown } from "@/components/WallCountdown"
import { CopyShareLinkButton } from "@/components/CopyShareLinkButton"
import { DeleteWallButton } from "@/components/DeleteWallButton"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function WallPage({ params }: PageProps) {
  const { id } = await params
  const session = await getSession()

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  const view = isUuid
    ? await getWallById(id, session?.id ?? null)
    : await getWallBySlug(id, session?.id ?? null)
  if (!view) notFound()

  const capsules = await getWallCapsulesForViewer(view.wall.id, session?.id ?? null)
  const contributionCount = capsules?.length ?? (await countWallCapsules(view.wall.id))
  const isLockedForViewer = capsules === null

  return (
    <div className="w-full min-h-screen bg-background px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-5xl space-y-8">
        {/*
          Top-of-page organizer controls. The "All walls" back link is
          always shown so any viewer can navigate up; the destructive
          "Delete wall" trigger only appears for the organizer (the
          server route is the real auth gate, but hiding the trigger
          avoids surfacing a 404 to a non-organizer who clicks it).
        */}
        <div className="flex items-center justify-between gap-2">
          <ButtonLink href="/dashboard/walls" variant="ghost" size="sm" className="-ml-2">
            <ArrowLeft className="size-4" />
            All walls
          </ButtonLink>
          {view.isOrganizer && (
            <DeleteWallButton
              wallId={view.wall.id}
              wallName={view.wall.name}
              contributionCount={contributionCount}
            />
          )}
        </div>

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
              <CopyShareLinkButton slug={view.wall.slug} />
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
