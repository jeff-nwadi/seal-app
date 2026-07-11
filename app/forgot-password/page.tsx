import ForgotPasswordBlock from "@/components/ForgotPasswordBlock";
import { Seal } from "@/components/ui/icons";

export const metadata = {
  title: "Forgot password — Seal",
};

// Force dynamic — the page imports `authClient` (transitively) which
// needs a valid `baseURL` at module load. Without `force-dynamic`
// Next.js prerenders the page at build time, the URL parse fails
// (the Vercel env var is just a bare host, no protocol), and the
// build aborts. `force-dynamic` defers everything to request time.
export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center bg-background px-4 py-16 sm:py-24">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        <Seal className="size-12 text-primary" />
        <ForgotPasswordBlock />
      </div>
    </div>
  );
}
