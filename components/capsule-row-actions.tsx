"use client"

/**
 * Per-row Edit + Delete controls for the capsules list. Rendered
 * inline in the table (desktop) and as a footer block on mobile.
 *
 * Delete opens an `AlertDialog` confirmation. On confirm we
 * `DELETE /api/capsules/[id]` and `router.refresh()` so the list
 * (and the dashboard tiles) re-derive. The 204 success path is
 * silent on the API; we toast on success and on error.
 */
import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
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

export function CapsuleRowActions({
  id,
  title,
}: {
  id: string
  title: string
}) {
  const router = useRouter()
  const [isDeleting, startDelete] = useTransition()
  // Local state for the open/close of the alert dialog — we need to
  // close it manually after a successful delete (or leave it open on
  // error so the user can retry).
  const [open, setOpen] = useState(false)

  const handleDelete = () => {
    startDelete(async () => {
      try {
        const res = await fetch(`/api/capsules/${id}`, { method: "DELETE" })
        if (!res.ok && res.status !== 204) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: string
          }
          const message = data.error ?? `Could not delete (${res.status}).`
          toast.error(message)
          return
        }
        toast.success("Capsule deleted.")
        setOpen(false)
        // Re-run the server components that render the list and the
        // dashboard overview so the deleted row disappears and the
        // scheduled/delivered counts update.
        router.refresh()
      } catch (err) {
        const message = err instanceof Error ? err.message : "Network error"
        toast.error(message)
      }
    })
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {/* The project's `Button` is built on `@base-ui/react` and does
          NOT support `asChild`. To get a link styled as a button, we
          compose `buttonVariants` directly on a Next.js <Link> —
          same approach the existing `ButtonLink` uses. */}
      <Link
        href={`/dashboard/capsules/${id}/edit`}
        prefetch
        aria-label={`Edit "${title}"`}
        className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
      >
        <Pencil className="size-4" />
      </Link>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          {/* The project's `Button` is built on `@base-ui/react` and
              doesn't support Radix's `asChild` Slot pattern. We use a
              plain `<button>` here styled with `buttonVariants`
              directly so it works as the trigger without losing
              styling. */}
          <button
            type="button"
            aria-label={`Delete "${title}"`}
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon-sm" }),
            )}
          >
            <Trash2 className="size-4" />
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this capsule?</AlertDialogTitle>
            <AlertDialogDescription>
              “{title}” will be removed and its content, recipients, and
              delivery records deleted. This can&apos;t be undone.
            </AlertDialogDescription>
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
    </div>
  )
}
