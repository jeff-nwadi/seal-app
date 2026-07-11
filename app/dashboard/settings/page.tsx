import { LogOut, User } from "lucide-react"
import { getSession } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ButtonLink } from "@/components/ui/button-link"
import { NotificationChannels } from "@/components/notification-channels"

export const metadata = {
  title: "Settings — Dashboard",
}

export default async function DashboardSettingsPage() {
  const user = await getSession()

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Account and delivery preferences.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Identity attached to the capsules and walls you create.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:max-w-sm">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              defaultValue={user.name}
              // TODO(auth): wire to Better Auth updateUser when wired.
              readOnly
              aria-readonly
            />
          </div>
          <div className="grid gap-2 sm:max-w-sm">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              defaultValue={user.email}
              readOnly
              aria-readonly
            />
            <p className="text-xs text-muted-foreground">
              Email changes land with the auth integration.
            </p>
          </div>
        </CardContent>
      </Card>

      <NotificationChannels initial={{ email: true, sms: false, push: false }} />

      <Card>
        <CardHeader>
          <CardTitle>Session</CardTitle>
          <CardDescription>
            Sign out of this device. You'll need to sign in again to access
            your vault.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* TODO(auth): replace with Better Auth signOut() once wired. */}
          <ButtonLink href="/sign-in" variant="outline">
            <LogOut className="size-4" />
            Sign out
          </ButtonLink>
        </CardContent>
      </Card>
    </>
  )
}
