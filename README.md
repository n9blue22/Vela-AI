# Spa AI Studio (Supabase + Multi AI Fallback)

Full-stack app for spa owners in Vietnam:
- Landing + pricing
- Register / login / forgot password (no SMTP mode)
- Lead + task management
- AI content generation with automatic fallback

## AI architecture (stable + low cost)

Default provider order:
1. `groq`
2. `cloudflare`
3. `openrouter`
4. `gemini`

If all providers fail, backend returns a built-in draft template so user flow does not break.

## Tech

- Frontend: React + TypeScript + Tailwind + React Router
- Backend: Express + Supabase (Postgres) + JWT
- AI Providers: Groq, Cloudflare Workers AI, OpenRouter, Gemini

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` from `.env.example`, then fill:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`
- `GROQ_API_KEY`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `OPENROUTER_API_KEY`
- Optional: `GEMINI_API_KEY`

3. In Supabase SQL Editor, run:
- `supabase/schema.sql`

4. Start frontend + backend:
```bash
npm run dev
```

5. URLs:
- Frontend: `http://127.0.0.1:5173`
- Backend API: `http://127.0.0.1:5050/api`

## No SMTP mode

- Register account is active immediately.
- Forgot-password endpoint can return reset link/token in app (dev-friendly mode).

## Zernio webhook (easy explanation)

Webhook is a public URL in your backend so Zernio can report publishing status (`published`, `failed`, `partial`).

### 1) Webhook URL you need to put in Zernio

- Production:
  - `https://your-domain.com/api/integrations/zernio/webhook`
- Local dev (temporary):
  - create a tunnel URL, then add `/api/integrations/zernio/webhook`

### 2) Fast local test (no ngrok/cloudflared installed)

Run backend first:
```bash
npm run dev:server
```

Open another terminal:
```bash
npx localtunnel --port 5050
```

You will get URL like:
```text
https://abc123.loca.lt
```

Webhook URL for Zernio will be:
```text
https://abc123.loca.lt/api/integrations/zernio/webhook
```

### 3) Secret verification (important)

Set same secret in both places:
- In your `.env`:
  - `ZERNIO_WEBHOOK_SECRET=your_long_random_secret`
- In Zernio webhook settings:
  - Secret = same value above

### 4) Check webhook received or not

- Health check:
  - `GET /api/health`
- Admin webhook log endpoint:
  - `GET /api/admin/integrations/webhooks?provider=zernio&limit=20`

If webhook is connected correctly, events will be stored in `integration_webhook_events`.
