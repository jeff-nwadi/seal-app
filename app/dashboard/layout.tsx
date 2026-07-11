import { requireSession } from "@/lib/auth"
import { DashboardShell } from "@/components/dashboard-shell"

export const metadata = {
  title: "Dashboard — Seal",
  description: "Your scheduled capsules and walls.",
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // `requireSession` redirects to `/sign-in?from=…` when the user is not
  // authenticated. The dashboard is therefore never reachable anonymously.
  const user = await requireSession()
  return <DashboardShell user={user}>{children}</DashboardShell>
}
