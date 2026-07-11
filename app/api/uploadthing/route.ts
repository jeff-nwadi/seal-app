/**
 * UploadThing catch-all route — the package expects the Next.js
 * App Router handler at `app/api/uploadthing/route.ts` named `routeHandlers`.
 */
import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "./core";

export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
});
