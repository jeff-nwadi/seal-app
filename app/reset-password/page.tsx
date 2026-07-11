import ResetPasswordBlock from "@/components/ResetPasswordBlock";
import { Seal } from "@/components/ui/icons";

export const metadata = {
  title: "Reset password — Seal",
};

// Force dynamic so the search params (the `?token=…` from the reset email)
// are read on every request, not at build time.
export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center bg-background px-4 py-16 sm:py-24">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        <Seal className="size-12 text-primary" />
        <ResetPasswordBlock />
      </div>
    </div>
  );
}
