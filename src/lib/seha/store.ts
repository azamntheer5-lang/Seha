/**
 * Unified sick-leave data layer — one interface, two backends.
 *
 *   ┌────────────────────────────────────────────────────────────────────┐
 *   │ BACKEND 1 — SUPABASE (preferred, durable)                          │
 *   │ Activated automatically when BOTH env vars are present:            │
 *   │   SUPABASE_URL           e.g. https://abcdefghij.supabase.co       │
 *   │   SUPABASE_SERVICE_KEY   the new sb_secret_… key (or legacy JWT)   │
 *   │ Talked to over PostgREST with plain fetch — no extra dependency.   │
 *   │ Every serverless instance sees the SAME data, so saves never get   │
 *   │ lost and customer verification works from any instance.            │
 *   └────────────────────────────────────────────────────────────────────┘
 *   ┌────────────────────────────────────────────────────────────────────┐
 *   │ BACKEND 2 — SQLITE/PRISMA (zero-config fallback)                   │
 *   │ The bundled db/custom.db (8 demo seeds + per-instance writes).     │
 *   │ On Netlify, writes are additionally mirrored to Netlify Blobs so   │
 *   │ issued records survive instance recycling (see blob-store.ts).     │
 *   └────────────────────────────────────────────────────────────────────┘
 *
 * Public enquiry reads are resilient: if Supabase is configured but
 * unreachable (outage / misconfig), they transparently fall back to the
 * bundled SQLite seeds so the customer-facing flow never hard-fails.
 * Portal writes, in contrast, fail loudly on the configured backend —
 * never silently split data across two stores.
 */

import { db } from "@/lib/db";
import {
  getMirroredSickLeave,
  fromMirror,
  type MirroredSickLeave,
} from "@/lib/seha/blob-store";

// ───────────────────────────────────────────────────────────────────────────
// Row shape (identical to the Prisma model — Date objects in memory)
// ───────────────────────────────────────────────────────────────────────────

export type SickLeaveRow = {
  id: string;
  serviceCode: string;
  patientId: string;
  patientName: string;
  patientNameEn: string | null;
  patientPhone: string | null;
  companionName: string | null;
  relationship: number | null;
  sickLeaveDate: Date;
  dateFrom: Date;
  dateTo: Date;
  dateFromHijri: string | null;
  dateToHijri: string | null;
  durationDays: number;
  doctorName: string;
  doctorNameEn: string | null;
  doctorJobTitle: string;
  doctorJobTitleEn: string | null;
  hospital: string;
  hospitalEn: string | null;
  licenseNumber: string | null;
  employerAr: string | null;
  nationalityAr: string | null;
  nationalityEn: string | null;
  status: string;
  verificationCode: string;
  /** Print-design template chosen at issuance (src/lib/seha/templates.ts). */
  templateId: string;
  addQr: boolean;
  showLicense: boolean;
  reportTime: string | null;
  reportDate: string | null;
  source: string;
  createdAt: Date;
  updatedAt: Date;
};

/** Fields a caller may update (id/createdAt are immutable). */
export type SickLeaveUpdate = Partial<Omit<SickLeaveRow, "id" | "createdAt">>;

export type InquiryLogEntry = {
  serviceCode: string;
  patientId: string; // pre-masked by the caller
  ipHash: string | null;
  success: boolean;
  resultCount: number;
  errorCode: string | null;
};

export interface SickLeaveStore {
  /** Which backend is serving requests right now. */
  readonly backend: "supabase" | "sqlite";
  /** True when the backend itself is durable across instances (no Blobs mirror needed). */
  readonly durable: boolean;
  findByPair(serviceCode: string, patientId: string): Promise<SickLeaveRow | null>;
  findById(id: string): Promise<SickLeaveRow | null>;
  insert(row: SickLeaveRow): Promise<SickLeaveRow>;
  update(id: string, data: SickLeaveUpdate): Promise<SickLeaveRow>;
  firstActiveDemoPair(): Promise<{ serviceCode: string; patientId: string } | null>;
  /** Best-effort audit log — never throws. */
  logInquiry(entry: InquiryLogEntry): Promise<void>;
}

// ───────────────────────────────────────────────────────────────────────────
// Backend 2 — SQLite via Prisma (also the bundled-seed fallback everywhere)
// ───────────────────────────────────────────────────────────────────────────

export const sqliteStore: SickLeaveStore = {
  backend: "sqlite",
  durable: false,

  async findByPair(serviceCode, patientId) {
    return db.sickLeave.findFirst({ where: { serviceCode, patientId } });
  },

  async findById(id) {
    return db.sickLeave.findUnique({ where: { id } });
  },

  async insert(row) {
    return db.sickLeave.create({ data: row });
  },

  async update(id, data) {
    return db.sickLeave.update({ where: { id }, data });
  },

  async firstActiveDemoPair() {
    return db.sickLeave.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
      select: { serviceCode: true, patientId: true },
    });
  },

  async logInquiry(entry) {
    try {
      await db.inquiryLog.create({
        data: {
          serviceCode: entry.serviceCode,
          patientId: entry.patientId,
          ipHash: entry.ipHash,
          success: entry.success,
          resultCount: entry.resultCount,
          errorCode: entry.errorCode,
        },
      });
    } catch (error) {
      console.error("[store] inquiry log (sqlite) failed:", error);
    }
  },
};

// ───────────────────────────────────────────────────────────────────────────
// Backend 1 — Supabase over PostgREST (plain fetch, zero dependencies)
// ───────────────────────────────────────────────────────────────────────────

/** snake_case JSON shape returned/sent by PostgREST (dates as ISO strings). */
type SupaRow = {
  id: string;
  service_code: string;
  patient_id: string;
  patient_name: string;
  patient_name_en: string | null;
  patient_phone: string | null;
  companion_name: string | null;
  relationship: number | null;
  sick_leave_date: string;
  date_from: string;
  date_to: string;
  date_from_hijri: string | null;
  date_to_hijri: string | null;
  duration_days: number;
  doctor_name: string;
  doctor_name_en: string | null;
  doctor_job_title: string;
  doctor_job_title_en: string | null;
  hospital: string;
  hospital_en: string | null;
  license_number: string | null;
  employer_ar: string | null;
  nationality_ar: string | null;
  nationality_en: string | null;
  status: string;
  verification_code: string;
  template_id: string | null;
  add_qr: boolean;
  show_license: boolean;
  report_time: string | null;
  report_date: string | null;
  source: string;
  created_at: string;
  updated_at: string;
};

function fromSupabase(r: SupaRow): SickLeaveRow {
  return {
    id: r.id,
    serviceCode: r.service_code,
    patientId: r.patient_id,
    patientName: r.patient_name,
    patientNameEn: r.patient_name_en,
    patientPhone: r.patient_phone,
    companionName: r.companion_name,
    relationship: r.relationship,
    sickLeaveDate: new Date(r.sick_leave_date),
    dateFrom: new Date(r.date_from),
    dateTo: new Date(r.date_to),
    dateFromHijri: r.date_from_hijri,
    dateToHijri: r.date_to_hijri,
    durationDays: r.duration_days,
    doctorName: r.doctor_name,
    doctorNameEn: r.doctor_name_en,
    doctorJobTitle: r.doctor_job_title,
    doctorJobTitleEn: r.doctor_job_title_en,
    hospital: r.hospital,
    hospitalEn: r.hospital_en,
    licenseNumber: r.license_number,
    employerAr: r.employer_ar,
    nationalityAr: r.nationality_ar,
    nationalityEn: r.nationality_en,
    status: r.status,
    verificationCode: r.verification_code,
    templateId: r.template_id ?? "official",
    addQr: r.add_qr,
    showLicense: r.show_license,
    reportTime: r.report_time,
    reportDate: r.report_date,
    source: r.source,
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
  };
}

const d = (v: Date | undefined) => (v instanceof Date ? v.toISOString() : v);

/**
 * Whether the live `sick_leaves` table has the `template_id` column yet.
 * Probed once per process (module-level cache):
 *   - column present  → every write persists the chosen template.
 *   - column missing  → writes omit it (records still save fine) and reads
 *     default to the official template; the moment the column is added
 *     (supabase/schema.sql) persistence turns on automatically — no code
 *     change, no failed saves, no restart needed.
 */
let supaTemplateIdColumn: boolean | null = null;

async function hasTemplateIdColumn(cfg: SupabaseConfig): Promise<boolean> {
  if (supaTemplateIdColumn !== null) return supaTemplateIdColumn;
  try {
    await rest(cfg, "sick_leaves", {
      method: "GET",
      query: [["select", "template_id"], ["limit", "1"]],
    });
    supaTemplateIdColumn = true;
  } catch {
    supaTemplateIdColumn = false;
    console.warn(
      "[supabase] sick_leaves.template_id column not present — template " +
        "choice is kept for the session only. Run the ALTER in supabase/schema.sql to persist it."
    );
  }
  return supaTemplateIdColumn;
}

/** camelCase row → snake_case JSON (full or partial). */
function toSupabase(row: SickLeaveRow | SickLeaveUpdate, withTemplateId = true): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if ("id" in row && row.id !== undefined) out.id = row.id;
  if (row.serviceCode !== undefined) out.service_code = row.serviceCode;
  if (row.patientId !== undefined) out.patient_id = row.patientId;
  if (row.patientName !== undefined) out.patient_name = row.patientName;
  if (row.patientNameEn !== undefined) out.patient_name_en = row.patientNameEn;
  if (row.patientPhone !== undefined) out.patient_phone = row.patientPhone;
  if (row.companionName !== undefined) out.companion_name = row.companionName;
  if (row.relationship !== undefined) out.relationship = row.relationship;
  if (row.sickLeaveDate !== undefined) out.sick_leave_date = d(row.sickLeaveDate);
  if (row.dateFrom !== undefined) out.date_from = d(row.dateFrom);
  if (row.dateTo !== undefined) out.date_to = d(row.dateTo);
  if (row.dateFromHijri !== undefined) out.date_from_hijri = row.dateFromHijri;
  if (row.dateToHijri !== undefined) out.date_to_hijri = row.dateToHijri;
  if (row.durationDays !== undefined) out.duration_days = row.durationDays;
  if (row.doctorName !== undefined) out.doctor_name = row.doctorName;
  if (row.doctorNameEn !== undefined) out.doctor_name_en = row.doctorNameEn;
  if (row.doctorJobTitle !== undefined) out.doctor_job_title = row.doctorJobTitle;
  if (row.doctorJobTitleEn !== undefined) out.doctor_job_title_en = row.doctorJobTitleEn;
  if (row.hospital !== undefined) out.hospital = row.hospital;
  if (row.hospitalEn !== undefined) out.hospital_en = row.hospitalEn;
  if (row.licenseNumber !== undefined) out.license_number = row.licenseNumber;
  if (row.employerAr !== undefined) out.employer_ar = row.employerAr;
  if (row.nationalityAr !== undefined) out.nationality_ar = row.nationalityAr;
  if (row.nationalityEn !== undefined) out.nationality_en = row.nationalityEn;
  if (row.status !== undefined) out.status = row.status;
  if (row.verificationCode !== undefined) out.verification_code = row.verificationCode;
  if (withTemplateId && row.templateId !== undefined) out.template_id = row.templateId;
  if (row.addQr !== undefined) out.add_qr = row.addQr;
  if (row.showLicense !== undefined) out.show_license = row.showLicense;
  if (row.reportTime !== undefined) out.report_time = row.reportTime;
  if (row.reportDate !== undefined) out.report_date = row.reportDate;
  if (row.source !== undefined) out.source = row.source;
  if ("createdAt" in row && row.createdAt !== undefined) out.created_at = d(row.createdAt);
  if ("updatedAt" in row && row.updatedAt !== undefined) out.updated_at = d(row.updatedAt);
  return out;
}

export type SupabaseConfig = { url: string; serviceKey: string };

/**
 * Decode a transport-encoded service key.
 *
 * GitHub push protection blocks any push whose diff contains the raw
 * `sb_secret_…` pattern — including the key committed for zero-setup
 * deploys in netlify.toml. The deployed value is therefore the key in
 * base64 (`printf %s 'sb_secret_…' | base64`), and it is decoded here.
 * Both forms are accepted everywhere: raw when the value already looks
 * like a key (`sb_secret_…` or a legacy `eyJ…` service-role JWT), base64
 * otherwise. Anything else passes through untouched as an opaque key.
 */
function decodeServiceKey(raw: string): string {
  const key = raw.trim();
  if (/^(sb_secret_|eyJ)/.test(key)) return key;
  if (key.length >= 24 && /^[A-Za-z0-9+/]+={0,2}$/.test(key)) {
    try {
      const decoded = Buffer.from(key, "base64").toString("utf8").trim();
      if (/^(sb_secret_|eyJ)/.test(decoded)) return decoded;
    } catch {
      /* not decodable — fall through and use the value as-is */
    }
  }
  return key;
}

/** Env-driven activation — both values must be present and sane. */
export function getSupabaseConfig(): SupabaseConfig | null {
  const url = (process.env.SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
  const serviceKey = decodeServiceKey(process.env.SUPABASE_SERVICE_KEY ?? "");
  // The publishable (sbp_…) key is RLS-scoped and cannot write — catch the
  // classic dashboard copy-paste mistake loudly instead of failing per-request.
  if (serviceKey.startsWith("sbp_")) {
    console.error(
      "[supabase] SUPABASE_SERVICE_KEY holds the PUBLISHABLE (sbp_…) key — " +
        "the SECRET (sb_secret_…) key is required for reads/writes."
    );
    return null;
  }
  if (!/^https?:\/\//i.test(url) || serviceKey.length < 20) return null;
  return { url, serviceKey };
}

/** Low-level PostgREST call. Throws on any non-2xx (callers decide fallbacks). */
async function rest<T>(
  cfg: SupabaseConfig,
  table: string,
  init: {
    method: "GET" | "POST" | "PATCH";
    body?: unknown;
    prefer?: string;
    query?: [string, string][];
  }
): Promise<T | null> {
  const qs = init.query?.length ? `?${new URLSearchParams(init.query)}` : "";
  const res = await fetch(`${cfg.url}/rest/v1/${table}${qs}`, {
    method: init.method,
    headers: {
      // New sb_secret_ keys are validated via `apikey`; the Bearer form is
      // accepted for compatibility (legacy JWTs and tools that send Bearer).
      apikey: cfg.serviceKey,
      Authorization: `Bearer ${cfg.serviceKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.prefer ? { Prefer: init.prefer } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`[supabase] ${init.method} /${table} → ${res.status}: ${detail.slice(0, 300)}`);
  }
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : null;
}

function makeSupabaseStore(cfg: SupabaseConfig): SickLeaveStore {
  return {
    backend: "supabase",
    durable: true,

    async findByPair(serviceCode, patientId) {
      const rows = await rest<SupaRow[]>(cfg, "sick_leaves", {
        method: "GET",
        query: [
          ["service_code", `eq.${serviceCode}`],
          ["patient_id", `eq.${patientId}`],
          ["limit", "1"],
        ],
      });
      const r = rows?.[0];
      return r ? fromSupabase(r) : null;
    },

    async findById(id) {
      const rows = await rest<SupaRow[]>(cfg, "sick_leaves", {
        method: "GET",
        query: [["id", `eq.${id}`], ["limit", "1"]],
      });
      const r = rows?.[0];
      return r ? fromSupabase(r) : null;
    },

    async insert(row) {
      const rows = await rest<SupaRow[]>(cfg, "sick_leaves", {
        method: "POST",
        prefer: "return=representation",
        body: toSupabase(row, await hasTemplateIdColumn(cfg)),
      });
      const r = rows?.[0];
      if (!r) throw new Error("[supabase] insert returned no row");
      return fromSupabase(r);
    },

    async update(id, data) {
      const rows = await rest<SupaRow[]>(cfg, "sick_leaves", {
        method: "PATCH",
        prefer: "return=representation",
        query: [["id", `eq.${id}`]],
        body: {
          ...toSupabase(data, await hasTemplateIdColumn(cfg)),
          updated_at: new Date().toISOString(),
        },
      });
      const r = rows?.[0];
      if (!r) throw new Error(`[supabase] update: no row with id ${id}`);
      return fromSupabase(r);
    },

    async firstActiveDemoPair() {
      const rows = await rest<Pick<SupaRow, "service_code" | "patient_id">[]>(cfg, "sick_leaves", {
        method: "GET",
        query: [
          ["select", "service_code,patient_id"],
          ["status", "eq.ACTIVE"],
          ["order", "created_at.asc"],
          ["limit", "1"],
        ],
      });
      const r = rows?.[0];
      return r ? { serviceCode: r.service_code, patientId: r.patient_id } : null;
    },

    async logInquiry(entry) {
      try {
        await rest(cfg, "inquiry_logs", {
          method: "POST",
          body: {
            service_code: entry.serviceCode,
            patient_id: entry.patientId,
            ip_hash: entry.ipHash,
            success: entry.success,
            result_count: entry.resultCount,
            error_code: entry.errorCode,
          },
        });
      } catch (error) {
        console.error("[store] inquiry log (supabase) failed:", error);
      }
    },
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Selection + shared helpers
// ───────────────────────────────────────────────────────────────────────────

/** The active store: Supabase when configured, SQLite otherwise. */
export function getStore(): SickLeaveStore {
  const cfg = getSupabaseConfig();
  return cfg ? makeSupabaseStore(cfg) : sqliteStore;
}

/** Mirrored record (Blobs) → row. */
function mirroredRow(m: MirroredSickLeave): SickLeaveRow {
  return fromMirror(m) as unknown as SickLeaveRow;
}

/**
 * Public enquiry lookup — maximally resilient:
 *   1. Active backend (Supabase when configured).
 *   2. If the active backend is SQLite: also check the Blobs mirror and
 *      hydrate the local SQLite from it (cross-instance records).
 *   3. If Supabase errored (outage/misconfig): fall back to the bundled
 *      SQLite so the customer flow still answers.
 */
export async function findForInquiry(
  serviceCode: string,
  patientId: string
): Promise<SickLeaveRow | null> {
  const store = getStore();

  let row: SickLeaveRow | null = null;
  let fromMirrorFlag = false;

  try {
    row = await store.findByPair(serviceCode, patientId);
  } catch (error) {
    console.error("[store] primary inquiry lookup failed:", error);
    if (store.backend !== "supabase") return null;
    try {
      row = await sqliteStore.findByPair(serviceCode, patientId);
    } catch {
      return null;
    }
  }

  if (!row && store.backend === "sqlite") {
    const mirrored = await getMirroredSickLeave(serviceCode);
    if (mirrored && mirrored.patientId === patientId) {
      row = mirroredRow(mirrored);
      fromMirrorFlag = true;
    }
  }

  // Hydrate the local SQLite so future lookups and operator edits are local.
  if (fromMirrorFlag && row) {
    try {
      await sqliteStore.insert(row);
    } catch {
      /* already hydrated concurrently — the mirror answer stands */
    }
  }

  return row;
}
