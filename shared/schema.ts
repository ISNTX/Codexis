import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// AI Model types
export type AIModel = "gpt-4o" | "claude-sonnet-4-5" | "grok-2-1212" | "gemini-2-5-flash" | "meta-llama-3-70b" | "meta-llama-3-405b" | "lux-turbo" | "nexus";
export type ConversationMode = "chat" | "compare" | "orchestrate" | "agenic" | "marketer" | "synthetic";

// Message role types
export type MessageRole = "user" | "assistant";

// Subscription tier types
export type SubscriptionTier = "free" | "starter" | "pro" | "enterprise";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth + Stripe integration)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  subscriptionTier: text("subscription_tier").$type<SubscriptionTier>().default("free"),
  messagesUsed: integer("messages_used").default(0),
  agenicUsed: integer("agenic_used").default(0),
  usageResetAt: timestamp("usage_reset_at").defaultNow(),
  isAdmin: integer("is_admin").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Audit log table for tracking changes
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminId: varchar("admin_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: varchar("entity_id"),
  changes: jsonb("changes"),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Conversations table
export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  mode: text("mode").notNull().$type<ConversationMode>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Messages table
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull().$type<MessageRole>(),
  content: text("content").notNull(),
  model: text("model").$type<AIModel>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// MCP Servers table
export const mcpServers = pgTable("mcp_servers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  url: varchar("url").notNull(),
  description: text("description"),
  capabilities: jsonb("capabilities").$type<string[]>().default(sql`'[]'`),
  enabled: integer("enabled").default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Schemas
export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

// User schemas
export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type MCPServer = typeof mcpServers.$inferSelect;
export type InsertMCPServer = typeof mcpServers.$inferInsert;

// Subscription tier limits
export const tierLimits: Record<SubscriptionTier, { messages: number; agenic: number; models: AIModel[] }> = {
  free: { messages: 20, agenic: 0, models: ["gpt-4o"] },
  starter: { messages: 100, agenic: 5, models: ["gpt-4o", "claude-sonnet-4-5", "gemini-2-5-flash"] },
  pro: { messages: 500, agenic: 20, models: ["gpt-4o", "claude-sonnet-4-5", "grok-2-1212", "gemini-2-5-flash", "meta-llama-3-70b", "lux-turbo", "nexus"] },
  enterprise: { messages: -1, agenic: -1, models: ["gpt-4o", "claude-sonnet-4-5", "grok-2-1212", "gemini-2-5-flash", "meta-llama-3-70b", "meta-llama-3-405b", "lux-turbo"] },
};

// Subscription tier pricing info
export const tierPricing: Record<SubscriptionTier, { price: number; name: string; description: string }> = {
  free: { price: 0, name: "Free", description: "Get started with basic AI chat" },
  starter: { price: 25, name: "Starter", description: "For individuals who need more power" },
  pro: { price: 65, name: "Pro", description: "For power users and small teams" },
  enterprise: { price: 199, name: "Enterprise", description: "Unlimited access for organizations" },
};

// Frontend-specific types
export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  model?: AIModel;
  timestamp: Date;
}

export interface ComparisonResponse {
  model: AIModel;
  content: string;
  timestamp: Date;
  error?: string;
}

export interface OrchestrationStep {
  stepNumber: number;
  model: AIModel;
  prompt: string;
  response?: string;
  status: "pending" | "processing" | "complete" | "error";
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  steps: {
    model: AIModel;
    promptTemplate: string;
  }[];
}

// Model display names and metadata
export const modelInfo: Record<AIModel, { name: string; color: string; description: string }> = {
  "gpt-4o": {
    name: "GPT-5",
    color: "hsl(142 76% 36%)",
    description: "OpenAI's most advanced model",
  },
  "claude-sonnet-4-5": {
    name: "Claude Sonnet",
    color: "hsl(32 95% 50%)",
    description: "Anthropic's balanced model",
  },
  "grok-2-1212": {
    name: "Grok",
    color: "hsl(217 91% 60%)",
    description: "xAI's conversational model",
  },
  "gemini-2-5-flash": {
    name: "Gemini Flash",
    color: "hsl(264 90% 48%)",
    description: "Google's fast & efficient model",
  },
  "meta-llama-3-70b": {
    name: "Llama 3 (70B)",
    color: "hsl(12 76% 46%)",
    description: "Meta's powerful open model",
  },
  "meta-llama-3-405b": {
    name: "Llama 3 (405B)",
    color: "hsl(12 76% 52%)",
    description: "Meta's most capable model",
  },
  "nexus": {
    name: "NEXUS",
    color: "hsl(264 72% 60%)",
    description: "Synthetic multi-model synthesis engine",
  },
  "lux-turbo": {
    name: "Lux Turbo",
    color: "hsl(48 96% 53%)",
    description: "High-speed inference model",
  },
};
