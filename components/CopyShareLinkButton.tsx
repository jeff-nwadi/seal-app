"use client"

/**
 * Copy-to-clipboard button for a wall's shareable URL.
 *
 * The wall page accepts both UUIDs and slugs in its `[id]` segment, so
 * the button always canonicalizes to `${origin}/walls/${slug}` — copying
 * `window.location.href` would leak the UUID variant when the organizer
 * landed via a dashboard link.
 */
import { useState } from "react"
import { Copy, Check } from "lucide-react"
import { toast } from "sonner"

interface CopyShareLinkButtonProps {
  slug: string
}

export function CopyShareLinkButton({ slug }: CopyShareLinkButtonProps) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    const url = `${window.location.origin}/walls/${slug}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success("Share link copied to clipboard")
      // Reset the icon after a moment so a second click still gives feedback.
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error("Couldn't copy. Long-press the link to copy it instead.")
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1.5 text-primary hover:underline"
      aria-label="Copy share link"
    >
      {copied ? (
        <Check className="size-3" aria-hidden />
      ) : (
        <Copy className="size-3" aria-hidden />
      )}
      /{slug}
    </button>
  )
}
