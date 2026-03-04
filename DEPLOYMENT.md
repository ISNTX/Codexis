# Multi-AI Platform - Deployment Guide for isntx.com

This guide provides step-by-step instructions for deploying the Multi-AI Platform as a SaaS application.

## Overview

The Multi-AI Platform is a subscription-based SaaS application that enables users to interact with multiple AI models through four distinct modes:
- **Chat**: Single model conversations
- **Compare**: Parallel model responses for comparison
- **Orchestrate**: Sequential workflow processing
- **Agenic**: Multi-agent collaboration

## Subscription Tiers

| Tier | Price | Messages/Month | Agenic Collaborations | AI Models |
|------|-------|----------------|----------------------|-----------|
| Free | $0 | 10 | 0 | GPT-5 only |
| Starter | $25 | 100 | 5 | GPT-5, Claude |
| Pro | $65 | 500 | 20 | All models |
| Enterprise | $199 | Unlimited | Unlimited | All models + priority |

## Pre-Deployment Checklist

### 1. Environment Variables

Ensure the following environment variables are configured:

```bash
# Database
DATABASE_URL=postgresql://...

# Session Management
SESSION_SECRET=your-secure-random-string

# AI Provider Keys
AI_INTEGRATIONS_OPENAI_API_KEY=sk-...
AI_INTEGRATIONS_ANTHROPIC_API_KEY=sk-...
XAI_API_KEY=xai-...

# Stripe (managed by Replit integration)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### 2. Stripe Configuration

The Stripe integration uses Replit's managed connector which handles:
- Secure API key storage
- Webhook signature verification
- Automatic schema synchronization

To set up Stripe products for production:

1. Navigate to your Stripe Dashboard
2. Create three products with the following metadata:
   - Product: "Starter" with metadata `tier: starter`, Price: $25/month
   - Product: "Pro" with metadata `tier: pro`, Price: $65/month
   - Product: "Enterprise" with metadata `tier: enterprise`, Price: $199/month

Alternatively, run the seed script:
```bash
npx tsx scripts/seed-products.ts
```

### 3. Database Migration

Push the schema to the production database:
```bash
npm run db:push
```

## Deployment Steps

### Option A: Deploy via Replit

1. Click "Deploy" in the Replit workspace
2. Choose "Autoscale" or "Reserved VM" deployment type
3. Configure your custom domain (isntx.com)
4. Set production environment variables
5. Complete the deployment

### Option B: Custom Domain Setup

1. Add your domain in Replit's deployment settings
2. Configure DNS records:
   - CNAME: `www` -> `your-repl.replit.app`
   - A Record: `@` -> Replit's IP (provided in deployment settings)
3. Enable SSL (automatic with Replit deployments)

## Post-Deployment Configuration

### 1. Update Webhook URLs

After deployment, update the Stripe webhook endpoint:
1. Go to Stripe Dashboard > Developers > Webhooks
2. Update the endpoint URL to: `https://isntx.com/api/stripe/webhook/{uuid}`
3. Ensure all relevant events are enabled

### 2. Verify Authentication Flow

1. Test login via all providers (Google, GitHub, Apple, email)
2. Verify session persistence
3. Check protected routes are properly secured

### 3. Test Subscription Flow

1. Create a test user account
2. Navigate to the pricing page
3. Complete a test subscription (use Stripe test mode first)
4. Verify webhook handling and tier upgrade
5. Check usage tracking and limits

## Monitoring and Maintenance

### Health Checks

The application exposes the following health endpoints:
- `GET /api/auth/user` - Auth status check
- `GET /api/subscription` - Subscription status
- `GET /api/pricing` - Pricing configuration

### Logs

Monitor application logs for:
- Stripe webhook events
- Authentication errors
- Usage limit warnings
- Database connection issues

### Regular Tasks

1. **Monthly**: Review Stripe invoices and failed payments
2. **Weekly**: Check usage patterns and tier distribution
3. **Daily**: Monitor error logs and webhook failures

## Security Considerations

1. All API keys are stored as encrypted secrets
2. Session cookies use secure, httpOnly flags
3. CORS is configured for the production domain
4. Webhook signatures are verified before processing
5. Database queries use parameterized statements

## Troubleshooting

### Common Issues

**Webhook failures:**
- Verify the webhook secret is correctly configured
- Check the webhook endpoint is accessible
- Ensure raw body parsing for the webhook route

**Authentication issues:**
- Verify SESSION_SECRET is set
- Check OAuth provider configurations
- Confirm database connectivity for session storage

**Subscription not updating:**
- Check webhook logs for errors
- Verify customer metadata contains userId
- Confirm tier metadata on Stripe products

## Support

For technical support or questions about deployment:
- Review the application logs
- Check Stripe webhook events
- Verify database connectivity
