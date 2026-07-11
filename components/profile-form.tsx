"use client";

/**
 * Profile editor for the settings page.
 *
 * Wires the readOnly Name/Email fields (which were placeholders pre-auth)
 * to `authClient.updateUser` for the name field. Email changes have to go
 * through a verification flow on Better Auth's side; until that ships we
 * show the email as read-only with a hint, and let the user update the
 * name.
 *
 * On save, calls `router.refresh()` so the layout re-reads the session
 * from `lib/auth.ts` and the new name appears in the sidebar.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { updateUser } from "@/lib/auth-client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const profileSchema = z.object({
  name: z.string().min(1, "Name is required").max(80, "Name is too long"),
});
type ProfileValues = z.infer<typeof profileSchema>;

export function ProfileForm({
  defaultName,
  email,
}: {
  defaultName: string;
  email: string;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: defaultName },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const { error } = await updateUser({ name: values.name });
    if (error) {
      const message = error.message ?? "Could not update profile.";
      setServerError(message);
      toast.error(message);
      return;
    }
    reset({ name: values.name }); // clears `isDirty` after a successful save
    toast.success("Profile updated.");
    router.refresh();
  });

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

      <div className="grid gap-2 sm:max-w-sm">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          autoComplete="name"
          aria-invalid={!!errors.name}
          {...register("name")}
        />
        {errors.name && (
          <p className="text-sm text-destructive" role="alert">
            {errors.name.message}
          </p>
        )}
      </div>

      <div className="grid gap-2 sm:max-w-sm">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" defaultValue={email} readOnly aria-readonly />
        <p className="text-xs text-muted-foreground">
          Email changes require a verification round-trip — that flow
          ships with the email channel in step 3.
        </p>
      </div>

      <Button type="submit" disabled={isSubmitting || !isDirty}>
        {isSubmitting ? (
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
    </form>
  );
}
