# Multi-AI Collaboration Platform

## Overview

A modern web platform that enables users to interact with multiple AI models (GPT-5, Claude Sonnet 4.5, and Grok 2) simultaneously. The application supports four distinct interaction modes:

- **Chat Mode**: Direct conversation with a single AI model
- **Compare Mode**: Send identical prompts to multiple models and view responses side-by-side
- **Orchestrate Mode**: Chain multiple AI models together using pre-built workflow templates
- **Agenic Mode**: Multi-agent collaboration with orchestrated AI workflows

The platform features a clean, productivity-focused interface inspired by Linear, ChatGPT, and Notion design patterns.

## SaaS Features

### Authentication
- Replit Auth with support for Google, GitHub, Apple, and email login
- Session-based authentication with PostgreSQL session storage
- Protected routes for subscription and billing features

### Subscription Tiers
| Tier | Price | Messages/Month | Agenic Collaborations | Video Ads/Month | AI Models |
|------|-------|----------------|----------------------|-----------------|-----------|
| Free | $0 | 10 | 0 | 0 | GPT-5 only |
| Starter | $25 | 100 | 5 | 0 | GPT-5, Claude |
| Pro | $65 | 500 | 20 | 20 | All models |
| Enterprise | $199 | Unlimited | Unlimited | Unlimited | All models + priority |

### Stripe Integration
- Managed Stripe connector for secure payment processing
- Checkout sessions with automatic subscription creation
- Customer billing portal for self-service management
- Webhook handling for subscription lifecycle events
- Usage tracking and automatic tier enforcement

### Interaction Modes
- **Chat Mode**: Single model conversations
- **Compare Mode**: Parallel comparison of multiple AI responses
- **Orchestrate Mode**: Sequential multi-model workflows
- **Agenic Mode**: Multi-agent collaboration with real-time synthesis
- **Marketer Mode**: AI-powered video ad creation with script generation and video production

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React 18 with TypeScript in strict mode

**Build System**: Vite with custom configuration supporting:
- Hot module replacement (HMR)
- Runtime error overlays for development
- Path aliases (@, @shared, @assets)
- Development-specific plugins (cartographer, dev-banner) for Replit environment

**UI Component System**: Radix UI primitives with shadcn/ui design system
- **Design tokens**: Tailwind CSS with custom HSL-based color system supporting light/dark themes
- **Typography**: Inter for UI elements, JetBrains Mono for code
- **Spacing system**: Consistent 2/4/6/8/12/16 unit scale
- **Component library**: 40+ pre-built accessible components (buttons, dialogs, forms, etc.)

**State Management**:
- React Query (TanStack Query) for server state with infinite stale time
- Local React state for UI interactions
- Theme persistence via localStorage

**Routing**: Client-side navigation handled through mode switching (chat/compare/orchestrate) rather than traditional routing

### Backend Architecture

**Runtime**: Node.js with Express server

**Development/Production Split**:
- **Development**: Vite middleware integration for live reloading
- **Production**: Pre-built static assets served from dist/public

**API Design**: RESTful endpoints returning JSON
- POST /api/chat - Single model conversation
- POST /api/compare - Multi-model comparison
- Additional endpoints in routes.ts for conversation management

**Storage Layer**: Dual implementation strategy
- **Interface-based design** (IStorage) allowing swappable backends
- **Current implementation**: In-memory storage (MemStorage class) using Maps
- **Schema**: Drizzle ORM with PostgreSQL schema defined for future migration
- Conversations and Messages tables with proper foreign key relationships

**Session Management**: Express sessions with PostgreSQL storage via connect-pg-simple
- Secure httpOnly cookies
- Passport.js for OAuth/OIDC authentication

**Stripe Integration**: 
- stripe-replit-sync for managed webhook handling
- Automatic schema synchronization
- Customer portal for subscription management

### AI Integration Layer

**Multi-Provider Strategy**: Separate service modules for each AI provider

1. **OpenAI Service** (GPT-5)
   - Uses Replit AI Integrations proxy
   - Environment-based API key and base URL configuration
   - 8192 max completion tokens

2. **Anthropic Service** (Claude Sonnet 4.5)
   - Uses Replit AI Integrations proxy
   - Anthropic SDK with streaming support
   - 8192 max tokens

3. **xAI Service** (Grok 2)
   - Direct integration via OpenAI-compatible client
   - Base URL: https://api.x.ai/v1
   - Requires XAI_API_KEY environment variable

**Unified Interface**: Central AI router (server/ai/index.ts) that:
- Dispatches requests to appropriate service based on model selection
- Handles parallel requests for comparison mode
- Provides consistent error handling across providers

**Model Configuration**: Frontend maintains model metadata (colors, display names) in shared schema for visual attribution

### Data Models

**Conversations**:
- UUID primary keys
- Title (auto-generated from first message)
- Mode (chat/compare/orchestrate)
- Timestamps for creation and updates

**Messages**:
- UUID primary keys
- Foreign key to conversation (cascade delete)
- Role (user/assistant)
- Content (text)
- Optional model attribution
- Timestamp

**Workflow Templates** (Orchestrate Mode):
- Pre-configured multi-step AI chains
- Template variables for dynamic prompt construction
- Step sequencing with output piping

### Development Workflow

**Type Safety**: Shared schema definitions (@shared/schema.ts) consumed by both client and server
- Drizzle ORM schema as single source of truth
- Zod validation schemas generated from Drizzle
- Type inference throughout application

**Error Handling**:
- Custom error overlay in development
- Structured error responses with HTTP status codes
- Request/response logging middleware with duration tracking

## External Dependencies

### Third-Party Services

**AI Providers**:
- **OpenAI API**: GPT-5 model access via Replit AI Integrations
- **Anthropic API**: Claude Sonnet 4.5 via Replit AI Integrations
- **xAI API**: Grok 2 direct integration

**Replit AI Integrations**: Managed proxy service providing:
- Automatic API key rotation
- Rate limiting
- Billing abstraction
- Configured via environment variables (AI_INTEGRATIONS_OPENAI_BASE_URL, etc.)

### Database

**PostgreSQL** (via @neondatabase/serverless):
- Currently configured but not actively used (in-memory storage active)
- Connection via DATABASE_URL environment variable
- Serverless-compatible driver for edge deployments
- Schema managed through Drizzle ORM migrations

### UI Component Libraries

**Radix UI**: Unstyled accessible primitives for 25+ component types
- Modals, dropdowns, tooltips, forms, navigation
- ARIA-compliant implementations
- Keyboard navigation support

**Supporting Libraries**:
- class-variance-authority: Component variant management
- cmdk: Command palette component
- react-markdown: Message content rendering
- date-fns: Timestamp formatting

### Build & Development Tools

**Vite Plugins**:
- @vitejs/plugin-react: Fast Refresh support
- @replit/vite-plugin-runtime-error-modal: Development error UI
- @replit/vite-plugin-cartographer: Code intelligence (Replit-specific)
- @replit/vite-plugin-dev-banner: Environment indicator

**TypeScript Configuration**:
- ESNext module system
- Strict mode enabled
- Path mapping for clean imports
- Incremental compilation for performance