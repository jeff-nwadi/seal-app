"use client"

import { useMemo, useState } from "react"
import {
  Mail,
  Image as ImageIcon,
  Mic,
  Video,
  FileText,
  Plus,
  Search,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ButtonLink } from "@/components/ui/button-link"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import type { Capsule, ContentType, CapsuleStatus } from "@/lib/dashboard/queries"

const contentIcon: Record<ContentType, React.ComponentType<{ className?: string }>> = {
  text: FileText,
  image: ImageIcon,
  audio: Mic,
  video: Video,
}

const statusVariant: Record<
  CapsuleStatus,
  "default" | "secondary" | "outline"
> = {
  scheduled: "default",
  delivered: "secondary",
  draft: "outline",
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function CapsulesList({ capsules }: { capsules: Capsule[] }) {
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return capsules
    return capsules.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.recipient.toLowerCase().includes(q)
    )
  }, [capsules, query])

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Capsules</h1>
          <p className="text-sm text-muted-foreground">
            Messages you've scheduled for future delivery.
          </p>
        </div>
        <ButtonLink href="/capsules/new">
          <Plus className="size-4" />
          New capsule
        </ButtonLink>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search by title or recipient"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
          aria-label="Search capsules"
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-12 text-center">
            <Mail className="size-10 text-muted-foreground" aria-hidden />
            <div className="space-y-1">
              <CardTitle className="text-base">
                {query ? "No capsules match your search" : "No capsules yet"}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {query
                  ? "Try a different title or recipient."
                  : "Schedule your first message for a future date."}
              </p>
            </div>
            {!query && (
              <ButtonLink href="/capsules/new">
                <Plus className="size-4" />
                New capsule
              </ButtonLink>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="sr-only">
            <CardTitle>All capsules</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">Title</th>
                    <th scope="col" className="px-4 py-3 font-medium">Recipient</th>
                    <th scope="col" className="px-4 py-3 font-medium">Delivers</th>
                    <th scope="col" className="px-4 py-3 font-medium">Type</th>
                    <th scope="col" className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((c) => {
                    const Icon = contentIcon[c.contentType]
                    return (
                      <tr key={c.id} className="hover:bg-muted/40">
                        <td className="px-4 py-3 font-medium">{c.title}</td>
                        <td className="px-4 py-3 text-muted-foreground">{c.recipient}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDate(c.deliveryDate)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                            <Icon className="size-3.5" aria-hidden />
                            <span className="capitalize">{c.contentType}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={statusVariant[c.status]} className="capitalize">
                            {c.status}
                          </Badge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile list */}
            <ul className="md:hidden divide-y divide-border">
              {filtered.map((c) => {
                const Icon = contentIcon[c.contentType]
                return (
                  <li key={c.id} className="flex items-start gap-3 px-4 py-3">
                    <Icon
                      className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium truncate">{c.title}</p>
                        <Badge variant={statusVariant[c.status]} className="capitalize shrink-0">
                          {c.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        To {c.recipient}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(c.deliveryDate)}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </>
  )
}
