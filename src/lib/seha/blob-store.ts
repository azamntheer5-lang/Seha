/**
 * Netlify Blobs — durable mirror for portal-issued sick leaves.
 *
 * WHY THIS EXISTS
 * ───────────────
 * On Netlify the SQLite file inside the function bundle is read-only, so the
 * portal writes to a per-instance /tmp copy (see src/lib/db.ts). /tmp is
 * ephemeral: a new function instance starts with a fresh copy and every
 * portal-issued record would vanish. Netlify Blobs is the site-scoped,
 * durable key/value store that survives instance recycling — mirroring every
 * issued record there means a customer can verify their sick leave from ANY
 * instance, at any time, exactly as promised by the report's verification
 * link.
 *
 * GUARANTEES
 * ──────────
 *  - Every call is best-effort: failures are swallowed and flagged. If Blobs
 *    is unavailable (local dev without Netlify CLI, missing credentials…)
 *    the portal keeps working through SQLite alone — no request ever fails
 *    because of the mirror.
 *  - One probe per process: after the first failure the mirror is marked
 *    unavailable and never retried, so there is no per-request latency tax.
 */

import type { SickLeave } from "@prisma/client";

/** Store name (visible in the Netlify UI under Blobs). */
const STORE_NAME = "seha-sick-leaves";

/** Blob key for a sick leave — keyed by the public service code. */
export const blobKey = (serviceCode: string): string => `sl:${serviceCode}`;

type BlobStoreLike = {
  setJSON: (key: string, value: unknown) => Promise<void>;
  getJSON: <T = unknown>(key: string) => Promise<T | null>;
};

let storePromise: Promise<BlobStoreLike | null> | null = null;

/** Lazily open the Blobs store; resolves to null when unavailable. */
function getBlobStore(): Promise<BlobStoreLike | null> {
  if (!storePromise) {
    storePromise = (async () => {
      try {
        // `getStore` returns a Store (v11+) or a Promise of one (older majors)
        // depending on the installed @netlify/blobs version — accept both.
        const mod = (await import("@netlify/blobs")) as unknown as {
          getStore: (name: string) => Promise<BlobStoreLike> | BlobStoreLike;
        };
        const store = (await Promise.resolve(mod.getStore(STORE_NAME))) as BlobStoreLike | null;
        if (!store || typeof store.setJSON !== "function") return null;
        return store;
      } catch (error) {
        console.log("[blobs] mirror unavailable — running on SQLite only:", (error as Error)?.message);
        return null;
      }
    })();
  }
  return storePromise;
}

/**
 * JSON shape mirrored to Blobs — identical to the Prisma row except the
 * Date columns travel as ISO strings.
 */
export type MirroredSickLeave = Omit<SickLeave, "sickLeaveDate" | "dateFrom" | "dateTo" | "createdAt" | "updatedAt"> & {
  sickLeaveDate: string;
  dateFrom: string;
  dateTo: string;
  createdAt: string;
  updatedAt: string;
};

/** Convert a live Prisma row into its mirrorable JSON shape. */
export function toMirror(record: SickLeave): MirroredSickLeave {
  return {
    ...record,
    sickLeaveDate: record.sickLeaveDate.toISOString(),
    dateFrom: record.dateFrom.toISOString(),
    dateTo: record.dateTo.toISOString(),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

/** Convert a mirrored JSON shape back into Prisma-create compatible input. */
export function fromMirror(m: MirroredSickLeave): SickLeave {
  return {
    ...m,
    sickLeaveDate: new Date(m.sickLeaveDate),
    dateFrom: new Date(m.dateFrom),
    dateTo: new Date(m.dateTo),
    createdAt: new Date(m.createdAt),
    updatedAt: new Date(m.updatedAt),
  } as unknown as SickLeave;
}

/** Persist (or overwrite) a sick leave in the durable mirror. Best-effort. */
export async function mirrorSickLeave(record: SickLeave): Promise<void> {
  const store = await getBlobStore();
  if (!store) return;
  try {
    await store.setJSON(blobKey(record.serviceCode), toMirror(record));
  } catch (error) {
    console.error("[blobs] mirror write failed:", (error as Error)?.message);
  }
}

/**
 * Fetch a sick leave from the durable mirror. Returns null when Blobs is
 * unavailable or the key does not exist (e.g. a seed-only record that was
 * never issued from the portal — those live only in the bundled SQLite).
 */
export async function getMirroredSickLeave(serviceCode: string): Promise<MirroredSickLeave | null> {
  const store = await getBlobStore();
  if (!store) return null;
  try {
    return (await store.getJSON<MirroredSickLeave>(blobKey(serviceCode))) ?? null;
  } catch (error) {
    console.error("[blobs] mirror read failed:", (error as Error)?.message);
    return null;
  }
}
