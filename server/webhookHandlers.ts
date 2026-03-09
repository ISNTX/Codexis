/**
 * server/webhookHandlers.ts
 *
 * Standard Stripe webhook handler — no stripe-replit-sync dependency.
 * Verifies the webhook signature and handles subscription lifecycle events.
 *
 * Register in routes.ts as:
 *   app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);
 */

import type { Request, Response } from "express";
import { getUncachableStripeClient, getStripeWebhookSecret } from "./stripeClient";
import { storage } from "./storage";
import type { SubscriptionTier } from "@shared/schema";

export async function handleStripeWebhook(req: Request, res: Response) {
  const signature = req.headers["stripe-signature"];

  if (!signature) {
    return res.status(400).json({ error: "Missing stripe-signature header" });
  }

  if (!Buffer.isBuffer(req.body)) {
    console.error("Stripe webhook: req.body is not a Buffer — check middleware order");
    return res.status(500).json({ error: "Webhook body processing error" });
  }

  let event: any;
  const stripe = getUncachableStripeClient();

  try {
    const webhookSecret = getStripeWebhookSecret();
    const sig = Array.isArray(signature) ? signature[0] : signature;
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error("Stripe webhook signature verification failed:", err.message);
    return res.status(400).json({ error: "Invalid webhook signature" });
  }

  console.log(`Stripe webhook: ${event.type} [${event.id}]`);

  try {
    await handleEvent(event, stripe);
    res.status(200).json({ received: true });
  } catch (err: any) {
    console.error(`Stripe webhook handler error for ${event.type}:`, err.message);
    // Return 200 anyway to prevent Stripe retries for non-critical errors
    res.status(200).json({ received: true, warning: err.message });
  }
}

async function handleEvent(event: any, stripe: any) {
  const data = event.data.object;

  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(data, stripe);
      break;

    case "customer.subscription.created":
    case "customer.subscription.updated":
      await handleSubscriptionUpdate(data);
      break;

    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(data);
      break;

    case "invoice.payment_succeeded":
      await handlePaymentSucceeded(data);
      break;

    case "invoice.payment_failed":
      await handlePaymentFailed(data);
      break;

    default:
      // Unhandled event type — not an error
      break;
  }
}

async function handleCheckoutCompleted(session: any, stripe: any) {
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  if (!customerId || !subscriptionId) return;

  const user = await storage.getUserByStripeCustomerId(customerId);
  if (!user) {
    console.warn(`No user found for Stripe customer: ${customerId}`);
    return;
  }

  // Fetch subscription to get the price/tier
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["items.data.price"],
  });

  const tier = getTierFromSubscription(subscription);

  await storage.updateUserStripeInfo(user.id, {
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    subscriptionTier: tier,
  });

  console.log(`Checkout completed: user ${user.id} → ${tier}`);
}

async function handleSubscriptionUpdate(subscription: any) {
  const customerId = subscription.customer as string;
  if (!customerId) return;

  const user = await storage.getUserByStripeCustomerId(customerId);
  if (!user) return;

  const tier = getTierFromSubscription(subscription);

  await storage.updateUserStripeInfo(user.id, {
    stripeSubscriptionId: subscription.id,
    subscriptionTier: tier,
  });

  console.log(`Subscription updated: user ${user.id} → ${tier}`);
}

async function handleSubscriptionDeleted(subscription: any) {
  const customerId = subscription.customer as string;
  if (!customerId) return;

  const user = await storage.getUserByStripeCustomerId(customerId);
  if (!user) return;

  await storage.updateUserStripeInfo(user.id, {
    stripeSubscriptionId: null,
    subscriptionTier: "free",
  });

  console.log(`Subscription cancelled: user ${user.id} → free`);
}

async function handlePaymentSucceeded(invoice: any) {
  const customerId = invoice.customer as string;
  if (!customerId) return;

  const user = await storage.getUserByStripeCustomerId(customerId);
  if (!user) return;

  // Reset monthly usage on successful payment (new billing cycle)
  if (invoice.billing_reason === "subscription_cycle") {
    await storage.resetUserUsage(user.id);
    console.log(`Usage reset for user ${user.id} (new billing cycle)`);
  }
}

async function handlePaymentFailed(invoice: any) {
  const customerId = invoice.customer as string;
  if (!customerId) return;

  const user = await storage.getUserByStripeCustomerId(customerId);
  if (!user) return;

  // Optionally downgrade to free after payment failure
  // Comment out if you prefer a grace period
  await storage.updateUserStripeInfo(user.id, {
    subscriptionTier: "free",
  });

  console.log(`Payment failed: user ${user.id} downgraded to free`);
}

/**
 * Determines the subscription tier from a Stripe subscription object.
 * Matches based on price metadata or amount.
 */
function getTierFromSubscription(subscription: any): SubscriptionTier {
  const items = subscription.items?.data ?? [];
  
  for (const item of items) {
    const price = item.price;
    const metadata = price?.metadata ?? {};
    
    // Check metadata first (recommended: set metadata.tier in Stripe)
    if (metadata.tier) {
      return metadata.tier as SubscriptionTier;
    }

    // Fallback: match by amount (in cents)
    const amount = price?.unit_amount ?? 0;
    if (amount >= 19900) return "enterprise";
    if (amount >= 6500) return "pro";
    if (amount >= 2500) return "starter";
  }

  return "free";
}
