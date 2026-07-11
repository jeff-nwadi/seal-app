import Link from "next/link"
import { ButtonLink } from "@/components/ui/button-link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata = {
  title: "New Capsule — Seal",
}

export default function NewCapsulePage() {
  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-background px-4 py-16">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>New capsule</CardTitle>
          <CardDescription>
            The capsule creation form is part of the PRD build order, step 1.
            It's coming up next — this route is a stub so the dashboard CTA
            doesn't 404.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <ButtonLink href="/dashboard">Back to dashboard</ButtonLink>
          <ButtonLink href="/dashboard/capsules" variant="outline">
            All capsules
          </ButtonLink>
        </CardContent>
      </Card>
    </div>
  )
}
