/**
 * Typed UploadThing helpers for client components.
 *
 * Generates `UploadButton` / `UploadDropzone` pre-bound to our file
 * router so the CapsuleForm can import them and get the right
 * endpoints + types without re-declaring the router in the client.
 */
"use client";

import { generateReactHelpers } from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/core";

export const { useUploadThing, uploadFiles } =
  generateReactHelpers<OurFileRouter>();
