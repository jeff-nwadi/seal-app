import SignInBlock from "@/components/SignInBlock";
import { Seal } from "@/components/ui/icons";

export const metadata = {
  title: "Sign In — Seal",
  description: "Sign in to your Seal account.",
};

export default async function SignInPage({
  searchParams,
}: {
  // Next.js 15+ passes `searchParams` as a Promise. Awaiting it on the
  // server side is the supported pattern.
  searchParams: Promise<{ verify?: string; email?: string; from?: string }>;
}) {
  const params = await searchParams;
  const showVerifyBanner = params.verify === "sent";

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center bg-background px-4 py-16 sm:py-24">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        <Seal className="size-12 text-primary" />
        {showVerifyBanner && (
          <div
            role="status"
            className="w-full p-3 text-sm border border-primary/30 bg-primary/5 rounded-md"
          >
            <p className="font-medium">Check your email.</p>
            <p className="text-muted-foreground">
              We sent a verification link
              {params.email ? ` to ${params.email}` : ""}. Click it to
              activate your account, then come back here to sign in.
            </p>
          </div>
        )}
        <SignInBlock />
      </div>
    </div>
  );
}
