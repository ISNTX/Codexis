# SynthAgentPlatform

A synthetic agentic multi‑AI platform that gives users a unified workspace to **build**, **create**, **think**, **reason** and **deploy** on their behalf.  The project consists of a React front‑end, an Express/TypeScript back‑end, Clerk for authentication, Stripe for billing and OpenAI for generative AI services.

## Key features

* **Multi‑agent orchestration** – the server exposes an `/api/chat` endpoint that proxies user messages to the OpenAI API and can be extended to dispatch tasks to additional models or services.  The agents live in `server/src/agents` and encapsulate planning, execution and reasoning logic.
* **Authentication** – user sign up and sign in is handled by [Clerk](https://clerk.dev).  On the front‑end you wrap your app in a `ClerkProvider` and protect pages with `SignedIn`/`SignedOut` components.  On the back‑end the Clerk middleware verifies request tokens before allowing access to protected routes.
* **Billing** – Stripe is used to handle subscriptions and one‑off payments.  The `/api/create-checkout-session` route creates a checkout session for the current user.  Webhooks are supported via `/api/webhooks/stripe`.
* **Security** – the Express server uses `helmet` for sensible HTTP headers, `cors` for cross‑origin control, and `express-rate-limit` to mitigate brute‑force attacks.  All JSON bodies are capped at 5 MB and parsed with `body-parser`.
* **Deployment ready** – the `DEPLOYMENT.md` file contains guidance for deploying to Google Cloud Run (default), Vercel or Render.  Cloud Run is recommended because it scales to zero and supports long‑lived connections such as Stripe webhooks.

## Getting started

Clone the repository and install dependencies for the server and client:

```bash
git clone <YOUR GITHUB URL> synth-agent-platform
cd synth-agent-platform

# install server dependencies
cd server
npm install

# in a new terminal install client dependencies
cd ../client
npm install
```

Copy `.env.example` to `.env` in both the `server` and `client` directories and fill in the required secrets.  At minimum you must provide:

* `CLERK_PUBLISHABLE_KEY` – from your Clerk dashboard
* `CLERK_SECRET_KEY` – server secret from Clerk
* `STRIPE_SECRET_KEY` – your Stripe secret key
* `STRIPE_WEBHOOK_SECRET` – the webhook signing secret (only needed on the server)
* `OPENAI_API_KEY` – your OpenAI API key for chat completions

Start the development servers:

```bash
# in /server
npm run dev

# in /client
npm run dev
```

The client will be available on [http://localhost:5173](http://localhost:5173) (Vite default) and will proxy API requests to `http://localhost:3000` via the `vite.config.ts` proxy.

## File structure

```
SynthAgentPlatform/
├── client/         # React front‑end
│   ├── index.html
│   ├── vite.config.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── components/
│       │   └── Chat.tsx
│       └── lib/
│           └── api.ts       # helper for talking to the server
├── server/         # Express/TypeScript back‑end
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── src/
│       ├── index.ts
│       ├── agents/
│       │   └── SimpleAgent.ts
│       ├── routes/
│       │   ├── chat.ts
│       │   └── billing.ts
│       └── middleware/
│           ├── auth.ts
│           └── security.ts
└── DEPLOYMENT.md   # deployment guidance
```

## Enhancing further

This skeleton is intentionally modular: you can add new agent classes under `server/src/agents` to orchestrate complex workflows, integrate additional AI models, or call external APIs.  Likewise, you can add new pages and components in the React app to manage projects, visualize agent plans or configure settings.  Contributions are welcome – open a pull request with your changes!
