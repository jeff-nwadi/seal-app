import SignUpBlock from "@/components/SignUpBlock";
import { Seal } from "@/components/ui/icons";

export const metadata = {
  title: "Sign Up — Seal",
  description: "Create a Seal account.",
};

// Defensive: the page transitively imports `authClient`, which would
// otherwise be evaluated at build time during prerender.
export const dynamic = "force-dynamic";

export default function SignUpPage() {
  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center bg-background px-4 py-16 sm:py-24">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        <Seal className="size-12 text-primary" />
        <SignUpBlock />
      </div>
    </div>
  );
}
