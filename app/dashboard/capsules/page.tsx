import { getCapsules } from "@/lib/dashboard/queries"
import { CapsulesList } from "@/components/capsules-list"

export const metadata = {
  title: "Capsules — Dashboard",
}

// Always re-fetch on navigation. The list changes whenever a capsule
// is created, edited, delivered, or deleted — there's no value in
// caching it across requests.
export const dynamic = "force-dynamic"

export default async function DashboardCapsulesPage() {
  const capsules = await getCapsules()
  return <CapsulesList capsules={capsules} />
}
