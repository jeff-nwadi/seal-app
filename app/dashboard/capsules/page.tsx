import { getCapsules } from "@/lib/dashboard/queries"
import { CapsulesList } from "@/components/capsules-list"

export const metadata = {
  title: "Capsules — Dashboard",
}

export default async function DashboardCapsulesPage() {
  const capsules = await getCapsules()
  return <CapsulesList capsules={capsules} />
}
