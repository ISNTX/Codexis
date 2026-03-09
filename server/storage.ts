import type { Conversation, Message, InsertConversation, InsertMessage, User, UpsertUser, SubscriptionTier, AuditLog, MCPServer, InsertMCPServer } from "@shared/schema";
import { conversations, messages, users, auditLogs, mcpServers } from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByStripeCustomerId(customerId: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserStripeInfo(userId: string, stripeInfo: {
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    subscriptionTier?: SubscriptionTier;
  }): Promise<User | undefined>;
  incrementUserUsage(userId: string, type: 'messages' | 'agenic'): Promise<void>;
  resetUserUsage(userId: string): Promise<void>;

  // Conversations
  getConversation(id: string): Promise<Conversation | undefined>;
  getAllConversations(userId?: string): Promise<Conversation[]>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation | undefined>;
  deleteConversation(id: string): Promise<boolean>;

  // Messages
  getMessage(id: string): Promise<Message | undefined>;
  getMessagesByConversation(conversationId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  deleteMessagesByConversation(conversationId: string): Promise<boolean>;

  // Stripe queries
  getProduct(productId: string): Promise<any>;
  listProducts(active?: boolean): Promise<any[]>;
  listProductsWithPrices(active?: boolean): Promise<any[]>;
  getPrice(priceId: string): Promise<any>;
  listPrices(active?: boolean): Promise<any[]>;
  getSubscription(subscriptionId: string): Promise<any>;

  // Admin operations
  setUserAdmin(userId: string, isAdmin: boolean): Promise<User | undefined>;
  createAuditLog(adminId: string, action: string, entityType: string, entityId?: string, changes?: any, description?: string): Promise<AuditLog>;
  getAuditLogs(limit?: number): Promise<AuditLog[]>;
  updateUserSubscriptionTier(userId: string, tier: SubscriptionTier): Promise<User | undefined>;
  deleteUser(userId: string): Promise<boolean>;

  // MCP Servers
  getMCPServer(id: string): Promise<MCPServer | undefined>;
  listMCPServers(): Promise<MCPServer[]>;
  createMCPServer(server: InsertMCPServer): Promise<MCPServer>;
  updateMCPServer(id: string, updates: Partial<MCPServer>): Promise<MCPServer | undefined>;
  deleteMCPServer(id: string): Promise<boolean>;
}

export class DbStorage implements IStorage {
  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByStripeCustomerId(customerId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, customerId));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserStripeInfo(userId: string, stripeInfo: {
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    subscriptionTier?: SubscriptionTier;
  }): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...stripeInfo, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async incrementUserUsage(userId: string, type: 'messages' | 'agenic'): Promise<void> {
    if (type === 'messages') {
      await db.update(users)
        .set({ messagesUsed: sql`${users.messagesUsed} + 1` })
        .where(eq(users.id, userId));
    } else {
      await db.update(users)
        .set({ agenicUsed: sql`${users.agenicUsed} + 1` })
        .where(eq(users.id, userId));
    }
  }

  async resetUserUsage(userId: string): Promise<void> {
    await db.update(users)
      .set({ 
        messagesUsed: 0, 
        agenicUsed: 0, 
        usageResetAt: new Date() 
      })
      .where(eq(users.id, userId));
  }

  // Conversations
  async getConversation(id: string): Promise<Conversation | undefined> {
    const result = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
    return result[0];
  }

  async getAllConversations(userId?: string): Promise<Conversation[]> {
    if (userId) {
      return await db.select().from(conversations)
        .where(eq(conversations.userId, userId))
        .orderBy(desc(conversations.updatedAt));
    }
    return await db.select().from(conversations).orderBy(desc(conversations.updatedAt));
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const result = await db.insert(conversations).values(insertConversation as any).returning();
    return result[0];
  }

  async updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation | undefined> {
    const result = await db
      .update(conversations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(conversations.id, id))
      .returning();
    return result[0];
  }

  async deleteConversation(id: string): Promise<boolean> {
    const result = await db.delete(conversations).where(eq(conversations.id, id)).returning();
    return result.length > 0;
  }

  // Messages
  async getMessage(id: string): Promise<Message | undefined> {
    const result = await db.select().from(messages).where(eq(messages.id, id)).limit(1);
    return result[0];
  }

  async getMessagesByConversation(conversationId: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const result = await db.insert(messages).values(insertMessage as any).returning();
    const message = result[0];

    await this.updateConversation(insertMessage.conversationId, { updatedAt: new Date() });

    return message;
  }

  async deleteMessagesByConversation(conversationId: string): Promise<boolean> {
    await db.delete(messages).where(eq(messages.conversationId, conversationId));
    return true;
  }

  // Stripe queries (from stripe schema managed by stripe-replit-sync)
  async getProduct(productId: string): Promise<any> {
    const result = await db.execute(
      sql`SELECT * FROM stripe.products WHERE id = ${productId}`
    );
    return result.rows[0] || null;
  }

  async listProducts(active = true): Promise<any[]> {
    const result = await db.execute(
      sql`SELECT * FROM stripe.products WHERE active = ${active}`
    );
    return result.rows;
  }

  async listProductsWithPrices(active = true): Promise<any[]> {
    const result = await db.execute(
      sql`
        SELECT 
          p.id as product_id,
          p.name as product_name,
          p.description as product_description,
          p.active as product_active,
          p.metadata as product_metadata,
          pr.id as price_id,
          pr.unit_amount,
          pr.currency,
          pr.recurring,
          pr.active as price_active,
          pr.metadata as price_metadata
        FROM stripe.products p
        LEFT JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
        WHERE p.active = ${active}
        ORDER BY p.id, pr.unit_amount
      `
    );
    return result.rows;
  }

  async getPrice(priceId: string): Promise<any> {
    const result = await db.execute(
      sql`SELECT * FROM stripe.prices WHERE id = ${priceId}`
    );
    return result.rows[0] || null;
  }

  async listPrices(active = true): Promise<any[]> {
    const result = await db.execute(
      sql`SELECT * FROM stripe.prices WHERE active = ${active}`
    );
    return result.rows;
  }

  async getSubscription(subscriptionId: string): Promise<any> {
    const result = await db.execute(
      sql`SELECT * FROM stripe.subscriptions WHERE id = ${subscriptionId}`
    );
    return result.rows[0] || null;
  }

  async getCustomerInvoices(customerId: string): Promise<any[]> {
    const result = await db.execute(
      sql`
        SELECT 
          id,
          amount_paid as amount,
          status,
          created,
          hosted_invoice_url as "hostedInvoiceUrl"
        FROM stripe.invoices 
        WHERE customer = ${customerId}
        ORDER BY created DESC
        LIMIT 20
      `
    );
    return result.rows;
  }

  // Admin operations
  async setUserAdmin(userId: string, isAdmin: boolean): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ isAdmin: isAdmin ? 1 : 0, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async createAuditLog(adminId: string, action: string, entityType: string, entityId?: string, changes?: any, description?: string): Promise<AuditLog> {
    const [log] = await db
      .insert(auditLogs)
      .values({
        adminId,
        action,
        entityType,
        entityId,
        changes: changes ? JSON.stringify(changes) : null,
        description,
      })
      .returning();
    return log;
  }

  async getAuditLogs(limit: number = 100): Promise<AuditLog[]> {
    return await db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
  }

  async updateUserSubscriptionTier(userId: string, tier: SubscriptionTier): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ subscriptionTier: tier, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async deleteUser(userId: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, userId)).returning();
    return result.length > 0;
  }

  // MCP Servers
  async getMCPServer(id: string): Promise<MCPServer | undefined> {
    const [server] = await db.select().from(mcpServers).where(eq(mcpServers.id, id));
    return server;
  }

  async listMCPServers(): Promise<MCPServer[]> {
    return await db.select().from(mcpServers).orderBy(desc(mcpServers.createdAt));
  }

  async createMCPServer(server: InsertMCPServer): Promise<MCPServer> {
    const [created] = await db.insert(mcpServers).values(server).returning();
    return created;
  }

  async updateMCPServer(id: string, updates: Partial<MCPServer>): Promise<MCPServer | undefined> {
    const [updated] = await db
      .update(mcpServers)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(mcpServers.id, id))
      .returning();
    return updated;
  }

  async deleteMCPServer(id: string): Promise<boolean> {
    const result = await db.delete(mcpServers).where(eq(mcpServers.id, id)).returning();
    return result.length > 0;
  }
}

export const storage = new DbStorage();
