"use client"

import { Mail, MessageSquare, Bell, Save, Loader2 } from "lucide-react"
import { useRef, useState } from "react"
import { toast } from "sonner"
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
  // Snapshot the initial value once so `isDirty` survives subsequent
  // state updates. Using `useRef(initial)` (not `useRef()`) means the
  // ref is fixed at mount; that's correct here because the parent
  // page is a Server Component that re-renders the whole tree on
  // navigation, and a "live" initial would re-mount the form mid-edit.
  const initialRef = useRef<ChannelState>(initial)
  const [channels, setChannels] = useState<ChannelState>(initial)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const isDirty =
    channels.email !== initialRef.current.email ||
    channels.sms !== initialRef.current.sms ||
    channels.push !== initialRef.current.push

  async function handleSave() {
    setErrorMessage(null)
    setIsSaving(true)
    try {
      const res = await fetch("/api/profile/notification-channels", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(channels),
      })
      if (!res.ok) {
        // The API returns `{ error: "..." }` on 400/401/422. Pull the
        // message for the inline banner; fall back to a generic line
        // for transport errors that don't carry a body.
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null
        const message = body?.error ?? "Could not save your preferences."
        setErrorMessage(message)
        toast.error(message)
        return
      }
      // Re-snapshot so `isDirty` resets to false on success.
      initialRef.current = channels
      toast.success("Notification preferences saved.")
    } catch {
      const message = "Network error — please try again."
      setErrorMessage(message)
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

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
        {errorMessage && (
          <div
            role="alert"
            className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md"
          >
            {errorMessage}
          </div>
        )}

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
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving || !isDirty}
          >
            {isSaving ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Saving…
              </>
            ) : (
              <>
                <Save className="size-4" aria-hidden />
                Save changes
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
