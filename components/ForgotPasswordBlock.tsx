"use client";

/**
 * Forgot password form (Client Component).
 *
 * Calls `authClient.forgetPassword`, which triggers Better Auth to send
 * a reset email via the `sendResetPassword` hook in `lib/auth.ts`. The
 * email contains a link to `/reset-password?token=…`.
 *
 * The user-visible flow on success: the page shows a "check your email"
 * message. We do NOT confirm whether the email exists (that's Better
 * Auth's behavior too — prevents user enumeration).
 */
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail } from "lucide-react";
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

const forgotSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotValues = z.infer<typeof forgotSchema>;

export default function ForgotPasswordBlock() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = handleSubmit(async ({ email }) => {
    setError(null);
    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: "/reset-password",
    });
    if (error) {
      const message = error.message ?? "Could not send reset email.";
      setError(message);
      toast.error(message);
      return;
    }
    toast.success("If that email exists, a reset link is on its way.");
    setSent(true);
  });

  if (sent) {
    return (
      <Card className="w-full max-w-sm mx-auto flex flex-col gap-6 border-border">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">
            Check your email
          </CardTitle>
          <CardDescription>
            If an account exists for that address, we sent a link to reset
            your password. It expires in 1 hour.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm mx-auto flex flex-col gap-6 border-border">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold tracking-tight">
          Forgot your password?
        </CardTitle>
        <CardDescription>
          Enter your email and we&apos;ll send you a reset link.
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
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail
                className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none"
                aria-hidden
              />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                disabled={isSubmitting}
                aria-invalid={!!errors.email}
                className="pl-9"
                {...register("email")}
              />
            </div>
            {errors.email && (
              <p className="text-sm text-destructive" role="alert">
                {errors.email.message}
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
            {isSubmitting ? "Sending..." : "Send reset link"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
