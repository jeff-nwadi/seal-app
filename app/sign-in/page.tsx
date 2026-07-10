import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import SignInBlock from "@/components/SignInBlock";
import { Seal } from "@/components/ui/icons";

export const metadata = {
  title: "Sign In — Seal",
  description: "Sign in to your Seal account.",
};

export default function SignInPage() {
  return (
    <div className="w-full min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4 py-16 sm:py-24">
        <div className="w-full max-w-sm flex flex-col items-center gap-8">
          <Seal className="size-12 text-primary" />
          <SignInBlock />
        </div>
      </main>

      <Footer />
    </div>
  );
}
