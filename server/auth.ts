/**
 * server/auth.ts
 *
 * Replaces server/replitAuth.ts
 * Uses Clerk for authentication (supports Google, GitHub, Apple, Email)
 *
 * Setup:
 *  1. npm install @clerk/express
 *  2. Set CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY env vars
 *  3. Set CLERK_WEBHOOK_SECRET env var (from Clerk dashboard → Webhooks)
 */

import { clerkMiddleware, requireAuth, getAuth, createClerkClient } from "@clerk/express";
import type { Express, RequestHandler, Request, Response } from "express";
import { storage } from "./storage";

// Initialize Clerk client for server-side user lookups
const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

/**
 * Call once in server/app.ts to mount Clerk middleware globally.
 * Clerk validates the session JWT on every request automatically.
 */
export function setupAuth(app: Express) {
  app.use(
    clerkMiddleware({
      publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
      secretKey: process.env.CLERK_SECRET_KEY,
    })
  );

  // Clerk webhook — syncs user creation/updates to our DB
  app.post(
    "/api/clerk/webhook",
    async (req: Request, res: Response) => {
      try {
        const { Webhook } = await import("svix");
        const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

        if (!webhookSecret) {
          console.warn("CLERK_WEBHOOK_SECRET not set — skipping webhook verification");
          return res.status(200).json({ received: true });
        }

        const svixId = req.headers["svix-id"] as string;
        const svixTimestamp = req.headers["svix-timestamp"] as string;
        const svixSignature = req.headers["svix-signature"] as string;

        if (!svixId || !svixTimestamp || !svixSignature) {
          return res.status(400).json({ error: "Missing svix headers" });
        }

        const wh = new Webhook(webhookSecret);
        let event: any;

        try {
          const rawBody = (req as any).rawBody || Buffer.from(JSON.stringify(req.body));
          event = wh.verify(rawBody, {
            "svix-id": svixId,
            "svix-timestamp": svixTimestamp,
            "svix-signature": svixSignature,
          });
        } catch (err) {
          console.error("Clerk webhook verification failed:", err);
          return res.status(400).json({ error: "Invalid webhook signature" });
        }

        const { type, data } = event;

        if (type === "user.created" || type === "user.updated") {
          await storage.upsertUser({
            id: data.id,
            email: data.email_addresses?.[0]?.email_address ?? null,
            firstName: data.first_name ?? null,
            lastName: data.last_name ?? null,
            profileImageUrl: data.image_url ?? null,
          });
        }

        res.status(200).json({ received: true });
      } catch (error) {
        console.error("Clerk webhook error:", error);
        res.status(500).json({ error: "Webhook processing failed" });
      }
    }
  );
}

/**
 * Middleware — protects routes. Returns 401 if not authenticated.
 * Drop-in replacement for the old `isAuthenticated` from replitAuth.ts
 */
export const isAuthenticated: RequestHandler = requireAuth();

/**
 * Get the current user from DB, creating them if they don't exist yet.
 * Use this in route handlers instead of reading req.user.claims.sub
 *
 * Usage:
 *   const user = await getCurrentUser(req);
 *   if (!user) return res.status(404).json({ message: "User not found" });
 */
export async function getCurrentUser(req: Request) {
  const { userId } = getAuth(req);
  if (!userId) return null;

  let user = await storage.getUser(userId);

  if (!user) {
    // First time this user hits the API — fetch from Clerk and create in DB
    try {
      const clerkUser = await clerkClient.users.getUser(userId);
      user = await storage.upsertUser({
        id: userId,
        email: clerkUser.emailAddresses?.[0]?.emailAddress ?? null,
        firstName: clerkUser.firstName ?? null,
        lastName: clerkUser.lastName ?? null,
        profileImageUrl: clerkUser.imageUrl ?? null,
      });
    } catch (err) {
      console.error("Failed to fetch/create user from Clerk:", err);
      return null;
    }
  }

  return user;
}

/**
 * Helper to get just the userId from request.
 * Use anywhere you previously used req.user.claims.sub
 */
export function getUserId(req: Request): string | null {
  const { userId } = getAuth(req);
  return userId ?? null;
}
