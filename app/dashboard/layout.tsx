import { getSession } from "@/lib/auth"
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
  const user = await getSession()
  return <DashboardShell user={user}>{children}</DashboardShell>
}
