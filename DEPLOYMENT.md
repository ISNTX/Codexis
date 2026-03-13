# Deployment guide

This document outlines the steps to deploy the **SynthAgentPlatform** to popular hosting providers.  The application consists of a Node/Express back‑end and a Vite/React front‑end.  You can choose to deploy them together in a single container on **Google Cloud Run** (recommended), or separately on platforms such as **Vercel** or **Render**.

## Recommended: Google Cloud Run

Cloud Run is a fully managed container service that scales to zero when idle, making it cost‑effective for low‑traffic applications.  It supports long‑lived connections required for Stripe webhooks and server‑side events.

### 1. Build the Docker image

Create a `Dockerfile` in the project root if you don’t already have one.  This sample file installs dependencies for both the server and client, builds the client, and serves it via Express:

```Dockerfile
FROM node:20-alpine AS base
WORKDIR /app

# copy package manifests
COPY server/package.json server/package-lock.json ./server/
COPY client/package.json client/package-lock.json ./client/

# install dependencies
RUN cd server && npm install && cd ../client && npm install

# build client
COPY client ./client
RUN cd client && npm run build

# build server
COPY server ./server
RUN cd server && npm run build

FROM node:20-alpine
WORKDIR /app

COPY --from=base /app/server/dist ./server/dist
COPY --from=base /app/client/dist ./client/dist
COPY server/package.json ./server/package.json

ENV NODE_ENV=production
ENV PORT=8080

CMD ["node", "server/dist/index.js"]
```

### 2. Configure environment variables

Create a `.env.production` file in the `server` directory containing all required secrets: `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `OPENAI_API_KEY` and any database URLs.  Do **not** commit real secrets to version control.

### 3. Build and push the image

Authenticate with Google Cloud, then build and push the image to Google Container Registry:

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/synth-agent-platform:latest .
```

### 4. Deploy

Deploy the container to Cloud Run:

```bash
gcloud run deploy synth-agent-platform \
  --image gcr.io/YOUR_PROJECT_ID/synth-agent-platform:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars CLERK_PUBLISHABLE_KEY=...,...  # specify all required env vars
```

Cloud Run will provision a HTTPS endpoint.  Update your front‑end’s API base URL accordingly.

## Alternative: Vercel

If you prefer Vercel, you can deploy the front‑end separately as a static site and the server as a Serverless Function.  However, note that long‑running processes such as Stripe webhooks may be terminated on free plans.  Create two projects:

1. **client** – deploy `client/dist` as a static site.  Configure the `VITE_API_BASE_URL` environment variable to point to your back‑end.
2. **server** – deploy the Node/Express app from `server/dist` using the “Serverless Functions” option.  Set environment variables in the Vercel dashboard.

## Alternative: Render

Render can host both a static front‑end and a Node service.  Create two services:

* **Web Service** – set “Environment” to “Static Site”, connect the `client` directory and provide a build command of `npm install && npm run build`.  Set “Publish Directory” to `dist`.
* **Backend Service** – choose “Web Service” with Node.  Point it to the `server` directory, set the start command to `npm run start` and add environment variables.  Use the free plan with automatic HTTPS.

## Post‑deployment tasks

* **Webhook configuration:** After deployment, update your Stripe dashboard with the new webhook endpoint (e.g. `https://<run-url>/api/webhooks/stripe`).  Update `STRIPE_WEBHOOK_SECRET` accordingly.
* **DNS and SSL:** Cloud Run and Vercel provide automatic TLS.  You can configure a custom domain via their dashboards.
* **Monitoring:** Use Google Cloud Monitoring or the provider’s built‑in analytics to observe request rates, latency and error rates.
