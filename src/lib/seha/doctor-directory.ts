/**
 * Smart doctor/hospital memory (نظام الأسماء الذكي).
 *
 * Every (doctor, hospital) pair used on an issued sick leave is remembered
 * permanently in the local DoctorEntry table — this survives the 10-day leave
 * retention purge, so the issuing portal can always suggest previously used
 * doctors the moment the operator picks a known hospital.
 *
 * Suggestions are additionally enriched from the ACTIVE store's recent
 * sick_leaves rows (covers records issued on another instance / before the
 * local table existed).
 */

import { db } from "@/lib/db";
import { getStore } from "@/lib/seha/store";
import { HOSPITAL_DIRECTORY } from "@/lib/seha/hospital-directory";

/**
 * Seed the local memory once with the curated directory doctors
 * (المستشفيات الحكومية والخاصة + أطباؤها). Runs lazily on the first
 * doctors API call; never overrides entries the operator already created.
 */
let seededProcess = false;
export async function seedDirectoryOnce(): Promise<void> {
  if (seededProcess) return;
  seededProcess = true;
  try {
    let inserted = 0;
    for (const h of HOSPITAL_DIRECTORY) {
      for (const d of h.doctors) {
        const res = await db.doctorEntry.create({
          data: {
            doctorName: d.nameAr,
            jobTitleAr: d.titleAr,
            hospital: h.nameAr,
            hospitalEn: h.nameEn,
            useCount: 0,
          },
        }).catch(() => null); // already present (unique) — fine
        if (res) inserted += 1;
      }
    }
    if (inserted) console.log(`[doctor-directory] seeded ${inserted} curated doctors`);
  } catch (error) {
    seededProcess = false; // allow a retry on the next call
    console.error("[doctor-directory] seed failed:", error);
  }
}

export type DoctorSuggestion = {
  id: string;
  doctorName: string;
  doctorNameEn: string;
  jobTitleAr: string;
  jobTitleEn: string;
  hospital: string;
  hospitalEn: string;
  useCount: number;
};

export type HospitalSuggestion = {
  hospital: string;
  hospitalEn: string;
  doctorCount: number;
};

const norm = (v: string) => v.trim().replace(/\s+/g, " ");

/** Remember a (doctor, hospital) usage — upsert, bump useCount. Best-effort-safe in callers. */
export async function learnDoctor(input: {
  doctorName: string;
  doctorNameEn?: string | null;
  jobTitleAr?: string | null;
  jobTitleEn?: string | null;
  hospital: string;
  hospitalEn?: string | null;
}): Promise<void> {
  const doctorName = norm(input.doctorName ?? "");
  const hospital = norm(input.hospital ?? "");
  if (!doctorName || !hospital) return;

  const existing = await db.doctorEntry.findUnique({
    where: { doctorName_hospital: { doctorName, hospital } },
  });

  if (existing) {
    await db.doctorEntry.update({
      where: { id: existing.id },
      data: {
        // Keep the richest values seen so far (non-empty wins).
        doctorNameEn: input.doctorNameEn?.trim() || existing.doctorNameEn,
        jobTitleAr: input.jobTitleAr?.trim() || existing.jobTitleAr,
        jobTitleEn: input.jobTitleEn?.trim() || existing.jobTitleEn,
        hospitalEn: input.hospitalEn?.trim() || existing.hospitalEn,
        useCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
    });
  } else {
    await db.doctorEntry.create({
      data: {
        doctorName,
        doctorNameEn: input.doctorNameEn?.trim() || null,
        jobTitleAr: input.jobTitleAr?.trim() || null,
        jobTitleEn: input.jobTitleEn?.trim() || null,
        hospital,
        hospitalEn: input.hospitalEn?.trim() || null,
      },
    });
  }
}

function mergeById(a: DoctorSuggestion[], b: DoctorSuggestion[]): DoctorSuggestion[] {
  const map = new Map<string, DoctorSuggestion>();
  for (const s of [...a, ...b]) {
    const key = `${s.doctorName}||${s.hospital}`;
    const prev = map.get(key);
    map.set(key, prev ? { ...s, useCount: Math.max(prev.useCount, s.useCount) } : s);
  }
  return [...map.values()].sort((x, y) => y.useCount - x.useCount || x.doctorName.localeCompare(y.doctorName, "ar"));
}

/** Doctors previously used at (or whose hospital contains) the given hospital name. */
export async function doctorsForHospital(hospital: string): Promise<DoctorSuggestion[]> {
  const h = norm(hospital);
  if (!h) return [];

  const fromMemory = await db.doctorEntry.findMany({
    where: { hospital: { contains: h } },
    orderBy: [{ useCount: "desc" }, { lastUsedAt: "desc" }],
    take: 50,
  });

  const memory: DoctorSuggestion[] = fromMemory.map((e) => ({
    id: e.id,
    doctorName: e.doctorName,
    doctorNameEn: e.doctorNameEn ?? "",
    jobTitleAr: e.jobTitleAr ?? "",
    jobTitleEn: e.jobTitleEn ?? "",
    hospital: e.hospital,
    hospitalEn: e.hospitalEn ?? "",
    useCount: e.useCount,
  }));

  // Enrich from the active store's recent leaves (cross-instance memory).
  let fromStore: DoctorSuggestion[] = [];
  try {
    const rows = await getStore().listRecent(200);
    fromStore = rows
      .filter((r) => r.hospital.includes(h))
      .map((r) => ({
        id: `row:${r.id}`,
        doctorName: r.doctorName,
        doctorNameEn: r.doctorNameEn ?? "",
        jobTitleAr: r.doctorJobTitle ?? "",
        jobTitleEn: r.doctorJobTitleEn ?? "",
        hospital: r.hospital,
        hospitalEn: r.hospitalEn ?? "",
        useCount: 1,
      }));
  } catch {
    /* store unreachable — local memory is enough */
  }

  return mergeById(memory, fromStore);
}

/** Every hospital ever used, most-doctors first. */
export async function allHospitals(): Promise<HospitalSuggestion[]> {
  const entries = await db.doctorEntry.findMany({ select: { hospital: true, hospitalEn: true } });

  const map = new Map<string, HospitalSuggestion>();
  for (const e of entries) {
    const h = norm(e.hospital);
    if (!h) continue;
    const prev = map.get(h);
    if (prev) {
      prev.doctorCount += 1;
      prev.hospitalEn = prev.hospitalEn || (e.hospitalEn ?? "");
    } else {
      map.set(h, { hospital: h, hospitalEn: e.hospitalEn ?? "", doctorCount: 1 });
    }
  }

  // Include hospitals seen in recent leaves too.
  try {
    const rows = await getStore().listRecent(200);
    for (const r of rows) {
      const h = norm(r.hospital);
      if (!h) continue;
      const prev = map.get(h);
      if (prev) {
        prev.doctorCount += 1;
        prev.hospitalEn = prev.hospitalEn || (r.hospitalEn ?? "");
      } else {
        map.set(h, { hospital: h, hospitalEn: r.hospitalEn ?? "", doctorCount: 1 });
      }
    }
  } catch {
    /* ignore */
  }

  return [...map.values()].sort((a, b) => b.doctorCount - a.doctorCount || a.hospital.localeCompare(b.hospital, "ar"));
}
