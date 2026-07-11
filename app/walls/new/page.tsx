import { requireSession } from "@/lib/auth"
import { NewWallForm } from "@/components/NewWallForm"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata = {
  title: "New Wall — Seal",
  description: "Start a public time capsule for a group.",
}

export default async function NewWallPage() {
  await requireSession()
  return (
    <div className="w-full min-h-screen bg-background px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">New wall</h1>
          <p className="text-sm text-muted-foreground">
            A wall is a shared capsule that multiple people contribute to.
            It unlocks for everyone on the open date you pick.
          </p>
        </header>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Wall details</CardTitle>
            <CardDescription>
              Pick a name and an open date. You&apos;ll get a shareable URL
              once it&apos;s created.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <NewWallForm />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
