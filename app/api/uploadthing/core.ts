/**
 * UploadThing file router.
 *
 * Three endpoints — `image`, `audio`, `video` — each with size and
 * type limits appropriate to the format. All three go through the
 * `middleware` hook which checks a valid Better Auth session; an
 * unauthenticated caller cannot mint an upload URL.
 *
 * Per AGENTS.md:
 *   "UploadThing endpoints must check for a valid Better Auth session
 *    in `.middleware()` before issuing an upload URL — never allow
 *    unauthenticated uploads."
 *
 * We additionally pass the session user id into `onUploadComplete` so
 * the client can later attribute the uploaded asset to a specific
 * capsule.
 */
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { getSession } from "@/lib/auth";

const f = createUploadthing();

export const ourFileRouter = {
  /**
   * Image endpoint — 8 MB cap, image MIME types. The PRD's
   * `contentType = 'image'` row stores the resulting URL.
   */
  imageUploader: f({
    image: { maxFileSize: "8MB", maxFileCount: 1 },
  })
    .middleware(async () => {
      const session = await getSession();
      if (!session) throw new Error("Unauthorized");
      return { userId: session.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.userId, url: file.ufsUrl ?? file.url };
    }),

  /**
   * Audio endpoint — 16 MB cap. Slightly larger than the image cap
   * because voice notes are typically longer than a photo is large.
   */
  audioUploader: f({
    audio: { maxFileSize: "16MB", maxFileCount: 1 },
  })
    .middleware(async () => {
      const session = await getSession();
      if (!session) throw new Error("Unauthorized");
      return { userId: session.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.userId, url: file.ufsUrl ?? file.url };
    }),

  /**
   * Video endpoint — 64 MB cap. The PRD notes video is the most
   * likely feature to run over budget; v1.1 can split this into a
   * chunked-upload endpoint if needed.
   */
  videoUploader: f({
    video: { maxFileSize: "64MB", maxFileCount: 1 },
  })
    .middleware(async () => {
      const session = await getSession();
      if (!session) throw new Error("Unauthorized");
      return { userId: session.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.userId, url: file.ufsUrl ?? file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
