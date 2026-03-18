/**
 * server/index.ts — Production entry point
 */
import { createApp } from "./app";
import { setupVite, serveStatic, log } from "./vite";
import { initStripe } from "./stripeInit";

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
  process.exit(1);
});

(async () => {
  console.log("Starting server...");
  
  const { app, server } = await createApp();
  console.log("App created");

  app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));

  try {
    await initStripe();
    console.log("Stripe initialized");
  } catch (err: any) {
    console.error("Stripe init failed (non-fatal):", err.message);
  }

  try {
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }
    console.log("Static/Vite setup done");
  } catch (err) {
    console.error("Static setup failed:", err);
  }

  const port = parseInt(process.env.PORT || "8080", 10);
  
  server.listen({ port, host: "0.0.0.0", reusePort: true }, () => {
    log(`serving on port ${port}`);
    console.log(`Server listening on 0.0.0.0:${port}`);
  });
})();
