"use client"

/**
 * New wall form. POSTs to `/api/walls` and on success pushes to the
 * new wall's page (`/walls/<id>`) so the user can see the share URL
 * and start adding their own contribution.
 */
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2, Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"

const schema = z.object({
  name: z.string().min(1, "Name is required").max(80),
  description: z.string().max(500).optional(),
  openDate: z.string().min(1, "Open date is required"),
  visibility: z.enum(["public", "unlisted", "private"]),
})

type Values = z.infer<typeof schema>

export function NewWallForm() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      description: "",
      openDate: defaultOpenDate(),
      visibility: "public",
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null)
    const openDateIso = new Date(values.openDate).toISOString()
    startTransition(async () => {
      try {
        const res = await fetch("/api/walls", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: values.name,
            description: values.description,
            openDate: openDateIso,
            visibility: values.visibility,
          }),
        })
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string }
          const message = data.error ?? `Request failed (${res.status})`
          setServerError(message)
          toast.error(message)
          return
        }
        const data = (await res.json()) as { id: string; slug: string }
        toast.success("Wall created — share the URL to collect contributions.")
        router.push(`/walls/${data.slug}`)
        router.refresh()
      } catch (err) {
        const message = err instanceof Error ? err.message : "Network error"
        setServerError(message)
        toast.error(message)
      }
    })
  })

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {serverError && (
        <div
          role="alert"
          className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md"
        >
          {serverError}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Wall name</Label>
        <Input
          id="name"
          placeholder="Class of 2026"
          aria-invalid={!!errors.name}
          {...register("name")}
        />
        {errors.name && (
          <p className="text-sm text-destructive" role="alert">
            {errors.name.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea
          id="description"
          rows={3}
          placeholder="A short note shown to anyone who opens the wall."
          {...register("description")}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="openDate">Open date</Label>
        <Input
          id="openDate"
          type="datetime-local"
          aria-invalid={!!errors.openDate}
          {...register("openDate")}
        />
        {errors.openDate && (
          <p className="text-sm text-destructive" role="alert">
            {errors.openDate.message}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          The wall unlocks for everyone at this time. You can still
          contribute before then.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="visibility">Visibility</Label>
        <Select
          id="visibility"
          options={[
            { label: "Public (searchable, shareable URL)", value: "public" },
            { label: "Unlisted (only people with the URL)", value: "unlisted" },
            { label: "Private (organizer only — v1.1)", value: "private" },
          ]}
          {...register("visibility")}
        />
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending} aria-busy={isPending}>
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Creating…
            </>
          ) : (
            <>
              <Plus className="size-4" aria-hidden />
              Create wall
            </>
          )}
        </Button>
      </div>
    </form>
  )
}

/**
 * Default to "30 days from now, 17:00 local" — a typical wall open
 * moment. The user can adjust freely.
 */
function defaultOpenDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 30)
  d.setHours(17, 0, 0, 0)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
