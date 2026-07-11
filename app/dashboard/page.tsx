import Link from "next/link"
import { Mail, Users, Send, Plus } from "lucide-react"
import { getOverview } from "@/lib/dashboard/queries"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ButtonLink } from "@/components/ui/button-link"

// Always re-fetch on navigation. Without this, Next.js may serve a
// cached page where the "Scheduled / Delivered / Walls" tiles still
// read 0 after the user creates a new capsule from /capsules/new and
// navigates back to /dashboard. The data is per-user and changes
// constantly, so a static cache is never what we want here.
export const dynamic = "force-dynamic"

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export default async function DashboardOverviewPage() {
  const stats = await getOverview()

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="text-sm text-muted-foreground">
            What's waiting in the vault, and what's already on its way.
          </p>
        </div>
        <div className="flex gap-2">
          <ButtonLink href="/walls/new" variant="outline" size="sm">
            <Plus className="size-4" />
            New wall
          </ButtonLink>
          <ButtonLink href="/capsules/new" size="sm">
            <Plus className="size-4" />
            New capsule
          </ButtonLink>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Scheduled
            </CardTitle>
            <Mail className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{stats.scheduled}</div>
            <p className="text-xs text-muted-foreground">capsules waiting</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Delivered
            </CardTitle>
            <Send className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{stats.delivered}</div>
            <p className="text-xs text-muted-foreground">already arrived</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Walls
            </CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{stats.walls}</div>
            <p className="text-xs text-muted-foreground">organizing or contributing</p>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>
            The last few things that happened in your vault.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {stats.recent.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-4 py-3 text-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="size-2 shrink-0 rounded-full bg-primary"
                      aria-hidden
                    />
                    <span className="truncate">{item.text}</span>
                  </div>
                  <time
                    dateTime={item.at}
                    className="shrink-0 text-xs text-muted-foreground"
                  >
                    {formatDate(item.at)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  )
}
