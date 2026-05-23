# SYSTEM CODE MAP (VI)

Tai lieu nay giup ban:
- Nhin nhanh phan nao trong code dang lam chuc nang gi.
- Giai thich duoc kien truc khi di phong van.
- Biet dung file nao khi can bao tri/nang cap.

---

## 1) Tong quan kien truc

Ung dung gom 3 lop:
1. Frontend (`React + TypeScript + Tailwind`) trong `src/`
2. Backend API (`Express`) trong `server/src/`
3. Database (`Supabase Postgres`) voi schema trong `supabase/schema.sql`

Them vao do la 2 tich hop ben ngoai:
- AI provider chain: `Groq -> Cloudflare -> OpenRouter -> Gemini -> fallback template`
- Social auto-post: `Zernio` (Facebook, Instagram)

---

## 2) Cau truc thu muc chinh

```text
E:\one_man_business
|- src/                         # Frontend
|  |- app/AppRouter.tsx         # Dinh tuyen trang
|  |- pages/                    # Landing, App dashboard, Admin, Auth pages
|  |- features/auth/            # Auth context + route guard
|  |- features/billing/         # Modal nang cap goi
|  |- services/                 # HTTP client + API wrappers
|  |- shared/components/ui/     # Button, Card, Field, Badge
|  |- shared/constants/         # Plan/Billing constants
|  |- styles/globals.css        # Theme va global style
|
|- server/
|  |- index.js                  # Entry backend
|  |- src/app.js                # Tao express app, middleware, mount routes
|  |- src/routes/               # API endpoints theo module
|  |- src/services/             # Logic truy cap DB, AI, Zernio
|  |- src/middleware/           # Auth, admin guard, rate limit
|  |- src/config/               # Env, Supabase config
|  |- src/utils/                # Validation, token, date helper
|
|- supabase/schema.sql          # DDL + index + trigger updated_at
|- README.md                    # Huong dan chay nhanh
```

---

## 3) Frontend map (file nao lam gi)

### 3.1 Routing va auth
- `src/app/AppRouter.tsx`
  - Khai bao route `/`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/app`, `/admin`
  - Bao ve route bang `ProtectedRoute` va `AdminRoute`
- `src/features/auth/AuthProvider.tsx`
  - Quan ly `token`, `user`, `login`, `logout`, `register`, `forgotPassword`, `resetPassword`, `refreshMe`
  - Luu session vao `localStorage` (`spa_auth_token`, `spa_auth_user`)
- `src/features/auth/ProtectedRoute.tsx`
  - Chan nguoi chua login
  - Chan nguoi khong phai admin vao `/admin`

### 3.2 Trang chinh user
- `src/pages/AppHomePage.tsx`
  - Tab tong quan, tao noi dung, lead, cong viec, dang tu dong
  - Tao/sua/xoa lead
  - Tao/sua/xoa/danh dau xong task customer
  - Generate content AI + luu lich su
  - Auto-post FB/IG (upload media, schedule, jitter, ket qua tung nen tang)
  - Ket noi/giai ket noi tai khoan social cua chinh customer
  - Cap nhat profile user va doi mat khau
  - Mo modal nang cap goi

### 3.3 Trang admin
- `src/pages/AdminPage.tsx`
  - KPI tong quan (`users`, `leads`, `tasks`)
  - Quan ly user (doi goi, doi role)
  - Promote admin theo email
  - Xem toan bo task he thong, loc theo trang thai/scope
  - Duyet task admin (vd: yeu cau nang cap goi)

### 3.4 Landing va auth pages
- `src/pages/LandingPage.tsx`: Hero + feature + pricing + trust badges
- `src/pages/auth/*`: Login/Register/Forgot/Reset UI
- `src/features/billing/UpgradePlanModal.tsx`: popup QR thanh toan va xac nhan da chuyen tien

### 3.5 Frontend service layer
- `src/services/http.service.ts`
  - Wrapper `fetch`, timeout, parse loi, format message
- `src/services/app.service.ts`
  - API methods cho leads, tasks, content, billing, admin, social connect, autopost

---

## 4) Backend map (file nao lam gi)

### 4.1 Khoi dong app
- `server/index.js`: start server theo `env.PORT`
- `server/src/app.js`
  - CORS + Helmet
  - `express.json`
  - Global rate limit
  - Mount routes:
    - `/api/auth`
    - `/api/billing`
    - `/api/content`
    - `/api/leads`
    - `/api/tasks`
    - `/api/integrations`
    - `/api/admin`
  - Health check: `GET /api/health`

### 4.2 Middleware
- `server/src/middleware/auth.js`
  - Verify JWT
  - Nap user tu DB
  - Co cache user TTL ngan de giam query
- `server/src/middleware/admin.js`
  - Chi cho `role=admin`
- `server/src/middleware/rate-limit.js`
  - Token bucket limiter tu viet (capacity/refill/block)

### 4.3 Routes chinh
- `server/src/routes/auth.routes.js`
  - register/login/me/forgot-password/reset-password/update profile
  - password hash bang `bcrypt`
- `server/src/routes/content.routes.js`
  - quota
  - generate content
  - history content da generate
- `server/src/routes/lead.routes.js`
  - CRUD lead theo owner user
- `server/src/routes/task.routes.js`
  - CRUD task customer (khong cho thao tac task type admin)
- `server/src/routes/billing.routes.js`
  - tao yeu cau nang cap goi: tao task cho admin xu ly
- `server/src/routes/integration.routes.js`
  - webhook zernio
  - presign upload media
  - ket noi account social theo tung customer
  - publish bai len FB/IG, partial success duoc chap nhan
- `server/src/routes/admin.routes.js`
  - overview/users/tasks/plans
  - doi role/plan user
  - promote admin
  - xem webhook events

### 4.4 Service layer
- `server/src/services/db.service.js`
  - Toan bo truy van Supabase: users, leads, tasks, content_generations, webhook events, social profiles/accounts
  - Mapping row DB -> object app
- `server/src/services/gemini.service.js`
  - Build prompt copywriting tieng Viet
  - Goi provider chain va fallback
  - Parse output JSON an toan
- `server/src/services/fallback-content.service.js`
  - Mau noi dung du phong khi tat ca AI provider fail
- `server/src/services/zernio.service.js`
  - Tao profile social, connect URL, list account ket noi
  - presign media upload
  - publish post theo nen tang
- `server/src/services/user.service.js`
  - `serializeUser`, `isValidPlan`

### 4.5 Utility/config
- `server/src/config/env.js`: tap trung doc env va default
- `server/src/config/supabase.js`: tao Supabase client
- `server/src/utils/validation.js`: validate email/password/uuid/text/date
- `server/src/utils/token.js`: JWT sign/verify + reset token hash
- `server/src/constants/plan.js`: gioi han theo goi

---

## 5) Database map (Supabase)

Schema: `supabase/schema.sql`

Bang chinh:
1. `users`: tai khoan, role, plan, quota usage
2. `leads`: lead theo `owner_user_id`
3. `tasks`: task theo user, co `type=admin` de giao viec admin
4. `content_generations`: lich su AI output
5. `integration_webhook_events`: log webhook tu zernio
6. `social_profiles`: profile owner tren zernio theo user
7. `social_accounts`: account FB/IG da connect theo user

Chi so/index:
- Da tao index cho truy van owner/status/created_at
- trigger `set_updated_at()` cap nhat truong `updated_at`

---

## 6) Luong hoat dong end-to-end

### 6.1 Dang ky / dang nhap
1. Frontend goi `/api/auth/register` hoac `/api/auth/login`
2. Backend hash/verify password
3. Tra JWT ve frontend
4. Frontend luu JWT localStorage

### 6.2 Tao noi dung AI
1. User submit form tao noi dung
2. Backend check quota theo goi
3. Goi AI provider theo thu tu uu tien
4. Neu fail het -> fallback template
5. Tang usage count trong `users`
6. Luu output vao `content_generations`

### 6.3 Dang bai tu dong (user-scoped)
1. Customer ket noi Facebook/Instagram cua chinh ho
2. He thong luu account vao `social_accounts`
3. User upload media -> presign URL
4. User xac nhan dang bai/schedule
5. Backend publish tung nen tang
6. Nen tang loi -> nen tang khac van dang (partial success)

### 6.4 Nang cap goi
1. Customer mo modal, quet QR, bam "Toi da chuyen tien"
2. Backend tao task admin type `admin`
3. Admin vao trang admin, doi soat va cap nhat plan user

---

## 7) Interview cheat sheet (tra loi nhanh)

### 7.1 "Tai sao tach route/service/db?"
- Route chi xu ly HTTP, service xu ly business logic, db service xu ly truy van.
- Cach nay de test, de doc, de thay the provider ma khong vo cau truc tong.

### 7.2 "Lam sao tranh crash khi AI provider loi?"
- Dung provider chain + fallback template.
- Luon co `try/catch` tai route va service, tra message than thien cho client.

### 7.3 "Lam sao bao mat API?"
- JWT auth cho route private.
- `requireAdmin` cho route admin.
- Rate limit token bucket cho auth/content/autopost.
- Validation input chat che.

### 7.4 "Lam sao scale cho nhieu user?"
- Supabase Postgres + index theo owner/status/time.
- Tach logic API theo module.
- Co cache nho cho auth user.
- Co webhook log de debug va retry flow.

### 7.5 "Lam sao xu ly social post da nen tang?"
- Chia publish theo tung platform.
- Tong hop ket qua thanh cong/that bai.
- Ho tro partial success de khong mat co hoi dang bai.

---

## 8) Quick map bao tri / nang cap

Neu muon sua:
1. Dang nhap/dang ky: `server/src/routes/auth.routes.js` + `src/features/auth/AuthProvider.tsx`
2. Quota/goi: `server/src/constants/plan.js` + `src/shared/constants/plans.ts`
3. Prompt chat AI: `server/src/services/gemini.service.js`
4. Lich su AI: `server/src/routes/content.routes.js` + `db.service.js` + UI `AppHomePage.tsx`
5. Auto-post: `server/src/routes/integration.routes.js` + `zernio.service.js` + tab auto-post trong `AppHomePage.tsx`
6. Duyet nang cap: `server/src/routes/billing.routes.js` + `AdminPage.tsx`
7. Giao dien chung: `src/shared/components/ui/*` + `src/styles/globals.css`
8. Schema DB: `supabase/schema.sql` (can re-run migration khi them bang/cot)

---

## 9) Luu y Git va env

- File `.env.example` da duoc dua vao danh sach bo qua Git (`.gitignore`) de khong push lai.
- Sau commit xoa file khoi repository, tren GitHub file do se bien mat o commit moi.
- Local `.env` van dung de chay app, nhung khong push len remote.

