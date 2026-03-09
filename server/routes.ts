/**
 * server/routes.ts — COMPLETE REWRITE
 *
 * KEY FIX: Every AI call now loads conversation history from DB
 * and passes it to the model. Models have real memory of the thread.
 *
 * Also adds: NEXUS endpoint, compare with history, agenic with history,
 * proper auth via Clerk, usage enforcement.
 */

import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { conversations, messages } from "@shared/schema";
import { eq } from "drizzle-orm";
import {
  getChatResponse,
  getComparisonResponses,
  getNexusSynthesis,
  type ExtendedModel,
} from "./ai";
import { dbMessagesToHistory } from "./ai/types";
import type { AIModel, SubscriptionTier } from "@shared/schema";
import { tierLimits, tierPricing } from "@shared/schema";
import { z } from "zod";
import { isAuthenticated, getCurrentUser, getUserId } from "./auth";
import { setupAuth } from "./auth";
import { getUncachableStripeClient, getStripePublishableKey, getStripeWebhookSecret } from "./stripeClient";
import { handleStripeWebhook } from "./webhookHandlers";
import { getAuth } from "@clerk/express";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Load conversation history from DB and convert to the format AI services expect.
 * This is called before EVERY AI request so models have full context.
 */
async function loadHistory(conversationId: string | null | undefined) {
  if (!conversationId) return [];
  try {
    const msgs = await storage.getMessagesByConversation(conversationId);
    return dbMessagesToHistory(msgs);
  } catch {
    return [];
  }
}

/**
 * Enforce per-tier usage limits. Returns error message if exceeded, null if OK.
 */
async function checkUsageLimit(
  userId: string | null,
  type: "messages" | "agenic",
  model?: string
): Promise<string | null> {
  if (!userId) return null; // unauthenticated users are allowed (free tier, limited by model)

  const user = await storage.getUser(userId);
  if (!user) return null;

  const tier = (user.subscriptionTier || "free") as SubscriptionTier;
  const limits = tierLimits[tier];

  if (type === "messages") {
    if (limits.messages !== -1 && (user.messagesUsed || 0) >= limits.messages) {
      return `Message limit reached (${limits.messages}/month on ${tier} plan). Please upgrade.`;
    }
    if (model && !limits.models.includes(model as AIModel) && model !== "nexus") {
      return `${model} is not available on your ${tier} plan. Please upgrade.`;
    }
  }

  if (type === "agenic") {
    if (limits.agenic === 0) {
      return "Agenic mode requires a Starter or higher plan.";
    }
    if (limits.agenic !== -1 && (user.agenicUsed || 0) >= limits.agenic) {
      return `Agenic limit reached (${limits.agenic}/month on ${tier} plan). Please upgrade.`;
    }
  }

  return null;
}

// Admin middleware
const isAdmin = async (req: any, res: any, next: any) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const user = await storage.getUser(userId);
  if (!user?.isAdmin) return res.status(403).json({ error: "Admin access required" });
  req.adminUser = user;
  next();
};

// ── Route Registration ────────────────────────────────────────────────────────

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth setup (Clerk middleware)
  setupAuth(app);

  // ── Auth ───────────────────────────────────────────────────────────────────

  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const user = await getCurrentUser(req);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // ── Health ────────────────────────────────────────────────────────────────

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // ── Stripe setup ──────────────────────────────────────────────────────────

  app.get("/api/stripe/publishable-key", (_req, res) => {
    try {
      res.json({ publishableKey: getStripePublishableKey() });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/stripe/webhook", handleStripeWebhook);

  // ── Pricing ───────────────────────────────────────────────────────────────

  app.get("/api/pricing", (_req, res) => {
    res.json({ tiers: tierPricing, limits: tierLimits });
  });

  app.get("/api/products", async (_req, res) => {
    try {
      const stripe = getUncachableStripeClient();
      const [products, prices] = await Promise.all([
        stripe.products.list({ active: true, limit: 100 }),
        stripe.prices.list({ active: true, limit: 100 }),
      ]);
      const enriched = products.data.map(p => ({
        ...p,
        prices: prices.data.filter(pr => pr.product === p.id),
      }));
      res.json({ products: enriched });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Checkout & Subscription ───────────────────────────────────────────────

  app.post("/api/checkout", isAuthenticated, async (req: any, res) => {
    try {
      const user = await getCurrentUser(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });

      const { priceId } = req.body;
      if (!priceId) return res.status(400).json({ error: "priceId required" });

      const stripe = getUncachableStripeClient();

      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email || undefined,
          name: [user.firstName, user.lastName].filter(Boolean).join(" ") || undefined,
          metadata: { userId: user.id },
        });
        customerId = customer.id;
        await storage.updateUserStripeInfo(user.id, { stripeCustomerId: customerId });
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        success_url: `${process.env.APP_BASE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.APP_BASE_URL}/pricing`,
      });

      res.json({ url: session.url });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/billing/portal", isAuthenticated, async (req: any, res) => {
    try {
      const user = await getCurrentUser(req);
      if (!user?.stripeCustomerId) {
        return res.status(400).json({ error: "No billing account found" });
      }
      const stripe = getUncachableStripeClient();
      const session = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${process.env.APP_BASE_URL}/dashboard`,
      });
      res.json({ url: session.url });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/subscription", isAuthenticated, async (req: any, res) => {
    try {
      const user = await getCurrentUser(req);
      if (!user) return res.status(404).json({ message: "User not found" });

      const tier = (user.subscriptionTier || "free") as SubscriptionTier;
      const limits = tierLimits[tier];

      let subscription = null;
      if (user.stripeSubscriptionId) {
        try {
          const stripe = getUncachableStripeClient();
          subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        } catch { /* subscription may be deleted */ }
      }

      res.json({
        tier,
        subscription,
        usage: {
          messages: user.messagesUsed || 0,
          agenic: user.agenicUsed || 0,
          messagesLimit: limits.messages,
          agenicLimit: limits.agenic,
        },
        usageResetAt: user.usageResetAt,
        availableModels: limits.models,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── CHAT — THE KEY FIX ────────────────────────────────────────────────────
  // History is loaded from DB and passed to the AI service on every call.

  app.post("/api/chat", async (req, res) => {
    try {
      const { message, model, conversationId } = req.body;
      const { userId } = getAuth(req);

      if (!message || !model) {
        return res.status(400).json({ error: "message and model are required" });
      }

      // Check usage limits
      const limitError = await checkUsageLimit(userId, "messages", model);
      if (limitError) return res.status(403).json({ error: limitError });

      // Get or create conversation
      let convId = conversationId;
      if (!convId) {
        const conv = await storage.createConversation({
          title: message.slice(0, 60) + (message.length > 60 ? "…" : ""),
          mode: "chat",
          userId: userId || undefined,
        });
        convId = conv.id;
      }

      // ★ LOAD CONVERSATION HISTORY — this is what was missing
      const history = await loadHistory(convId);

      // Save user message
      await storage.createMessage({ conversationId: convId, role: "user", content: message });

      // Call AI with full history context
      const result = await getChatResponse(model as ExtendedModel, message, { history });

      if (result.error) throw new Error(result.error);

      // Save AI response
      await storage.createMessage({
        conversationId: convId,
        role: "assistant",
        content: result.content,
        model,
      });

      // Track usage
      if (userId) await storage.incrementUserUsage(userId, "messages");

      res.json({
        response: result.content,
        conversationId: convId,
        model,
        tokens: { input: result.inputTokens, output: result.outputTokens },
        latencyMs: result.latencyMs,
      });
    } catch (error: any) {
      console.error("Chat error:", error);
      res.status(500).json({ error: error.message || "Chat failed" });
    }
  });

  // ── COMPARE — parallel with shared history ────────────────────────────────

  app.post("/api/compare", async (req, res) => {
    try {
      const { message, models, conversationId } = req.body;
      const { userId } = getAuth(req);

      if (!message || !models?.length) {
        return res.status(400).json({ error: "message and models array required" });
      }

      const limitError = await checkUsageLimit(userId, "messages");
      if (limitError) return res.status(403).json({ error: limitError });

      // Shared conversation context for all models in the comparison
      const history = await loadHistory(conversationId);

      let convId = conversationId;
      if (!convId) {
        const conv = await storage.createConversation({
          title: message.slice(0, 60),
          mode: "compare",
          userId: userId || undefined,
        });
        convId = conv.id;
      }

      await storage.createMessage({ conversationId: convId, role: "user", content: message });

      // ★ All models queried in parallel with the same shared history
      const results = await getComparisonResponses(models as ExtendedModel[], message, { history });

      // Save all AI responses
      for (const r of results) {
        if (!r.error && r.content) {
          await storage.createMessage({
            conversationId: convId,
            role: "assistant",
            content: r.content,
            model: r.model,
          });
        }
      }

      if (userId) await storage.incrementUserUsage(userId, "messages");

      res.json({
        responses: results.map(r => ({
          model: r.model,
          content: r.content,
          error: r.error,
          latencyMs: r.latencyMs,
          tokens: { input: r.inputTokens, output: r.outputTokens },
        })),
        conversationId: convId,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ── NEXUS SYNTHESIS ────────────────────────────────────────────────────────

  app.post("/api/nexus", async (req, res) => {
    try {
      const { message, models, conversationId } = req.body;
      const { userId } = getAuth(req);

      if (!message) return res.status(400).json({ error: "message required" });

      // NEXUS requires Pro+
      if (userId) {
        const user = await storage.getUser(userId);
        const tier = (user?.subscriptionTier || "free") as SubscriptionTier;
        if (!["pro", "enterprise"].includes(tier)) {
          return res.status(403).json({
            error: "NEXUS requires a Pro or Enterprise plan.",
            upgradeUrl: "/pricing",
          });
        }
      }

      const history = await loadHistory(conversationId);

      let convId = conversationId;
      if (!convId) {
        const conv = await storage.createConversation({
          title: message.slice(0, 60),
          mode: "agenic",
          userId: userId || undefined,
        });
        convId = conv.id;
      }

      await storage.createMessage({ conversationId: convId, role: "user", content: message });

      // ★ Run NEXUS: parallel dispatch to all models + Claude synthesis
      const result = await getNexusSynthesis(message, models, { history });

      await storage.createMessage({
        conversationId: convId,
        role: "assistant",
        content: result.synthesis,
        model: "nexus" as any,
      });

      if (userId) await storage.incrementUserUsage(userId, "messages");

      res.json({
        synthesis: result.synthesis,
        agreements: result.agreements,
        divergences: result.divergences,
        consensusScore: result.consensusScore,
        models: result.models.map(m => ({
          model: m.model,
          displayName: m.displayName,
          content: m.content,
          latencyMs: m.latencyMs,
          error: m.error,
        })),
        processingMs: result.totalLatencyMs,
        conversationId: convId,
      });
    } catch (error: any) {
      console.error("NEXUS error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ── AGENIC — multi-agent with SSE streaming ────────────────────────────────

  app.post("/api/agenic", async (req, res) => {
    const { task, agents, conversationId: existingConvId } = req.body;
    const { userId } = getAuth(req);

    if (!task || !agents?.length) {
      return res.status(400).json({ error: "task and agents required" });
    }

    const limitError = await checkUsageLimit(userId, "agenic");
    if (limitError) return res.status(403).json({ error: limitError });

    let conversationId = existingConvId;
    if (!conversationId) {
      const conv = await storage.createConversation({
        title: task.slice(0, 50),
        mode: "agenic",
        userId: userId || undefined,
      });
      conversationId = conv.id;
    }

    // SSE streaming
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const send = (data: any) => res.write(`data: ${JSON.stringify(data)}\n\n`);

    try {
      send({ conversationId });
      send({ phase: "Phase 1: Individual Analysis", isRunning: true });

      // Shared conversation context across all agents
      const sharedHistory = await loadHistory(conversationId);

      // Save the task as a user message
      await storage.createMessage({ conversationId, role: "user", content: task });

      // ★ Each agent gets: its own system prompt + full conversation history
      // Agents build on each other's prior contributions in the thread
      const agentResponses: Array<{ agentId: string; model: string; response: string }> = [];

      for (const agent of agents) {
        send({ agentId: agent.id, status: "thinking", phase: "Individual Analysis" });

        // Build cumulative history: shared history + all prior agent responses this round
        const agentHistory = [
          ...sharedHistory,
          ...agentResponses.map(ar => ({
            role: "assistant" as const,
            content: `[${ar.agentId}]: ${ar.response}`,
            model: ar.model,
          })),
        ];

        // Each agent has its own role-specific system prompt
        const agentSystemPrompt = `${agent.prompt_prefix}

You are participating in a multi-agent collaboration. 
Other agents have already contributed (see conversation history).
Build on their work — don't repeat what's been said. Add your unique perspective as ${agent.role}.`;

        const result = await getChatResponse(agent.model as ExtendedModel, task, {
          history: agentHistory,
          systemPrompt: agentSystemPrompt,
          maxTokens: 1500,
        });

        const response = result.content;
        agentResponses.push({ agentId: agent.id, model: agent.model, response });

        await storage.createMessage({
          conversationId,
          role: "assistant",
          content: response,
          model: agent.model,
        });

        send({ agentId: agent.id, content: response, status: "complete", phase: "Individual Analysis" });
      }

      // ★ Synthesis agent reads ALL prior agent responses + shared history
      send({ phase: "Phase 2: Collaborative Synthesis", isRunning: true });

      const synthesisAgent = agents[agents.length - 1];
      const allAgentOutput = agentResponses
        .map(ar => `**${ar.agentId}**: ${ar.response}`)
        .join("\n\n---\n\n");

      const synthHistory = [...sharedHistory];
      const synthesisPrompt = `You are the synthesis coordinator. The team has completed their individual analyses. Now create a unified, actionable solution for: "${task}"

Individual agent contributions:
${allAgentOutput}

Produce a coherent, integrated final response that:
1. Combines the best insights from each agent
2. Resolves any conflicting recommendations
3. Is directly actionable`;

      send({ agentId: synthesisAgent.id, status: "thinking", phase: "Collaborative Synthesis" });

      const synthResult = await getChatResponse(synthesisAgent.model as ExtendedModel, synthesisPrompt, {
        history: synthHistory,
        systemPrompt: `You are the ${synthesisAgent.role}. ${synthesisAgent.prompt_prefix}`,
        maxTokens: 2000,
      });

      await storage.createMessage({
        conversationId,
        role: "assistant",
        content: synthResult.content,
        model: synthesisAgent.model,
      });

      send({ agentId: synthesisAgent.id, content: synthResult.content, status: "complete", phase: "Collaborative Synthesis" });

      if (userId) await storage.incrementUserUsage(userId, "agenic");

      send({ phase: "Collaboration Complete", isRunning: false });
    } catch (error: any) {
      console.error("Agenic error:", error);
      send({ error: error.message, isRunning: false });
    }

    res.end();
  });

  // ── Conversations ─────────────────────────────────────────────────────────

  app.get("/api/conversations", async (req, res) => {
    const { userId } = getAuth(req);
    const convs = await storage.getAllConversations(userId || undefined);
    res.json(convs);
  });

  app.get("/api/conversations/:id", async (req, res) => {
    const conv = await storage.getConversation(req.params.id);
    if (!conv) return res.status(404).json({ error: "Not found" });
    res.json(conv);
  });

  app.get("/api/conversations/:id/messages", async (req, res) => {
    const msgs = await storage.getMessagesByConversation(req.params.id);
    res.json(msgs);
  });

  app.delete("/api/conversations/:id", isAuthenticated, async (req, res) => {
    const deleted = await storage.deleteConversation(req.params.id);
    res.json({ deleted });
  });

  // ── MCP Servers ───────────────────────────────────────────────────────────

  app.get("/api/mcp/servers", async (_req, res) => {
    const servers = await storage.listMCPServers();
    res.json(servers);
  });

  app.post("/api/mcp/servers", isAuthenticated, isAdmin, async (req: any, res) => {
    const server = await storage.createMCPServer(req.body);
    res.json(server);
  });

  app.patch("/api/mcp/servers/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    const server = await storage.updateMCPServer(req.params.id, req.body);
    if (!server) return res.status(404).json({ error: "Not found" });
    res.json(server);
  });

  app.delete("/api/mcp/servers/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    const deleted = await storage.deleteMCPServer(req.params.id);
    res.json({ deleted });
  });

  // ── Admin ─────────────────────────────────────────────────────────────────

  app.get("/api/admin/users", isAuthenticated, isAdmin, async (_req, res) => {
    const users = await db.execute(
      require("drizzle-orm").sql`SELECT id, email, first_name, last_name, subscription_tier, messages_used, agenic_used, is_admin, created_at FROM users ORDER BY created_at DESC LIMIT 100`
    );
    res.json(users.rows);
  });

  app.patch("/api/admin/users/:id/tier", isAuthenticated, isAdmin, async (req: any, res) => {
    const user = await storage.updateUserSubscriptionTier(req.params.id, req.body.tier);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  });

  app.get("/api/admin/audit-logs", isAuthenticated, isAdmin, async (_req, res) => {
    const logs = await storage.getAuditLogs(100);
    res.json(logs);
  });

  // ── Billing history ───────────────────────────────────────────────────────

  app.get("/api/billing/history", isAuthenticated, async (req: any, res) => {
    try {
      const user = await getCurrentUser(req);
      if (!user?.stripeCustomerId) return res.json({ invoices: [] });

      const stripe = getUncachableStripeClient();
      const invoices = await stripe.invoices.list({ customer: user.stripeCustomerId, limit: 20 });
      res.json({
        invoices: invoices.data.map(inv => ({
          id: inv.id,
          amount: inv.amount_paid,
          status: inv.status,
          created: inv.created,
          hostedInvoiceUrl: inv.hosted_invoice_url,
        })),
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  const server = createServer(app);
  return server;
}
