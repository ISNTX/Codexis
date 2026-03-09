/**
 * server/stripeInit.ts
 *
 * Handles Stripe webhook registration on startup.
 * Replaces the stripe-replit-sync managed webhook setup.
 *
 * On Vercel, webhooks are configured manually in the Stripe dashboard.
 * This file is only used in local dev (server/index.ts).
 */

export async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.warn("DATABASE_URL not set — Stripe integration will be limited");
    return;
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    console.warn("STRIPE_SECRET_KEY not set — Stripe integration disabled");
    return;
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.warn(
      "STRIPE_WEBHOOK_SECRET not set.\n" +
      "To receive Stripe webhooks locally, install the Stripe CLI and run:\n" +
      "  stripe listen --forward-to localhost:5000/api/stripe/webhook\n" +
      "Then copy the webhook signing secret to STRIPE_WEBHOOK_SECRET."
    );
  }

  console.log("Stripe initialized ✓");
}
