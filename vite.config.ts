import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/react";
import App from "./App";
import "./index.css";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

createRoot(document.getElementById("root")!).render(
  PUBLISHABLE_KEY ? (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <App />
    </ClerkProvider>
  ) : (
    <ClerkProvider publishableKey="pk_placeholder_build_only">
      <App />
    </ClerkProvider>
  )
);
```

6. Click **Commit changes** → Commit directly to main

---

**Step 2 — Add your env vars to Vercel**

1. Go to vercel.com → your Codexis project
2. Click **Settings** (top nav)
3. Click **Environment Variables** (left sidebar)
4. Add each of these one at a time — click **Add**, type the name, paste the value, hit **Save**:

| Name | Where to get it |
|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | clerk.com → your app → API Keys → Publishable key |
| `CLERK_SECRET_KEY` | clerk.com → your app → API Keys → Secret key |
| `CLERK_PUBLISHABLE_KEY` | same as VITE one |
| `CLERK_WEBHOOK_SECRET` | clerk.com → Webhooks → your endpoint → Signing secret |
| `DATABASE_URL` | neon.tech → your project → Connection string |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |
| `OPENAI_API_KEY` | platform.openai.com → API Keys |
| `GEMINI_API_KEY` | aistudio.google.com → Get API key |
| `STRIPE_SECRET_KEY` | dashboard.stripe.com → Developers → API Keys |
| `STRIPE_PUBLISHABLE_KEY` | same page, publishable key |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Webhooks → your endpoint |
| `APP_BASE_URL` | `https://codexis-git-main-isntxs-projects.vercel.app` |
| `NODE_ENV` | `production` |

You don't need XAI or OpenRouter right now — those are optional (Grok and Llama). Get the ones above first.

---

**Step 3 — Trigger a redeploy**

1. Go to **Deployments** in your Vercel project
2. Find the failed deployment
3. Click the **three dots** (⋯) on the right
4. Click **Redeploy**

OR — the commit you made in Step 1 will trigger it automatically. Just wait 30 seconds and check the Deployments tab for a new build starting.

---

**Step 4 — Watch the build logs**

Click into the new deployment → **Build Logs**. You're looking for:
```
✓ built in ~20s
