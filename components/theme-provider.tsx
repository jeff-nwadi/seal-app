"use client";

// Thin wrapper around `next-themes`' `ThemeProvider` so it lives in the
// component tree where shadcn/UI conventions expect it. Keeping it as a
// separate file (rather than inlining the provider in `app/layout.tsx`)
// means the rest of the app can import it by name without pulling
// `next-themes` into every bundle.
//
// The current Seal app is dark-only (see `app/globals.css`), so we pin
// `defaultTheme="dark"` and disable system detection. Switching the
// product to a light theme would be a much larger brand-token change
// (per AGENTS.md) and is out of scope here.
import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

type ThemeProviderProps = ComponentProps<typeof NextThemesProvider>;

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
