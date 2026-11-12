/**
 * Seed script — realistic demo sick-leave records.
 *
 * Every patientId is checksum-valid (real Saudi ID algorithm) so the demo
 * exercises the exact same validation path as production traffic.
 *
 * Run: bunx bun prisma/seed.ts
 */
import { PrismaClient } from "@prisma/client";
import { generateSaudiId } from "../src/lib/saudi-id";

const db = new PrismaClient();

/** Deterministic ID generation so demo credentials stay stable across reseeds. */
function idFromBase(base: string): string {
  return generateSaudiId(1, base.padEnd(9, "0").slice(0, 9));
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setHours(9, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

function dateOffset(baseDaysAgo: number, offsetDays: number): Date {
  const d = daysAgo(baseDaysAgo);
  d.setDate(d.getDate() + offsetDays);
  return d;
}

type SeedRecord = {
  serviceCode: string;
  patientId: string;
  patientName: string;
  companionName?: string;
  relationship?: number;
  sickLeaveDate: Date;
  dateFrom: Date;
  dateTo: Date;
  durationDays: number;
  doctorName: string;
  doctorJobTitle: string;
  hospital: string;
  status: "ACTIVE" | "EXPIRED" | "CANCELLED";
  verificationCode: string;
};

const records: SeedRecord[] = [
  {
    serviceCode: "SL-2025-100234",
    patientId: idFromBase("102345678"),
    patientName: "محمد عبدالله السالم",
    sickLeaveDate: daysAgo(2),
    dateFrom: dateOffset(2, 0),
    dateTo: dateOffset(2, 4),
    durationDays: 5,
    doctorName: "د. خالد بن سعد الحربي",
    doctorJobTitle: "استشاري طب الأسرة",
    hospital: "مركز صحة الأمير سلطان - الرياض",
    status: "ACTIVE",
    verificationCode: "VRF-8K2M-QT91",
  },
  {
    serviceCode: "SL-2025-100871",
    patientId: idFromBase("105544332"),
    patientName: "نورة سعد القحطاني",
    companionName: "سعد محمد القحطاني",
    relationship: 2, // أب
    sickLeaveDate: daysAgo(6),
    dateFrom: dateOffset(6, 0),
    dateTo: dateOffset(6, 9),
    durationDays: 10,
    doctorName: "د. أمل بن حسن الزهراني",
    doctorJobTitle: "استشاري الباطنية",
    hospital: "مستشفى الملك فهد الطبي - جدة",
    status: "ACTIVE",
    verificationCode: "VRF-3P7X-LD45",
  },
  {
    serviceCode: "SL-2025-101556",
    patientId: idFromBase("107788990"),
    patientName: "فهد ناصر العتيبي",
    sickLeaveDate: daysAgo(15),
    dateFrom: dateOffset(15, 0),
    dateTo: dateOffset(15, 2),
    durationDays: 3,
    doctorName: "د. ماجد بن علي الشمري",
    doctorJobTitle: "طبيب عام",
    hospital: "مركز الرعاية الصحية الأولية - الدمام",
    status: "EXPIRED",
    verificationCode: "VRF-9T4B-NW62",
  },
  {
    serviceCode: "SL-2025-102093",
    patientId: idFromBase("109911223"),
    patientName: "سارة إبراهيم الدوسري",
    companionName: "إبراهيم عبدالرحمن الدوسري",
    relationship: 2, // أب
    sickLeaveDate: daysAgo(1),
    dateFrom: dateOffset(1, 0),
    dateTo: dateOffset(1, 6),
    durationDays: 7,
    doctorName: "د. هند بن سليمان الغامدي",
    doctorJobTitle: "استشاري أمراض معدية",
    hospital: "مستشفى الملك عبدالله - الرياض",
    status: "ACTIVE",
    verificationCode: "VRF-5R8C-JH37",
  },
  {
    serviceCode: "SL-2025-103447",
    patientId: idFromBase("103344556"),
    patientName: "عبدالرحمن يوسف الشهري",
    sickLeaveDate: daysAgo(30),
    dateFrom: dateOffset(30, 0),
    dateTo: dateOffset(30, 13),
    durationDays: 14,
    doctorName: "د. ياسر بن محمد عسيري",
    doctorJobTitle: "استشاري جراحة العظام",
    hospital: "مستشفى عسير المركزي - أبها",
    status: "EXPIRED",
    verificationCode: "VRF-2M6D-KX88",
  },
  {
    serviceCode: "SL-2025-104120",
    patientId: idFromBase("106677889"),
    patientName: "ريم فهد المطيري",
    companionName: "فهد سلطان المطيري",
    relationship: 2, // أب
    sickLeaveDate: daysAgo(0),
    dateFrom: dateOffset(0, 0),
    dateTo: dateOffset(0, 1),
    durationDays: 2,
    doctorName: "د. لمى بن أحمد الرشيد",
    doctorJobTitle: "طبيب أسنان",
    hospital: "مجمع عيادات صحة - الرياض",
    status: "ACTIVE",
    verificationCode: "VRF-7W3F-QP54",
  },
  {
    serviceCode: "SL-2025-104785",
    patientId: idFromBase("108822446"),
    patientName: "سلطان ماجد البقمي",
    sickLeaveDate: daysAgo(9),
    dateFrom: dateOffset(9, 0),
    dateTo: dateOffset(9, 4),
    durationDays: 5,
    doctorName: "د. راكان بن فهد العنزي",
    doctorJobTitle: "استشاري أنف وأذن وحنجرة",
    hospital: "مستشفى تبوك العام - تبوك",
    status: "CANCELLED",
    verificationCode: "VRF-4N9G-TR26",
  },
  {
    serviceCode: "SL-2025-105308",
    patientId: idFromBase("104455667"),
    patientName: "لطيفة حمد السبيعي",
    companionName: "حمد عبدالله السبيعي",
    relationship: 2, // أب
    sickLeaveDate: daysAgo(4),
    dateFrom: dateOffset(4, 0),
    dateTo: dateOffset(4, 11),
    durationDays: 12,
    doctorName: "د. جواهر بن سامي العسيري",
    doctorJobTitle: "استشاري نساء وولادة",
    hospital: "مستشفى الرعاية التخصصي - الخبر",
    status: "ACTIVE",
    verificationCode: "VRF-6B2H-VY73",
  },
];

async function main() {
  console.log("Seeding sick leave records...");

  // Clear previous demo data for idempotent reseeds.
  await db.inquiryLog.deleteMany();
  await db.sickLeave.deleteMany();

  for (const r of records) {
    await db.sickLeave.create({
      data: {
        serviceCode: r.serviceCode,
        patientId: r.patientId,
        patientName: r.patientName,
        companionName: r.companionName ?? null,
        relationship: r.relationship ?? null,
        sickLeaveDate: r.sickLeaveDate,
        dateFrom: r.dateFrom,
        dateTo: r.dateTo,
        durationDays: r.durationDays,
        doctorName: r.doctorName,
        doctorJobTitle: r.doctorJobTitle,
        hospital: r.hospital,
        status: r.status,
        verificationCode: r.verificationCode,
      },
    });
    console.log(
      `  ✓ ${r.serviceCode} / ${r.patientId} — ${r.patientName} (${r.status})`
    );
  }

  console.log(`Seeded ${records.length} records.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
