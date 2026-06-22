# VELA AI

AI-powered spa marketing and operations platform for Vietnamese beauty businesses.

<p align="left">
  <img src="https://img.shields.io/badge/React-18-20232A?logo=react&logoColor=61DAFB" alt="React 18" />
  <img src="https://img.shields.io/badge/TypeScript-5-1F6FEB?logo=typescript&logoColor=white" alt="TypeScript 5" />
  <img src="https://img.shields.io/badge/Vite-5-6B46C1?logo=vite&logoColor=white" alt="Vite 5" />
  <img src="https://img.shields.io/badge/Express-API-1F2937?logo=express&logoColor=white" alt="Express API" />
  <img src="https://img.shields.io/badge/Supabase-Auth%20%26%20Postgres-0F172A?logo=supabase&logoColor=3ECF8E" alt="Supabase" />
  <img src="https://img.shields.io/badge/Tailwind-UI-0F172A?logo=tailwindcss&logoColor=38BDF8" alt="Tailwind CSS" />
</p>

## Overview

VELA AI helps spa owners and operators manage daily marketing work from one dashboard:

- generate Vietnamese marketing content with multi-provider AI fallback
- track incoming leads and move them through a simple sales pipeline
- organize customer tasks separately from admin review tasks
- prepare Facebook and Instagram posting flows with user-scoped social accounts
- control plan limits, upgrades, and admin actions on top of Supabase

| Built for | Experience | Outcome |
| --- | --- | --- |
| Spa owners, managers, and front-desk teams in Vietnam | One workspace for content, leads, tasks, upgrades, and guided publishing | Faster daily operations, more consistent posting, and cleaner customer follow-up |

## Core Capabilities

### 1. AI content generation
- Vietnamese spa-focused copywriting
- headline, body, CTA, reply template, and hashtags
- provider fallback order: `groq -> cloudflare -> openrouter -> gemini`
- built-in draft fallback if every provider fails

### 2. Lead and task operations
- lead capture with status updates
- personal customer tasks inside the client dashboard
- admin-only operational tasks inside the admin area
- quick actions for follow-up and campaign preparation

### 3. Guided social publishing
- customer-scoped Facebook and Instagram account connection
- auto-post preparation with media checks and warnings
- immediate publishing or scheduled publishing flow
- failure isolation so one platform can fail without blocking the other

### 4. Plan, billing, and admin controls
- free, saving, and premium plan model
- quota-aware content generation
- manual payment confirmation flow
- admin role management and plan upgrades

## Architecture

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS
- React Router

### Backend
- Express
- Supabase Auth
- Supabase Postgres
- JWT session flow

### AI layer
- Groq
- Cloudflare Workers AI
- OpenRouter
- Gemini

## Project Structure

```text
.
|-- public/                     # favicon and public assets
|-- server/
|   |-- src/
|   |   |-- controllers/        # route handlers
|   |   |-- middleware/         # auth and request guards
|   |   |-- routes/             # API route registration
|   |   |-- services/           # AI, billing, social, and task services
|   |   `-- utils/              # helpers
|   `-- index.js                # backend entry
|-- src/
|   |-- features/               # auth, billing, app-level features
|   |-- pages/                  # landing, dashboard, admin, auth pages
|   |-- services/               # frontend API client layer
|   |-- shared/                 # reusable UI, constants, layout, utilities
|   `-- types/                  # shared frontend types
|-- supabase/
|   `-- schema.sql              # database bootstrap
`-- README.md
```

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create your `.env` manually

Fill the root `.env` with the variables your environment uses:

```bash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
JWT_SECRET=
GROQ_API_KEY=
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_ACCOUNT_ID=
OPENROUTER_API_KEY=
GEMINI_API_KEY=
ZERNIO_WEBHOOK_SECRET=
```

### 3. Bootstrap the database

Run the full schema in Supabase SQL Editor:

```text
supabase/schema.sql
```

### 4. Start the app

```bash
npm run dev
```

Local URLs:

- frontend: `http://127.0.0.1:5173`
- backend API: `http://127.0.0.1:5050/api`

## Operational Notes

### No-SMTP mode
- registration can work without a paid SMTP provider
- forgot-password can return reset information in a developer-friendly flow

### Social publishing
- customer publishing is account-scoped, not global-account scoped
- Facebook posts go to connected Pages
- Instagram requires a connected Business or Creator account

### Webhooks
- Zernio webhooks are received at:
  - production: `https://your-domain.com/api/integrations/zernio/webhook`
  - local tunnel: `https://your-tunnel/api/integrations/zernio/webhook`

## Why This Repo Matters

This project is not just a landing page or a prompt wrapper. It combines:

- SaaS-style auth and role management
- quota-based AI generation
- resilient provider fallback
- admin and customer workflow separation
- payment-review operations
- social publishing preparation for real business use

## Status

VELA AI is currently set up as a working full-stack product for local development and private iteration, with the strongest experience centered on:

- AI-assisted spa content creation
- lead and task operations
- guided Facebook/Instagram posting preparation
- Vietnamese-first UI for small beauty businesses
