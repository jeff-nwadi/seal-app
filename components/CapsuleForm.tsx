"use client"

/**
 * Capsule creation / edit form (Client Component).
 *
 * Two modes:
 *   1. **Create** (default) — pick a future delivery date, add one or
 *      more recipients, choose a delivery channel per recipient. Or
 *      contribute to a wall.
 *   2. **Edit** — `mode="edit"` plus an `initial` payload and `capsuleId`.
 *      Wall binding is locked (a wall contribution belongs to the
 *      wall, not the user). The submit becomes a PATCH.
 *
 * Content is one of text | image | audio | video. For text the user
 * types into a textarea; for media we use UploadThing's `useUploadThing`
 * hook (the typed helper in `lib/uploadthing.ts`). The upload URL +
 * key are stashed in form state and submitted with the rest of the
 * payload when the user clicks "Seal" / "Save changes".
 *
 * Submit: POST `/api/capsules` for create; PATCH `/api/capsules/[id]`
 * for edit. On success we push to `/dashboard/capsules`; on error
 * we surface the validation message inline (no `alert`).
 */
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm, useFieldArray, type SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  FileText,
  Image as ImageIcon,
  Mic,
  Video,
  Upload,
  X,
  Plus,
  Loader2,
  Lock,
  Users,
  Save,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { useUploadThing } from "@/lib/uploadthing"
import type { CapsuleCreatePayload } from "@/app/api/capsules/route"

// ---------------------------------------------------------------------------
// Validation (client-side mirror of the server schema)
// ---------------------------------------------------------------------------

const contentTypeEnum = z.enum(["text", "image", "audio", "video"])
const channelEnum = z.enum(["email", "sms", "push"])

const recipientSchema = z
  .object({
    name: z.string().max(80).optional(),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().max(40).optional().or(z.literal("")),
    channel: channelEnum,
  })
  .refine(
    (r) => {
      if (r.channel === "email") return !!r.email
      if (r.channel === "sms") return !!r.phone
      if (r.channel === "push") return !!r.email || !!r.phone
      return false
    },
    {
      message: "Email required for email/push, phone required for sms.",
    },
  )

const formSchema = z
  .object({
    title: z.string().min(1, "Title is required").max(120),
    wallId: z.string().uuid().optional().or(z.literal("")),
    deliveryDate: z.string().optional(),
    contentType: contentTypeEnum,
    body: z.string().max(50_000).optional(),
    mediaUrl: z.string().url().optional().or(z.literal("")),
    mediaKey: z.string().optional(),
    // The recipients field always has at least one row in the form
    // (we initialize the form with one empty recipient). The runtime
    // refine below catches the "at least one" rule.
    recipients: z.array(recipientSchema),
  })
  .refine(
    (d) => {
      if (d.wallId) return true
      if (!d.deliveryDate) return false
      const t = Date.parse(d.deliveryDate)
      return !Number.isNaN(t) && t > Date.now()
    },
    {
      message: "Pick a future delivery date (or attach to a wall).",
      path: ["deliveryDate"],
    },
  )
  .refine(
    (d) => {
      if (d.wallId) return true
      return d.recipients.length > 0
    },
    {
      message: "Add at least one recipient for a private capsule.",
      path: ["recipients"],
    },
  )
  .refine(
    (d) => {
      if (d.contentType === "text") {
        return typeof d.body === "string" && d.body.trim().length > 0
      }
      return typeof d.mediaUrl === "string" && d.mediaUrl.length > 0
    },
    {
      message: "Add the content (text or media).",
      path: ["body"],
    },
  )

type FormValues = z.infer<typeof formSchema>

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface AvailableWall {
  id: string
  name: string
  slug: string
  openDate: string // ISO
}

/**
 * The shape we need to seed the form in edit mode. Mirrors what
 * `getOwnedCapsule()` returns: title, optional wall, optional future
 * delivery date, the first content row, and the recipient list. The
 * form only ever handles one content row today — the extra rows in
 * `getOwnedCapsule` are picked via `content[0]` by the edit page.
 */
export interface InitialCapsuleValues {
  title: string
  wallId: string | null
  deliveryDate: string | null // ISO
  contentType: "text" | "image" | "audio" | "video"
  body: string | null
  mediaUrl: string | null
  mediaKey: string | null
  recipients: {
    name: string | null
    email: string | null
    phone: string | null
    channel: "email" | "sms" | "push"
  }[]
}

export function CapsuleForm({
  availableWalls,
  mode = "create",
  capsuleId,
  initial,
}: {
  availableWalls: AvailableWall[]
  mode?: "create" | "edit"
  capsuleId?: string
  initial?: InitialCapsuleValues
}) {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const isEdit = mode === "edit" && !!initial
  // Wall-bound capsules are immutable in v1 (the wall owns the
  // delivery). When we render the edit form for one, we lock the
  // wall picker and surface the wall-locked notice.
  const wallLocked = isEdit && !!initial?.wallId

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: isEdit
      ? {
          title: initial?.title ?? "",
          wallId: initial?.wallId ?? "",
          // Pre-fill `deliveryDate` from the existing ISO if it's in
          // the future, otherwise leave it blank so the user picks
          // a new one (and the schema's future-date refine kicks in).
          deliveryDate: initial?.deliveryDate
            ? toLocalDateTimeInput(initial.deliveryDate)
            : defaultDeliveryDate(),
          contentType: initial?.contentType ?? "text",
          body: initial?.body ?? "",
          mediaUrl: initial?.mediaUrl ?? "",
          mediaKey: initial?.mediaKey ?? "",
          recipients:
            initial?.recipients && initial.recipients.length > 0
              ? initial.recipients.map((r) => ({
                  name: r.name ?? "",
                  email: r.email ?? "",
                  phone: r.phone ?? "",
                  channel: r.channel,
                }))
              : [{ name: "", email: "", phone: "", channel: "email" }],
        }
      : {
          title: "",
          wallId: "",
          deliveryDate: defaultDeliveryDate(),
          contentType: "text",
          body: "",
          mediaUrl: "",
          mediaKey: "",
          recipients: [{ name: "", email: "", phone: "", channel: "email" }],
        },
  })

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = form
  const recipients = useFieldArray({ control, name: "recipients" })
  const wallId = watch("wallId")
  const contentType = watch("contentType")
  // When editing a wall-bound capsule we lock the picker and force
  // wall-mode on; otherwise wallId from the form decides.
  const isWallMode = wallLocked || !!wallId

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setServerError(null)
    if (isEdit && !capsuleId) {
      // Shouldn't happen — the edit page passes both. Guard so a
      // mis-wired caller fails loud instead of silently no-op'ing.
      setServerError("Edit mode requires a capsule id.")
      toast.error("Edit mode requires a capsule id.")
      return
    }

    if (isEdit) {
      // PATCH /api/capsules/[id] — edit an existing capsule.
      // Wall-bound capsules are blocked at the API with 409; we don't
      // need to defend against that here. The form still submits the
      // full payload (title, content, recipients) so the server has
      // everything it needs to atomically replace the rows.
      const payload = {
        title: values.title,
        deliveryDate: values.deliveryDate
          ? new Date(values.deliveryDate).toISOString()
          : undefined,
        content: [
          values.contentType === "text"
            ? { contentType: "text" as const, contentText: values.body ?? "" }
            : {
                contentType: values.contentType,
                contentUrl: values.mediaUrl,
                uploadthingKey: values.mediaKey,
              },
        ],
        recipients: values.recipients.map((r) => ({
          name: r.name || undefined,
          email: r.email || undefined,
          phone: r.phone || undefined,
          channel: r.channel,
        })),
      }

      startTransition(async () => {
        try {
          const res = await fetch(`/api/capsules/${capsuleId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
          if (!res.ok) {
            const data = (await res.json().catch(() => ({}))) as {
              error?: string
            }
            const message = data.error ?? `Request failed (${res.status})`
            setServerError(message)
            toast.error(message)
            return
          }
          toast.success("Capsule updated.")
          router.push("/dashboard/capsules")
          router.refresh()
        } catch (err) {
          const message = err instanceof Error ? err.message : "Network error"
          setServerError(message)
          toast.error(message)
        }
      })
      return
    }

    // Create path (unchanged): POST /api/capsules.
    const payload: CapsuleCreatePayload = {
      title: values.title,
      wallId: values.wallId || undefined,
      deliveryDate:
        values.wallId || !values.deliveryDate
          ? undefined
          : new Date(values.deliveryDate).toISOString(),
      content: [
        values.contentType === "text"
          ? { contentType: "text", contentText: values.body ?? "" }
          : {
              contentType: values.contentType,
              contentUrl: values.mediaUrl,
              uploadthingKey: values.mediaKey,
            },
      ],
      recipients: values.wallId
        ? undefined
        : values.recipients.map((r) => ({
            name: r.name || undefined,
            email: r.email || undefined,
            phone: r.phone || undefined,
            channel: r.channel,
          })),
      status: "scheduled",
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/capsules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: string
          }
          const message = data.error ?? `Request failed (${res.status})`
          setServerError(message)
          toast.error(message)
          return
        }
        toast.success(
          isWallMode
            ? "Added to wall — sealed until the open date."
            : "Capsule sealed — we'll deliver it on the date you picked.",
        )
        router.push("/dashboard/capsules")
        router.refresh()
      } catch (err) {
        const message = err instanceof Error ? err.message : "Network error"
        setServerError(message)
        toast.error(message)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      {serverError && (
        <div
          role="alert"
          className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md"
        >
          {serverError}
        </div>
      )}

      {/* Title */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">What is this capsule about?</CardTitle>
          <CardDescription>
            A short title for your own reference — the recipient sees it in
            the email subject.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            placeholder="For mum, on her 60th"
            aria-invalid={!!errors.title}
            {...register("title")}
          />
          {errors.title && (
            <p className="text-sm text-destructive" role="alert">
              {errors.title.message}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Destination: wall or private */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Where does it go?</CardTitle>
          <CardDescription>
            Private capsules are delivered to one or more recipients on a
            date you pick. Wall capsules are sealed into a shared wall and
            unlock for everyone when the wall opens.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* The wall picker is hidden in edit mode — wall binding is
              immutable. The wall notice (further down) still shows if
              the existing capsule is wall-bound. */}
          {availableWalls.length > 0 && !isEdit && (
            <div className="space-y-2">
              <Label htmlFor="wallId">Contribute to an existing wall</Label>
              <Select
                id="wallId"
                placeholder="— Private capsule (no wall) —"
                options={[
                  { label: "— Private capsule (no wall) —", value: "" },
                  ...availableWalls.map((w) => ({
                    label: `${w.name} (opens ${formatDate(w.openDate)})`,
                    value: w.id,
                  })),
                ]}
                {...register("wallId")}
              />
            </div>
          )}

          {!isWallMode && (
            <div className="space-y-2">
              <Label htmlFor="deliveryDate">Delivery date</Label>
              <Input
                id="deliveryDate"
                type="datetime-local"
                aria-invalid={!!errors.deliveryDate}
                {...register("deliveryDate")}
              />
              {errors.deliveryDate && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.deliveryDate.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                We&apos;ll deliver within 10 minutes of this time.
              </p>
            </div>
          )}

          {isWallMode && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm flex items-start gap-2">
              <Lock className="mt-0.5 size-4 text-muted-foreground" aria-hidden />
              <p className="text-muted-foreground">
                The wall&apos;s open date is the delivery moment — your
                contribution will be hidden from everyone, including you,
                until the wall unlocks.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">What&apos;s inside?</CardTitle>
          <CardDescription>
            Pick a content type. Text is the simplest; image, audio, and
            video upload through UploadThing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ContentTypePicker
            value={contentType}
            onChange={(v) => {
              setValue("contentType", v, { shouldDirty: true })
              setValue("body", "")
              setValue("mediaUrl", "")
              setValue("mediaKey", "")
            }}
          />
          {errors.body && (
            <p className="text-sm text-destructive" role="alert">
              {errors.body.message}
            </p>
          )}

          {contentType === "text" ? (
            <div className="space-y-2">
              <Label htmlFor="body">Message</Label>
              <Textarea
                id="body"
                placeholder="Write the message you want delivered…"
                rows={8}
                aria-invalid={!!errors.body}
                {...register("body")}
              />
            </div>
          ) : (
            <MediaUploader
              contentType={contentType}
              onUploaded={(url, key) => {
                setValue("mediaUrl", url, { shouldDirty: true })
                setValue("mediaKey", key, { shouldDirty: true })
              }}
              currentUrl={watch("mediaUrl")}
              onClear={() => {
                setValue("mediaUrl", "")
                setValue("mediaKey", "")
              }}
            />
          )}
        </CardContent>
      </Card>

      {/* Recipients (private only) */}
      {!isWallMode && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recipients</CardTitle>
            <CardDescription>
              Who should we deliver this to, and on which channel? Add as
              many as you need — each can be on a different channel.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recipients.fields.map((field, index) => (
              <RecipientRow
                key={field.id}
                index={index}
                register={register}
                remove={recipients.remove}
                errors={errors.recipients?.[index]}
                canRemove={recipients.fields.length > 1}
              />
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                recipients.append({ name: "", email: "", phone: "", channel: "email" })
              }
            >
              <Plus className="size-4" />
              Add recipient
            </Button>
            {errors.recipients &&
              typeof errors.recipients.message === "string" && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.recipients.message}
                </p>
              )}
          </CardContent>
        </Card>
      )}

      <Separator />

      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending} aria-busy={isPending}>
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {isEdit ? "Saving…" : "Sealing…"}
            </>
          ) : isEdit ? (
            <>
              <Save className="size-4" aria-hidden />
              Save changes
            </>
          ) : isWallMode ? (
            <>
              <Users className="size-4" aria-hidden />
              Add to wall
            </>
          ) : (
            "Seal capsule"
          )}
        </Button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const contentTypeItems = [
  { value: "text" as const, label: "Text", Icon: FileText },
  { value: "image" as const, label: "Image", Icon: ImageIcon },
  { value: "audio" as const, label: "Audio", Icon: Mic },
  { value: "video" as const, label: "Video", Icon: Video },
]

function ContentTypePicker({
  value,
  onChange,
}: {
  value: "text" | "image" | "audio" | "video"
  onChange: (v: "text" | "image" | "audio" | "video") => void
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Content type"
      className="grid grid-cols-2 gap-2 sm:grid-cols-4"
    >
      {contentTypeItems.map(({ value: v, label, Icon }) => {
        const active = value === v
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(v)}
            className={
              "flex flex-col items-center justify-center gap-1.5 rounded-lg border p-3 text-sm transition-colors " +
              (active
                ? "border-primary bg-primary/5 text-foreground"
                : "border-border text-muted-foreground hover:bg-muted/40")
            }
          >
            <Icon className="size-5" aria-hidden />
            <span>{label}</span>
          </button>
        )
      })}
    </div>
  )
}

function RecipientRow({
  index,
  register,
  remove,
  errors,
  canRemove,
}: {
  index: number
  register: ReturnType<typeof useForm<FormValues>>["register"]
  remove: (index: number) => void
  errors?: {
    name?: { message?: string }
    email?: { message?: string }
    phone?: { message?: string }
    channel?: { message?: string }
  }
  canRemove: boolean
}) {
  return (
    <div className="rounded-lg border border-border p-3 space-y-2">
      <div className="flex items-center justify-between">
        <Badge variant="outline">Recipient {index + 1}</Badge>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Remove recipient ${index + 1}`}
            onClick={() => remove(index)}
          >
            <X className="size-4" />
          </Button>
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor={`recipients.${index}.name`}>Name</Label>
          <Input
            id={`recipients.${index}.name`}
            placeholder="Mum"
            {...register(`recipients.${index}.name` as const)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`recipients.${index}.email`}>Email</Label>
          <Input
            id={`recipients.${index}.email`}
            type="email"
            placeholder="mum@example.com"
            aria-invalid={!!errors?.email}
            {...register(`recipients.${index}.email` as const)}
          />
          {errors?.email && (
            <p className="text-xs text-destructive" role="alert">
              {errors.email.message}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`recipients.${index}.phone`}>Phone</Label>
          <Input
            id={`recipients.${index}.phone`}
            type="tel"
            placeholder="+1 555 0100"
            aria-invalid={!!errors?.phone}
            {...register(`recipients.${index}.phone` as const)}
          />
          {errors?.phone && (
            <p className="text-xs text-destructive" role="alert">
              {errors.phone.message}
            </p>
          )}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`recipients.${index}.channel`}>Channel</Label>
        <Select
          id={`recipients.${index}.channel`}
          options={[
            { label: "Email", value: "email" },
            { label: "SMS (v1.1)", value: "sms" },
            { label: "Push (v1.1)", value: "push" },
          ]}
          {...register(`recipients.${index}.channel` as const)}
        />
        <p className="text-xs text-muted-foreground">
          SMS and push aren&apos;t wired yet — pick email for now if you
          want delivery to actually fire.
        </p>
      </div>
      {errors && typeof (errors as { message?: string }).message === "string" && (
        <p className="text-sm text-destructive" role="alert">
          {(errors as { message: string }).message}
        </p>
      )}
    </div>
  )
}

function MediaUploader({
  contentType,
  onUploaded,
  onClear,
  currentUrl,
}: {
  contentType: "image" | "audio" | "video"
  onUploaded: (url: string, key: string) => void
  onClear: () => void
  currentUrl?: string
}) {
  const endpoint =
    contentType === "image"
      ? "imageUploader"
      : contentType === "audio"
        ? "audioUploader"
        : "videoUploader"

  const { startUpload, isUploading } = useUploadThing(endpoint, {
    onClientUploadComplete: (res) => {
      const file = res?.[0]
      if (file) {
        onUploaded(file.ufsUrl ?? file.url, file.key)
        toast.success(`${contentType} uploaded.`)
      }
    },
    onUploadError: (err) => {
      // Upload failures are not blocking — the user can retry. We
      // surface a toast (in addition to the console error) so the
      // failure isn't silent.
      console.error("[upload]", err.message)
      toast.error(`Upload failed: ${err.message}`)
    },
  })

  if (currentUrl) {
    return (
      <div className="rounded-lg border border-border p-3 flex items-center gap-3">
        <div className="size-10 rounded-md bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
          {contentType.toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">Uploaded</p>
          <p className="text-xs text-muted-foreground truncate">{currentUrl}</p>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClear} aria-label="Remove media">
          <X className="size-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-dashed border-border p-6 flex flex-col items-center justify-center gap-2 text-center">
      <Upload className="size-6 text-muted-foreground" aria-hidden />
      <p className="text-sm text-muted-foreground">
        Upload a {contentType} file — it&apos;ll be sealed into the
        capsule.
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isUploading}
        onClick={() => {
          // Use a hidden input file picker to start the upload. We
          // can't use `<UploadButton>`'s JSX directly because that
          // pulls in UploadThing's own styles; calling `startUpload`
          // from a button click is the documented programmatic path.
          const input = document.createElement("input")
          input.type = "file"
          if (contentType === "image") input.accept = "image/*"
          if (contentType === "audio") input.accept = "audio/*"
          if (contentType === "video") input.accept = "video/*"
          input.onchange = () => {
            if (input.files && input.files.length > 0) {
              void startUpload(Array.from(input.files!))
            }
          }
          input.click()
        }}
      >
        {isUploading ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Uploading…
          </>
        ) : (
          <>
            <Upload className="size-4" aria-hidden />
            Choose file
          </>
        )}
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Default the delivery-date input to "tomorrow at 09:00 local time" so
 * a fresh form has a sensible starting value.
 */
function defaultDeliveryDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(9, 0, 0, 0)
  // `datetime-local` wants `YYYY-MM-DDTHH:mm` in LOCAL time, no timezone.
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * Convert an ISO timestamp to the `YYYY-MM-DDTHH:mm` local format that
 * `<input type="datetime-local">` expects. Used when seeding the
 * delivery-date input from the stored `capsule.deliveryDate`.
 */
function toLocalDateTimeInput(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return defaultDeliveryDate()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}
