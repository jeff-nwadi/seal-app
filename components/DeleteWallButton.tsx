"use client"

/**
 * Organizer-only "Delete wall" control for the wall detail page.
 *
 * Wraps the delete flow in an `AlertDialog` confirmation and a
 * `useTransition`-gated `DELETE /api/walls/[id]` request. The pattern
 * is intentionally a near-mirror of `components/capsule-row-actions.tsx`
 * (delete a capsule) — same dialog wiring, same `useTransition`
 * double-submit guard, same `setOpen(false)` after a successful
 * round-trip so the user gets explicit "yes, it really happened"
 * feedback before we navigate away.
 *
 * Authorization is server-side (the route's `requireManagedWall` gate);
 * the page only renders this component when `view.isOrganizer` is true,
 * so a non-organizer never sees the trigger. A direct `fetch` from a
 * non-organizer still gets a 404 from the route.
 *
 * Why a class sentinel for the "has contributors" 409? — same approach
 * as `app/api/capsules/[id]/route.ts`: 409 (not 404) so the user
 * understands the wall still exists, the server is just refusing to
 * cascade-delete other people's contributions.
 */
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface DeleteWallButtonProps {
  /** The wall's UUID. */
  wallId: string
  /** Display name, used in the dialog description. */
  wallName: string
  /**
   * Number of contributions the wall has right now. Used in the
   * dialog copy and (transitively) for the 409 gating. Passed in
   * from the server-rendered page so the dialog text reflects the
   * current state without an extra fetch.
   */
  contributionCount: number
}

export function DeleteWallButton({
  wallId,
  wallName,
  contributionCount,
}: DeleteWallButtonProps) {
  const router = useRouter()
  const [isDeleting, startDelete] = useTransition()
  // Local state for the alert dialog open/close. We close manually
  // after a successful delete (or leave it open on error so the user
  // can retry).
  const [open, setOpen] = useState(false)

  const handleDelete = () => {
    startDelete(async () => {
      try {
        const res = await fetch(`/api/walls/${wallId}`, { method: "DELETE" })
        if (!res.ok && res.status !== 204) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: string
          }
          const message =
            data.error ?? `Could not delete the wall (${res.status}).`
          toast.error(message)
          // Leave the dialog open so the user can read the error and
          // decide whether to retry or cancel.
          return
        }
        toast.success("Wall deleted.")
        setOpen(false)
        // Navigate to the dashboard view so the deleted wall
        // disappears from the organizer's list. The dashboard is
        // `force-dynamic`, so a refresh re-derives the count from
        // the DB.
        router.push("/dashboard/walls")
        router.refresh()
      } catch (err) {
        const message = err instanceof Error ? err.message : "Network error"
        toast.error(message)
      }
    })
  }

  // The dialog body copy varies by contribution count:
  //   - 0 contributions: a flat "this will be removed" message.
  //   - 1+ contributions: still allowed (the page only renders this
  //     when the viewer is the organizer and the route's 409 gate
  //     confirms count <= 1 distinct owner). We use the live
  //     `contributionCount` to keep the copy honest about what the
  //     delete will take with it.
  const description =
    contributionCount === 0
      ? `“${wallName}” will be removed. This can't be undone.`
      : `“${wallName}” and its ${contributionCount} contribution${contributionCount === 1 ? "" : "s"} will be removed. This can't be undone.`

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {/* Plain `<button>` styled with `buttonVariants` because the
            project's `Button` is built on `@base-ui/react` and does
            NOT support Radix's `asChild` Slot pattern. This matches
            the trigger pattern in `components/capsule-row-actions.tsx:92-100`. */}
        <button
          type="button"
          aria-label={`Delete wall “${wallName}”`}
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon-sm" }),
            "text-destructive hover:text-destructive",
          )}
        >
          <Trash2 className="size-4" aria-hidden />
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this wall?</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              // The action is a button; we want to drive the delete
              // ourselves rather than letting the dialog auto-close
              // before the request resolves. `e.preventDefault()`
              // keeps the dialog open until `setOpen(false)` runs
              // in the success branch.
              e.preventDefault()
              if (isDeleting) return
              handleDelete()
            }}
            disabled={isDeleting}
            aria-busy={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Deleting…
              </>
            ) : (
              <>
                <Trash2 className="size-4" aria-hidden />
                Delete
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
