"use client"

import { Mail, MessageSquare, Bell, Save } from "lucide-react"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"

interface ChannelState {
  email: boolean
  sms: boolean
  push: boolean
}

export function NotificationChannels({
  initial,
}: {
  initial: ChannelState
}) {
  const [channels, setChannels] = useState<ChannelState>(initial)
  // TODO(persistence): post to /api/profile/notification-channels when the
  // endpoint exists. Until then, state is local to this view.

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification channels</CardTitle>
        <CardDescription>
          Pick how Seal reaches you when a capsule is delivered. At least one
          channel must be on.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Mail className="mt-0.5 size-4 text-muted-foreground" aria-hidden />
            <div className="space-y-0.5">
              <Label htmlFor="channel-email" className="text-sm font-medium">
                Email
              </Label>
              <p className="text-xs text-muted-foreground">
                Delivered capsule opens in your inbox.
              </p>
            </div>
          </div>
          <Switch
            id="channel-email"
            checked={channels.email}
            onCheckedChange={(v) =>
              setChannels((c) => ({ ...c, email: v }))
            }
          />
        </div>

        <Separator />

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <MessageSquare className="mt-0.5 size-4 text-muted-foreground" aria-hidden />
            <div className="space-y-0.5">
              <Label htmlFor="channel-sms" className="text-sm font-medium">
                SMS
              </Label>
              <p className="text-xs text-muted-foreground">
                Text message with a link to open the capsule.
              </p>
            </div>
          </div>
          <Switch
            id="channel-sms"
            checked={channels.sms}
            onCheckedChange={(v) =>
              setChannels((c) => ({ ...c, sms: v }))
            }
          />
        </div>

        <Separator />

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Bell className="mt-0.5 size-4 text-muted-foreground" aria-hidden />
            <div className="space-y-0.5">
              <Label htmlFor="channel-push" className="text-sm font-medium">
                Push
              </Label>
              <p className="text-xs text-muted-foreground">
                Browser notification if you've installed the PWA.
              </p>
            </div>
          </div>
          <Switch
            id="channel-push"
            checked={channels.push}
            onCheckedChange={(v) =>
              setChannels((c) => ({ ...c, push: v }))
            }
          />
        </div>

        <div className="flex justify-end pt-2">
          <Button size="sm" disabled>
            <Save className="size-4" />
            Save changes
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Persistence lands with the API integration — toggles update locally
          for now.
        </p>
      </CardContent>
    </Card>
  )
}
