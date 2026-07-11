import { notFound } from "next/navigation"

import { getOwnedCapsule, requireEditableCapsule } from "@/lib/wall-access"
import { requireSession } from "@/lib/auth"
import {
  CapsuleForm,
  type InitialCapsuleValues,
} from "@/components/CapsuleForm"

export const metadata = {
  title: "Edit capsule — Seal",
  description: "Edit a scheduled or draft capsule.",
}

/**
 * `/dashboard/capsules/[id]/edit`
 *
 * Server Component. Loads the capsule, ensures the current user is the
 * owner and the capsule is still editable (per AGENTS.md: editable
 * means `status` not in `delivered` / `failed`, plus owner match —
 * both covered by `requireEditableCapsule`). Wall-bound capsules are
 * also sealed — `requireEditableCapsule` doesn't check `wallId` (the
 * underlying status is still `scheduled` for unlocked walls), so the
 * form itself surfaces the lock notice and the API rejects the PATCH
 * with 409.
 *
 * On a non-editable row we `notFound()` — same response as a
 * non-existent id, per the AGENTS.md non-negotiable ("don't leak
 * capsule existence to non-owners").
 *
 * We don't load the wall picker in edit mode (wall binding is
 * immutable in v1), so `availableWalls` is passed as an empty array
 * and the picker is hidden by the form's own `isEdit` branch.
 */
export default async function EditCapsulePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await requireSession()

  // First gate: ownership + status. If this is null the row is either
  // not yours, already delivered/failed, or doesn't exist.
  const editable = await requireEditableCapsule(id, user.id)
  if (!editable) notFound()

  // Second fetch: full owned capsule for the form's initial values.
  // Mirrors the gate — if `requireEditableCapsule` accepted it,
  // `getOwnedCapsule` will too, but we re-fetch because the edit
  // guard returns just the row, not content/recipients.
  const owned = await getOwnedCapsule(id, user.id)
  if (!owned) notFound()

  // The form supports a single content row today. If a future
  // iteration grows the form to handle multi-row content, the edit
  // page will need to translate `content[]` to a richer initial.
  const firstContent = owned.content[0]
  const initial: InitialCapsuleValues = {
    title: owned.capsule.title,
    wallId: owned.capsule.wallId ?? null,
    deliveryDate: owned.capsule.deliveryDate
      ? owned.capsule.deliveryDate.toISOString()
      : null,
    contentType: firstContent?.contentType ?? "text",
    body: firstContent?.contentText ?? null,
    mediaUrl: firstContent?.contentUrl ?? null,
    mediaKey: firstContent?.uploadthingKey ?? null,
    recipients: owned.recipients.map((r) => ({
      name: r.name ?? null,
      email: r.email ?? null,
      phone: r.phone ?? null,
      channel: r.channel,
    })),
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Edit capsule</h1>
        <p className="text-sm text-muted-foreground">
          Update the title, content, recipients, or delivery date. You
          can&apos;t move a capsule between a wall and a private delivery
          once it&apos;s sealed.
        </p>
      </header>
      <CapsuleForm
        availableWalls={[]}
        mode="edit"
        capsuleId={id}
        initial={initial}
      />
    </div>
  )
}
