import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type EmDashReplacementMode = "remove" | "period" | "comma" | "hyphen";

/**
 * Replaces or removes em-dashes (—) in a given string.
 * @param text The input string containing em-dashes
 * @param mode The replacement mode:
 *   - "remove": removes the em-dash and collapses whitespace to a single space
 *   - "period": replaces the em-dash with a period and capitalizes the next letter
 *   - "comma": replaces the em-dash with a comma
 *   - "hyphen": replaces the em-dash with a space-hyphen-space
 */
export function handleEmDash(text: string, mode: EmDashReplacementMode = "remove"): string {
  switch (mode) {
    case "remove":
      return text.replace(/\s*—\s*/g, " ");
    case "period":
      return text.replace(/\s*—\s*([a-z]?)/gi, (_, letter) => {
        return `. ${letter.toUpperCase()}`;
      });
    case "comma":
      return text.replace(/\s*—\s*/g, ", ");
    case "hyphen":
      return text.replace(/\s*—\s*/g, " - ");
    default:
      return text;
  }
}

