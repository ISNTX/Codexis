/**
 * server/app.ts
 *
 * NEW FILE — exports the configured Express app without starting a server.
 * Used by:
 *   - api/index.ts  → Vercel serverless entry point
 *   - server/index.ts → local dev (calls app.listen())
 */

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { log } from "./vite";

export async function createApp() {
  const app = express();

  // Raw body capture — must be BEFORE express.json() so Stripe + Clerk webhooks work
  app.use((req: any, _res: any, buf: any, encoding: any) => {
    // Intentional: this runs as a verify callback inside express.json() below
  });

  // Stripe webhook needs raw body — register BEFORE express.json()
  app.use(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" })
  );

  // Clerk webhook needs raw body too
  app.use(
    "/api/clerk/webhook",
    express.raw({ type: "application/json" }),
    (req: Request, _res: Response, next: NextFunction) => {
      (req as any).rawBody = req.body;
      next();
    }
  );

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Request logging
  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, any> | undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }
        if (logLine.length > 80) logLine = logLine.slice(0, 79) + "…";
        log(logLine);
      }
    });

    next();
  });

  // Register all routes (auth, stripe, AI, conversations, etc.)
  const server = await registerRoutes(app);

  // Error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
  });

  return { app, server };
}
