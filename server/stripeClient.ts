/**
 * server/stripeClient.ts
 *
 * Clean Stripe client — uses environment variables directly.
 * Removes all Replit connector / stripe-replit-sync code.
 *
 * Required env vars:
 *   STRIPE_SECRET_KEY      — from Stripe dashboard
 *   STRIPE_PUBLISHABLE_KEY — from Stripe dashboard
 *   STRIPE_WEBHOOK_SECRET  — from Stripe webhook endpoint settings
 */

import Stripe from "stripe";

function getStripeSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY environment variable is not set");
  }
  return key;
}

/**
 * Returns a fresh Stripe client instance.
 * Called "uncachable" to match existing usage — in practice you can cache this.
 */
export function getUncachableStripeClient(): Stripe {
  return new Stripe(getStripeSecretKey(), {
    apiVersion: "2025-08-27.basil",
  });
}

/**
 * Returns the Stripe publishable key for the frontend.
 */
export function getStripePublishableKey(): string {
  const key = process.env.STRIPE_PUBLISHABLE_KEY;
  if (!key) {
    throw new Error("STRIPE_PUBLISHABLE_KEY environment variable is not set");
  }
  return key;
}

export function getStripeWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET environment variable is not set");
  }
  return secret;
}
