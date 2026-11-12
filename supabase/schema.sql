-- ═══════════════════════════════════════════════════════════════════════════
-- Seha — Supabase schema (sick-leave issuance + enquiry platform)
--
-- Run ONCE in the Supabase SQL editor (or via the Management API).
-- Idempotent: safe to re-run (IF NOT EXISTS + ON CONFLICT DO NOTHING).
--
-- Tables
--   sick_leaves   issued certificates; (service_code, patient_id) is the
--                 PUBLIC lookup pair used by #/inquiries/slenquiry.
--   inquiry_logs  privacy-preserving audit log (masked IDs, hashed IPs).
--
-- Security
--   Row Level Security is ENABLED with no policies: the publishable
--   (anon) key sees nothing; only the secret key (SUPABASE_SERVICE_KEY,
--   which bypasses RLS) — used exclusively by the server-side API routes —
--   can read/write. Never expose the secret key to the browser.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.sick_leaves (
  id                  text primary key,
  service_code        text not null,
  patient_id          text not null,
  patient_name        text not null,
  patient_name_en     text,
  patient_phone       text,
  companion_name      text,
  relationship        integer,
  sick_leave_date     timestamptz not null,
  date_from           timestamptz not null,
  date_to             timestamptz not null,
  date_from_hijri     text,
  date_to_hijri       text,
  duration_days       integer not null,
  doctor_name         text not null,
  doctor_name_en      text,
  doctor_job_title    text not null,
  doctor_job_title_en text,
  hospital            text not null,
  hospital_en         text,
  license_number      text,
  employer_ar         text,
  nationality_ar      text,
  nationality_en      text,
  status              text not null default 'ACTIVE',
  verification_code   text not null,
  template_id         text not null default 'official',
  add_qr              boolean not null default false,
  show_license        boolean not null default true,
  report_time         text,
  report_date         text,
  source              text not null default 'seed',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint sick_leaves_pair_unique unique (service_code, patient_id)
);

create index if not exists sick_leaves_pair_idx   on public.sick_leaves (patient_id, service_code);
create index if not exists sick_leaves_status_idx on public.sick_leaves (status);
create index if not exists sick_leaves_created_idx on public.sick_leaves (created_at);

alter table public.sick_leaves enable row level security;

-- Report-template choice (بوابة الإصدار: اختيار القالب عند إنشاء الإجازة).
-- Idempotent: run on EXISTING deployments to activate template persistence —
-- the app works without it too (it probes once and keeps the choice for the
-- session), but with the column every issued record remembers its design.
alter table public.sick_leaves
  add column if not exists template_id text not null default 'official';

create table if not exists public.inquiry_logs (
  id           bigint generated always as identity primary key,
  service_code text not null,
  patient_id   text not null,
  ip_hash      text,
  success      boolean not null default false,
  result_count integer not null default 0,
  error_code   text,
  created_at   timestamptz not null default now()
);

create index if not exists inquiry_logs_created_idx on public.inquiry_logs (created_at);

alter table public.inquiry_logs enable row level security;

-- ───────────────────────────────────────────────────────────────────────────
-- Demo seed data (8 realistic certificates covering all statuses)
-- ───────────────────────────────────────────────────────────────────────────

insert into public.sick_leaves (
  id, service_code, patient_id, patient_name, patient_name_en, patient_phone, companion_name, relationship, sick_leave_date, date_from, date_to, date_from_hijri, date_to_hijri, duration_days, doctor_name, doctor_name_en, doctor_job_title, doctor_job_title_en, hospital, hospital_en, license_number, employer_ar, nationality_ar, nationality_en, status, verification_code, add_qr, show_license, report_time, report_date, source, created_at, updated_at
) values (
  'cmwcqxcn90000r68c9d0ut39d', 'SL-2025-100234', '1023456781', 'محمد عبدالله السالم', NULL, NULL, NULL, NULL, '2026-11-09T09:00:00.000Z', '2026-11-09T09:00:00.000Z', '2026-11-13T09:00:00.000Z', NULL, NULL, 5, 'د. خالد بن سعد الحربي', NULL, 'استشاري طب الأسرة', NULL, 'مركز صحة الأمير سلطان - الرياض', NULL, NULL, NULL, NULL, NULL, 'ACTIVE', 'VRF-8K2M-QT91', false, true, NULL, NULL, 'seed', '2026-11-11T23:24:25.030Z', '2026-11-11T23:24:25.030Z'
)
on conflict (service_code, patient_id) do nothing;

insert into public.sick_leaves (
  id, service_code, patient_id, patient_name, patient_name_en, patient_phone, companion_name, relationship, sick_leave_date, date_from, date_to, date_from_hijri, date_to_hijri, duration_days, doctor_name, doctor_name_en, doctor_job_title, doctor_job_title_en, hospital, hospital_en, license_number, employer_ar, nationality_ar, nationality_en, status, verification_code, add_qr, show_license, report_time, report_date, source, created_at, updated_at
) values (
  'cmwcqxcna0001r68cizizsby4', 'SL-2025-100871', '1055443327', 'نورة سعد القحطاني', NULL, NULL, 'سعد محمد القحطاني', 2, '2026-11-05T09:00:00.000Z', '2026-11-05T09:00:00.000Z', '2026-11-14T09:00:00.000Z', NULL, NULL, 10, 'د. أمل بن حسن الزهراني', NULL, 'استشاري الباطنية', NULL, 'مستشفى الملك فهد الطبي - جدة', NULL, NULL, NULL, NULL, NULL, 'ACTIVE', 'VRF-3P7X-LD45', false, true, NULL, NULL, 'seed', '2026-11-11T23:24:25.031Z', '2026-11-11T23:24:25.031Z'
)
on conflict (service_code, patient_id) do nothing;

insert into public.sick_leaves (
  id, service_code, patient_id, patient_name, patient_name_en, patient_phone, companion_name, relationship, sick_leave_date, date_from, date_to, date_from_hijri, date_to_hijri, duration_days, doctor_name, doctor_name_en, doctor_job_title, doctor_job_title_en, hospital, hospital_en, license_number, employer_ar, nationality_ar, nationality_en, status, verification_code, add_qr, show_license, report_time, report_date, source, created_at, updated_at
) values (
  'cmwcqxcnb0002r68c9d4sxla9', 'SL-2025-101556', '1077889903', 'فهد ناصر العتيبي', NULL, NULL, NULL, NULL, '2026-10-27T09:00:00.000Z', '2026-10-27T09:00:00.000Z', '2026-10-29T09:00:00.000Z', NULL, NULL, 3, 'د. ماجد بن علي الشمري', NULL, 'طبيب عام', NULL, 'مركز الرعاية الصحية الأولية - الدمام', NULL, NULL, NULL, NULL, NULL, 'EXPIRED', 'VRF-9T4B-NW62', false, true, NULL, NULL, 'seed', '2026-11-11T23:24:25.032Z', '2026-11-11T23:24:25.032Z'
)
on conflict (service_code, patient_id) do nothing;

insert into public.sick_leaves (
  id, service_code, patient_id, patient_name, patient_name_en, patient_phone, companion_name, relationship, sick_leave_date, date_from, date_to, date_from_hijri, date_to_hijri, duration_days, doctor_name, doctor_name_en, doctor_job_title, doctor_job_title_en, hospital, hospital_en, license_number, employer_ar, nationality_ar, nationality_en, status, verification_code, add_qr, show_license, report_time, report_date, source, created_at, updated_at
) values (
  'cmwcqxcnc0003r68cw016624c', 'SL-2025-102093', '1099112235', 'سارة إبراهيم الدوسري', NULL, NULL, 'إبراهيم عبدالرحمن الدوسري', 2, '2026-11-10T09:00:00.000Z', '2026-11-10T09:00:00.000Z', '2026-11-16T09:00:00.000Z', NULL, NULL, 7, 'د. هند بن سليمان الغامدي', NULL, 'استشاري أمراض معدية', NULL, 'مستشفى الملك عبدالله - الرياض', NULL, NULL, NULL, NULL, NULL, 'ACTIVE', 'VRF-5R8C-JH37', false, true, NULL, NULL, 'seed', '2026-11-11T23:24:25.033Z', '2026-11-11T23:24:25.033Z'
)
on conflict (service_code, patient_id) do nothing;

insert into public.sick_leaves (
  id, service_code, patient_id, patient_name, patient_name_en, patient_phone, companion_name, relationship, sick_leave_date, date_from, date_to, date_from_hijri, date_to_hijri, duration_days, doctor_name, doctor_name_en, doctor_job_title, doctor_job_title_en, hospital, hospital_en, license_number, employer_ar, nationality_ar, nationality_en, status, verification_code, add_qr, show_license, report_time, report_date, source, created_at, updated_at
) values (
  'cmwcqxcnd0004r68c1dlxthjv', 'SL-2025-103447', '1033445568', 'عبدالرحمن يوسف الشهري', NULL, NULL, NULL, NULL, '2026-10-12T09:00:00.000Z', '2026-10-12T09:00:00.000Z', '2026-10-25T09:00:00.000Z', NULL, NULL, 14, 'د. ياسر بن محمد عسيري', NULL, 'استشاري جراحة العظام', NULL, 'مستشفى عسير المركزي - أبها', NULL, NULL, NULL, NULL, NULL, 'EXPIRED', 'VRF-2M6D-KX88', false, true, NULL, NULL, 'seed', '2026-11-11T23:24:25.034Z', '2026-11-11T23:24:25.034Z'
)
on conflict (service_code, patient_id) do nothing;

insert into public.sick_leaves (
  id, service_code, patient_id, patient_name, patient_name_en, patient_phone, companion_name, relationship, sick_leave_date, date_from, date_to, date_from_hijri, date_to_hijri, duration_days, doctor_name, doctor_name_en, doctor_job_title, doctor_job_title_en, hospital, hospital_en, license_number, employer_ar, nationality_ar, nationality_en, status, verification_code, add_qr, show_license, report_time, report_date, source, created_at, updated_at
) values (
  'cmwcqxcne0005r68cs4gvk2m1', 'SL-2025-104120', '1066778893', 'ريم فهد المطيري', NULL, NULL, 'فهد سلطان المطيري', 2, '2026-11-11T09:00:00.000Z', '2026-11-11T09:00:00.000Z', '2026-11-12T09:00:00.000Z', NULL, NULL, 2, 'د. لمى بن أحمد الرشيد', NULL, 'طبيب أسنان', NULL, 'مجمع عيادات صحة - الرياض', NULL, NULL, NULL, NULL, NULL, 'ACTIVE', 'VRF-7W3F-QP54', false, true, NULL, NULL, 'seed', '2026-11-11T23:24:25.035Z', '2026-11-11T23:24:25.035Z'
)
on conflict (service_code, patient_id) do nothing;

insert into public.sick_leaves (
  id, service_code, patient_id, patient_name, patient_name_en, patient_phone, companion_name, relationship, sick_leave_date, date_from, date_to, date_from_hijri, date_to_hijri, duration_days, doctor_name, doctor_name_en, doctor_job_title, doctor_job_title_en, hospital, hospital_en, license_number, employer_ar, nationality_ar, nationality_en, status, verification_code, add_qr, show_license, report_time, report_date, source, created_at, updated_at
) values (
  'cmwcqxcnf0006r68csd9atv4f', 'SL-2025-104785', '1088224462', 'سلطان ماجد البقمي', NULL, NULL, NULL, NULL, '2026-11-02T09:00:00.000Z', '2026-11-02T09:00:00.000Z', '2026-11-06T09:00:00.000Z', NULL, NULL, 5, 'د. راكان بن فهد العنزي', NULL, 'استشاري أنف وأذن وحنجرة', NULL, 'مستشفى تبوك العام - تبوك', NULL, NULL, NULL, NULL, NULL, 'CANCELLED', 'VRF-4N9G-TR26', false, true, NULL, NULL, 'seed', '2026-11-11T23:24:25.036Z', '2026-11-11T23:24:25.036Z'
)
on conflict (service_code, patient_id) do nothing;

insert into public.sick_leaves (
  id, service_code, patient_id, patient_name, patient_name_en, patient_phone, companion_name, relationship, sick_leave_date, date_from, date_to, date_from_hijri, date_to_hijri, duration_days, doctor_name, doctor_name_en, doctor_job_title, doctor_job_title_en, hospital, hospital_en, license_number, employer_ar, nationality_ar, nationality_en, status, verification_code, add_qr, show_license, report_time, report_date, source, created_at, updated_at
) values (
  'cmwcqxcng0007r68ccfaul8kl', 'SL-2025-105308', '1044556676', 'لطيفة حمد السبيعي', NULL, NULL, 'حمد عبدالله السبيعي', 2, '2026-11-07T09:00:00.000Z', '2026-11-07T09:00:00.000Z', '2026-11-18T09:00:00.000Z', NULL, NULL, 12, 'د. جواهر بن سامي العسيري', NULL, 'استشاري نساء وولادة', NULL, 'مستشفى الرعاية التخصصي - الخبر', NULL, NULL, NULL, NULL, NULL, 'ACTIVE', 'VRF-6B2H-VY73', false, true, NULL, NULL, 'seed', '2026-11-11T23:24:25.037Z', '2026-11-11T23:24:25.037Z'
)
on conflict (service_code, patient_id) do nothing;
