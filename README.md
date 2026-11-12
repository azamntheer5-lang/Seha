# Seha — استعلام الإجازة المرضية | Sick Leave Enquiry

<div dir="rtl">

## نظرة عامة

نسخة مطابقة تمامًا (طبق الأصل) لصفحة **استعلام الإجازة المرضية** في منصة **صحتي** التابعة لوزارة الصحة السعودية، مبنية من الصفر بأحدث التقنيات ومحسَّنة لتتفوق على الأصل من ناحية **الثبات** و**الدقة**.

### المزايا الرئيسية

- **مطابقة طبق الأصل** لنفس تصميم وتدفق منصة صحتي (RTL كامل، نفس الألوان والخطوط والمكوّنات)
- **تحقق دقيق من المدخلات**: رقم هوية سعودي بعشرة أرقام مع التحقق من صحة الخوارزمية، ورمز خدمة إلزامي
- **حد معدل الطلبات (Rate Limiting)**: نافذة منزلقة بمقدار 10 طلبات في الدقيقة لكل IP مع رأس `Retry-After`
- **رسائل خطأ عربية مطابقة للأصل** مع حالات تحميل ثابتة ونتائج واضحة
- **حماية الخصوصية**: تسجيل استعلامات مع إخفاء جزئي لرقم الهوية وتشفير (hash) لعنوان IP
- **بيانات تجريبية واقعية**: 8 تقارير إجازة مرضية بأسماء وحالات مختلفة (نشطة / منتهية / ملغاة)
- **رمز QR للتحقق** من صحة التقرير

</div>

---

## Overview

A pixel-perfect replica of the **Sick Leave Enquiry** page of the Saudi Ministry of Health **Sehaty (صحتي)** platform, rebuilt from scratch with Next.js 16 and hardened beyond the original for **stability** and **accuracy**.

### Key improvements over the reference

| Area | Reference site | This repo |
|---|---|---|
| Input validation | Basic | Saudi ID checksum validation + normalized service codes |
| Rate limiting | None | Sliding-window 10 req/min per IP with Arabic error message |
| Lookup results | Always "لا يوجد نتائج" (no data) | 8 realistic seeded records covering all statuses |
| Error handling | Generic | Typed JSON contract, masked audit log, stable loading states |
| Stack | Client-only SPA | Next.js 16 App Router + Prisma + server-side API |

---

## Demo credentials | بيانات تجريبية

<div dir="rtl">

جرّب الاستعلام بأي من البيانات التالية (مضمّنة في قاعدة البيانات):

| رمز الخدمة | رقم الهوية | الاسم | الحالة |
|---|---|---|---|
| `SL-2025-100234` | `1023456781` | محمد عبدالله السالم | نشطة |
| `SL-2025-100871` | `1055443327` | نورة سعد القحطاني | نشطة |
| `SL-2025-102093` | `1099112235` | سارة إبراهيم الدوسري | نشطة |
| `SL-2025-104120` | `1066778893` | ريم فهد المطيري | نشطة |
| `SL-2025-105308` | `1044556676` | لطيفة حمد السبيعي | نشطة |
| `SL-2025-101556` | `1077889903` | فهد ناصر العتيبي | منتهية |
| `SL-2025-104785` | `1088224462` | سلطان ماجد البقمي | ملغاة |

</div>

---

## Quick start (local)

```bash
# 1. Install dependencies (bun recommended, npm works too)
bun install        # or: npm install

# 2. Generate the Prisma client (also runs automatically on install)
bunx prisma generate

# 3. Run the dev server
bun run dev        # or: npm run dev
```

Open <http://localhost:3000> — no extra env setup needed: `.env` ships a portable
SQLite path and the demo database is committed at `db/custom.db`.

### Reseed the demo data (optional)

```bash
bun run db:push    # (re)create the SQLite schema
bun run db:seed    # insert the deterministic demo records
```

---

## Deploy to Netlify

1. Push this repo to GitHub (already done).
2. In Netlify: **Add new site → Import an existing project → GitHub → select this repo**.
3. Netlify auto-detects Next.js via the included `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `.next`
   - `@netlify/plugin-nextjs` runtime (declared in `netlify.toml`)
   - `DATABASE_URL` is preset in `netlify.toml` to the portable SQLite path
4. Click **Deploy** — the API routes bundle `db/custom.db` automatically
   (configured via `outputFileTracingIncludes` in `next.config.ts`), so the
   sick-leave lookup works immediately.

> Note: on serverless hosting the bundled SQLite is read-only; issued
> records are mirrored to **Netlify Blobs** (durable across instances) and
> hydrated on demand — see `src/lib/seha/blob-store.ts`. For a fully durable,
> shared database use **Supabase** (below) — recommended for production.

## Supabase — durable shared storage | تخزين Supabase (موصى به)

<div dir="rtl">

لتفعيل قاعدة بيانات **Supabase** (مشتركة بين كل نسخ الموقع — الحفظ لا يضيع أبدًا والتحقق يعمل من أي مكان):

1. أنشئ المشروع في [supabase.com](https://supabase.com) ثم افتح **SQL Editor** والصق محتوى [`supabase/schema.sql`](supabase/schema.sql) واضغط **Run** — هذا ينشئ الجداول (`sick_leaves` و `inquiry_logs`) مع بيانات العرض التجريبية الثمانية.
2. في **Netlify**: Site configuration → Environment variables أضف المتغيرين:
   - `SUPABASE_URL` = رابط المشروع (`https://xxxx.supabase.co` — تجده في Settings → API)
   - `SUPABASE_SERVICE_KEY` = المفتاح السري (Settings → API Keys)
3. أعد النشر (Trigger deploy). بمجرد وجود المتغيرين يتحول الموقع تلقائيًا إلى Supabase.

بدون المتغيرين يعمل الموقع عبر SQLite المدمج + Netlify Blobs — لذا لا يتعطل شيء أبدًا.

</div>

When both `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` are set (Netlify UI →
Environment variables — **never commit the secret to this public repo**), all
API routes automatically switch to Supabase over PostgREST (zero extra
dependencies). Run `supabase/schema.sql` once in the SQL editor to create the
tables. RLS is enabled with no policies, so only the server-side secret key
can read/write — the public key sees nothing. Without the variables the app
keeps working through the bundled SQLite + Netlify Blobs mirror.

## Deploy to Vercel (alternative)

```bash
npx vercel
```
Everything works out of the box — the Next.js runtime traces `db/custom.db`
into the API functions using the same config.

---

## Tech stack

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript 5
- **Styling**: Tailwind CSS 4 + shadcn/ui (New York) + Lucide icons
- **Database**: Prisma ORM + SQLite (seeded demo data)
- **Validation**: Zod-style server-side contract validation
- **QR codes**: `qrcode.react`

## Project structure

```
├── db/custom.db                  # Seeded SQLite demo database
├── netlify.toml                  # Netlify deployment config
├── prisma/
│   ├── schema.prisma             # SickLeave + InquiryAudit models
│   └── seed.ts                   # Deterministic demo seeder
├── public/assets/                # Sehaty / MOH / DGA brand assets
└── src/
    ├── app/
    │   ├── page.tsx              # The Sehaty app entry
    │   └── api/inquiries/
    │       ├── sick-leave/       # GET lookup endpoint (validated + rate-limited)
    │       └── demo-credentials/ # Returns one demo pair for reviewers
    ├── components/
    │   ├── seha/                 # Sehaty UI (header, footer, forms, results, widgets)
    │   └── ui/                   # shadcn/ui component set
    └── lib/
        ├── db.ts                 # Prisma client singleton
        ├── saudi-id.ts           # Saudi ID checksum + masking utilities
        ├── rate-limit.ts         # Sliding-window rate limiter
        └── seha/domain.ts        # Shared domain types & Arabic labels
```

## API contract

```
GET /api/inquiries/sick-leave?serviceCode=SL-2025-100234&patientId=1023456781
```

- `200` → `{ ok: true, record: { ... } }`
- `404` → `{ ok: false, error: "NOT_FOUND", message: "لا يوجد نتائج" }`
- `429` → `{ ok: false, error: "RATE_LIMIT", message: "عدد كبير من محاولات الاستعلام…" }`

---

<div dir="rtl">

## ملاحظة

هذا المشروع نسخة تجريبية تعليمية (Demo) لمنصة صحتي ولا يمثل الجهات الرسمية.

</div>

## Disclaimer

This project is an educational demo replica of the Sehaty platform and is not affiliated with the Saudi Ministry of Health.
