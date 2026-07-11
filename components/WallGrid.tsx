/**
 * Unlocked wall view: a grid of contributions. Each tile shows the
 * contributor's name and the body of their capsule (text in a card,
 * media as a thumbnail or link). The page passes this component the
 * pre-fetched list of capsules + content; the component never makes
 * its own data calls.
 */
import { FileText, Image as ImageIcon, Mic, Video, Mail, User } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { WallCapsuleForViewer } from "@/lib/wall-access"
import type { ContentTypeValue } from "@/drizzle/schema"

const typeIcon: Record<ContentTypeValue, React.ComponentType<{ className?: string }>> = {
  text: FileText,
  image: ImageIcon,
  audio: Mic,
  video: Video,
}

export function WallGrid({
  items,
  viewerName,
}: {
  items: WallCapsuleForViewer[]
  viewerName: string | null
}) {
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          No contributions yet. Be the first.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const isYou = viewerName !== null && item.ownerName === viewerName
        return (
          <Card key={item.capsule.id} className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                  {initials(item.ownerName)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate flex items-center gap-1.5">
                    <User className="size-3 text-muted-foreground shrink-0" aria-hidden />
                    {item.ownerName}
                    {isYou && (
                      <span className="text-xs text-muted-foreground">(you)</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {item.capsule.title}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {item.content.map((c) => {
                const Icon = typeIcon[c.contentType]
                return (
                  <div
                    key={c.id}
                    className="rounded-md border border-border bg-muted/20 p-3 text-sm"
                  >
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                      <Icon className="size-3" aria-hidden />
                      <span className="capitalize">{c.contentType}</span>
                    </div>
                    {c.contentType === "text" && c.contentText && (
                      <p className="whitespace-pre-wrap leading-relaxed">
                        {c.contentText}
                      </p>
                    )}
                    {c.contentType !== "text" && c.contentUrl && (
                      <a
                        href={c.contentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline break-all"
                      >
                        Open {c.contentType}
                      </a>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("")
}
