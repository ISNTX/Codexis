/**
 * server/index.ts — Local development entry point
 *
 * This file is only used when running locally (`npm run dev`).
 * Vercel uses api/index.ts instead.
 */

import { createApp } from "./app";
import { setupVite, serveStatic, log } from "./vite";
import { initStripe } from "./stripeInit";

(async () => {
  const { app, server } = await createApp();

  // Initialize Stripe webhook (non-blocking)
  await initStripe().catch((err) => {
    console.error("Stripe init failed (non-fatal):", err.message);
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({ port, host: "0.0.0.0", reusePort: true }, () => {
    log(`serving on port ${port}`);
  });
})();
