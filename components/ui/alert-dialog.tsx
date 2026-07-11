"use client"

/**
 * Modal dialog used for destructive confirmations (delete capsule, etc.).
 * Thin shadcn-style wrapper around `@radix-ui/react-alert-dialog`. The
 * base Radix package is already in `package-lock.json` as a transitive
 * of the `radix-ui` umbrella; it's declared as a direct dep in
 * `package.json` so we can import from it.
 *
 * Usage:
 *   <AlertDialog>
 *     <AlertDialogTrigger asChild>
 *       <button className={cn(buttonVariants({ variant: "ghost" }))}>
 *         Delete
 *       </button>
 *     </AlertDialogTrigger>
 *     <AlertDialogContent>
 *       <AlertDialogHeader>
 *         <AlertDialogTitle>Delete this capsule?</AlertDialogTitle>
 *         <AlertDialogDescription>This can't be undone.</AlertDialogDescription>
 *       </AlertDialogHeader>
 *       <AlertDialogFooter>
 *         <AlertDialogCancel>Cancel</AlertDialogCancel>
 *         <AlertDialogAction onClick={...}>Delete</AlertDialogAction>
 *       </AlertDialogFooter>
 *     </AlertDialogContent>
 *   </AlertDialog>
 *
 * Note: the project's `Button` is built on `@base-ui/react` and does
 * NOT support Radix's `asChild` Slot pattern, so the trigger must be
 * a plain `<button>` (or `<Link>`) styled with `buttonVariants`
 * directly. See `components/capsule-row-actions.tsx` for the
 * established pattern.
 */
import * as React from "react"
import {
  AlertDialog as AlertDialogPrimitive,
  AlertDialogTrigger as AlertDialogTriggerPrimitive,
  AlertDialogPortal as AlertDialogPortalPrimitive,
  AlertDialogOverlay as AlertDialogOverlayPrimitive,
  AlertDialogContent as AlertDialogContentPrimitive,
  AlertDialogTitle as AlertDialogTitlePrimitive,
  AlertDialogDescription as AlertDialogDescriptionPrimitive,
  AlertDialogAction as AlertDialogActionPrimitive,
  AlertDialogCancel as AlertDialogCancelPrimitive,
} from "@radix-ui/react-alert-dialog"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

function AlertDialog({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive>) {
  return <AlertDialogPrimitive data-slot="alert-dialog" {...props} />
}

function AlertDialogTrigger({
  ...props
}: React.ComponentProps<typeof AlertDialogTriggerPrimitive>) {
  return (
    <AlertDialogTriggerPrimitive
      data-slot="alert-dialog-trigger"
      {...props}
    />
  )
}

function AlertDialogPortal({
  ...props
}: React.ComponentProps<typeof AlertDialogPortalPrimitive>) {
  return (
    <AlertDialogPortalPrimitive
      data-slot="alert-dialog-portal"
      {...props}
    />
  )
}

function AlertDialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogOverlayPrimitive>) {
  return (
    <AlertDialogOverlayPrimitive
      data-slot="alert-dialog-overlay"
      className={cn("fixed inset-0 z-50 bg-black/50", className)}
      {...props}
    />
  )
}

function AlertDialogContent({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogContentPrimitive>) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogContentPrimitive
        data-slot="alert-dialog-content"
        className={cn(
          "bg-card text-card-foreground fixed top-1/2 left-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border border-border p-6 shadow-lg",
          className,
        )}
        {...props}
      />
    </AlertDialogPortal>
  )
}

function AlertDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn("flex flex-col gap-2 text-left", className)}
      {...props}
    />
  )
}

function AlertDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  )
}

function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogTitlePrimitive>) {
  return (
    <AlertDialogTitlePrimitive
      data-slot="alert-dialog-title"
      className={cn("text-base font-semibold", className)}
      {...props}
    />
  )
}

function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogDescriptionPrimitive>) {
  return (
    <AlertDialogDescriptionPrimitive
      data-slot="alert-dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function AlertDialogAction({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogActionPrimitive>) {
  return (
    <AlertDialogActionPrimitive
      className={cn(buttonVariants({ variant: "destructive" }), className)}
      {...props}
    />
  )
}

function AlertDialogCancel({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogCancelPrimitive>) {
  return (
    <AlertDialogCancelPrimitive
      className={cn(buttonVariants({ variant: "outline" }), className)}
      {...props}
    />
  )
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
}
