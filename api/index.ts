/**
 * api/index.ts — Vercel Serverless Entry Point
 *
 * Vercel automatically wraps this as a serverless function.
 * All /api/* requests are routed here via vercel.json.
 *
 * NOTE: The frontend (React/Vite) is served separately as static
 * files from dist/public — Vercel handles that automatically.
 */

import { createApp } from "../server/app";

let appPromise: ReturnType<typeof createApp> | null = null;

// Reuse the same app instance across warm invocations
function getApp() {
  if (!appPromise) {
    appPromise = createApp();
  }
  return appPromise;
}

export default async function handler(req: any, res: any) {
  const { app } = await getApp();
  return app(req, res);
}
