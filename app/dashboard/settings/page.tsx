import { requireSession } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { NotificationChannels } from "@/components/notification-channels"
import { ProfileForm } from "@/components/profile-form"
import { SignOutButton } from "@/components/sign-out-button"

export const metadata = {
  title: "Settings — Dashboard",
}

export default async function DashboardSettingsPage() {
  const user = await requireSession()

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
        <CardContent>
          <ProfileForm defaultName={user.name} email={user.email} />
        </CardContent>
      </Card>

      <NotificationChannels
        initial={{
          email: user.notifyEmail,
          sms: user.notifySms,
          push: user.notifyPush,
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle>Session</CardTitle>
          <CardDescription>
            Sign out of this device. You&apos;ll need to sign in again to
            access your vault.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignOutButton />
        </CardContent>
      </Card>
    </>
  )
}
