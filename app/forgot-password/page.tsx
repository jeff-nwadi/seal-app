import ForgotPasswordBlock from "@/components/ForgotPasswordBlock";
import { Seal } from "@/components/ui/icons";

export const metadata = {
  title: "Forgot password — Seal",
};

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
