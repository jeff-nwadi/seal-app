"use client";

/**
 * Reset password form (Client Component).
 *
 * Better Auth appends `?token=…` to the reset link in the email. The
 * user lands here, enters a new password, and we call
 * `authClient.resetPassword({ newPassword, token })`. On success, push
 * to `/sign-in`.
 */
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Lock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const schema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password is too long"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match",
  });

type Values = z.infer<typeof schema>;

export default function ResetPasswordBlock() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  if (!token) {
    return (
      <Card className="w-full max-w-sm mx-auto flex flex-col gap-6 border-border">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">
            Invalid reset link
          </CardTitle>
          <CardDescription>
            The link you followed is missing or malformed. Request a new
            one from the forgot-password page.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const onSubmit = handleSubmit(async ({ password }) => {
    setError(null);
    const { error } = await authClient.resetPassword({ newPassword: password, token });
    if (error) {
      const message = error.message ?? "Could not reset password.";
      setError(message);
      toast.error(message);
      return;
    }
    toast.success("Password updated — sign in with your new one.");
    router.push("/sign-in?from=/dashboard&reset=success");
  });

  return (
    <Card className="w-full max-w-sm mx-auto flex flex-col gap-6 border-border">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold tracking-tight">
          Set a new password
        </CardTitle>
        <CardDescription>
          Choose something strong you haven&apos;t used before.
        </CardDescription>
      </CardHeader>

      <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
        <CardContent className="flex flex-col gap-4">
          {error && (
            <div
              role="alert"
              className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md"
            >
              {error}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">New password</Label>
            <div className="relative">
              <Lock
                className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none"
                aria-hidden
              />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                disabled={isSubmitting}
                aria-invalid={!!errors.password}
                className="pl-9 pr-9"
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                disabled={isSubmitting}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {showPassword ? (
                  <EyeOff className="size-4" aria-hidden />
                ) : (
                  <Eye className="size-4" aria-hidden />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-destructive" role="alert">
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <div className="relative">
              <Lock
                className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none"
                aria-hidden
              />
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="Repeat your password"
                autoComplete="new-password"
                disabled={isSubmitting}
                aria-invalid={!!errors.confirmPassword}
                className="pl-9"
                {...register("confirmPassword")}
              />
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-destructive" role="alert">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button
            type="submit"
            variant="default"
            size="lg"
            className="w-full"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? "Resetting..." : "Reset password"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
