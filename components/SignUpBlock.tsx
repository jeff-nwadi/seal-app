"use client";

/**
 * Sign-up form (Client Component).
 *
 * Calls `authClient.signUp.email` from `lib/auth-client.ts`. On success we
 * push to `/sign-in?from=…` with a friendly note, because email
 * verification is required (`requireEmailVerification: true` in
 * `lib/auth.ts`) — the user has to click the link in the verification
 * email before they can actually sign in.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import Link from "next/link";
import { Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { signUp } from "@/lib/auth-client";

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

const signUpSchema = z
  .object({
    name: z
      .string()
      .min(1, "Name is required")
      .max(80, "Name is too long"),
    email: z.string().email("Please enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password is too long"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match",
  });

type SignUpFormValues = z.infer<typeof signUpSchema>;

export default function SignUpBlock() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const { error } = await signUp.email({
      email: values.email,
      password: values.password,
      name: values.name,
      callbackURL: "/dashboard",
    });
    if (error) {
      const code = (error as { code?: string }).code;
      const message =
        code === "USER_ALREADY_EXISTS"
          ? "An account with that email already exists. Try signing in instead."
          : (error.message ?? "Sign up failed. Please try again.");
      setServerError(message);
      toast.error(message);
      return;
    }
    // Bounce to sign-in with a banner param the sign-in page can render.
    // The user can't sign in yet — verification is required — but this
    // gives them a clear next step.
    toast.success(
      "Account created — check your email for the verification link.",
    );
    router.push(
      `/sign-in?from=/dashboard&verify=sent&email=${encodeURIComponent(values.email)}`,
    );
  });

  return (
    <Card className="w-full max-w-sm mx-auto flex flex-col gap-6 border-border">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold tracking-tight">
          Create your account
        </CardTitle>
        <CardDescription>
          Start sealing messages for the future.
        </CardDescription>
      </CardHeader>

      <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
        <CardContent className="flex flex-col gap-4">
          {serverError && (
            <div
              role="alert"
              className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md"
            >
              {serverError}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <div className="relative">
              <User
                className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none"
                aria-hidden
              />
              <Input
                id="name"
                type="text"
                placeholder="Jane Doe"
                autoComplete="name"
                disabled={isSubmitting}
                aria-invalid={!!errors.name}
                className="pl-9"
                {...register("name")}
              />
            </div>
            {errors.name && (
              <p className="text-sm text-destructive" role="alert">
                {errors.name.message}
              </p>
            )}
          </div>

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
                placeholder="jane.doe@example.com"
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

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock
                className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none"
                aria-hidden
              />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Choose a strong password"
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
            <Label htmlFor="confirmPassword">Confirm password</Label>
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
            {isSubmitting ? "Creating account..." : "Create Account"}
          </Button>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/sign-in"
                className="text-foreground font-medium hover:text-primary no-underline"
              >
                Sign In
              </Link>
            </p>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
