# Spa AI Studio (Supabase + No SMTP)

Full-stack app for `spa + AI`:
- Landing page with menu: welcome, about us, pricing (`Mien phi`, `Tiet kiem`, `Cao cap`)
- Auth flow: register, login, forgot password, reset password (without SMTP)
- Customer app: AI content, lead management, task management
- Admin app: manage users, plans, tasks, and promote new admins
- Backend with Supabase + Gemini API

## Tech
- Frontend: React + TypeScript + Tailwind + React Router
- Backend: Express + Supabase (Postgres) + JWT
- AI: Google Gemini API (server-side)

## Setup
1. Install dependencies:
```bash
npm install
```

2. Create `.env` from `.env.example` and fill:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`
- `GEMINI_API_KEY`

3. In Supabase SQL Editor, run:
- [schema.sql](</C:/Users/ASUS/OneDrive/Tài liệu/one_man_business/supabase/schema.sql>)

4. Start frontend + backend:
```bash
npm run dev
```

5. URLs:
- Frontend: `http://127.0.0.1:5173`
- Backend API: `http://127.0.0.1:5050/api`

## No SMTP mode
- Register account is active immediately (no email verification required).
- Forgot-password endpoint returns reset link and reset token directly in app.

