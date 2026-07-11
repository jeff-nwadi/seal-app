import { ButtonLink } from "@/components/ui/button-link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata = {
  title: "New Wall — Seal",
}

export default function NewWallPage() {
  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-background px-4 py-16">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>New wall</CardTitle>
          <CardDescription>
            Wall creation is part of PRD build order step 2 (after the
            private capsule loop is end-to-end). This route is a stub so the
            dashboard CTA doesn't 404.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <ButtonLink href="/dashboard">Back to dashboard</ButtonLink>
          <ButtonLink href="/dashboard/walls" variant="outline">
            All walls
          </ButtonLink>
        </CardContent>
      </Card>
    </div>
  )
}
