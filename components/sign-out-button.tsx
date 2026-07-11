"use client";

/**
 * Sign-out control for the settings page.
 *
 * The sidebar footer in `components/dashboard-shell.tsx` also has a
 * sign-out affordance, but the settings page needs a clear primary
 * action — this button matches the AGENTS.md "follow the interaction-
 * state checklist" guidance (default, hover, focus, disabled, loading).
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { signOut } from "@/lib/auth-client";

import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    try {
      await signOut();
      toast.success("Signed out — see you soon.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not sign out.");
    } finally {
      setIsLoading(false);
    }
    router.push("/sign-in");
    router.refresh();
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleClick}
      disabled={isLoading}
      aria-busy={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Signing out…
        </>
      ) : (
        <>
          <LogOut className="size-4" aria-hidden />
          Sign out
        </>
      )}
    </Button>
  );
}
