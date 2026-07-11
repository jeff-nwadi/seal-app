import { listWallsForViewer } from "@/lib/wall-access"
import { CapsuleForm, type AvailableWall } from "@/components/CapsuleForm"
import { requireSession } from "@/lib/auth"

export const metadata = {
  title: "New Capsule — Seal",
  description: "Schedule a message for future delivery.",
}

export default async function NewCapsulePage() {
  const user = await requireSession()
  // Walls the viewer can contribute to: organize OR contributor. We
  // re-use the dashboard query — same type, same data, just rendered
  // inside a form's option list.
  const walls = await listWallsForViewer(user.id)
  const availableWalls: AvailableWall[] = walls
    // Already-open walls reject contributions (the API 409s), so we
    // hide them from the picker — saves the user a round-trip.
    .filter((w) => !w.isUnlocked)
    .map((w) => ({
      id: w.wall.id,
      name: w.wall.name,
      slug: w.wall.slug,
      openDate: w.wall.openDate.toISOString(),
    }))

  return (
    <div className="w-full min-h-screen bg-background px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">New capsule</h1>
          <p className="text-sm text-muted-foreground">
            Seal a message for a future moment. It&apos;ll arrive within 10
            minutes of the time you pick — or when a wall unlocks.
          </p>
        </header>
        <CapsuleForm availableWalls={availableWalls} />
      </div>
    </div>
  )
}
