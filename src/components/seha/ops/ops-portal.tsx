"use client";

/**
 * OpsPortal — بوابة إصدار الإجازات المرضية (المشغل الخاص).
 *
 * Unlocked from the site logo + secret code. Workflow:
 *   1. الادخال الذكي — a plain TEXT box. A client-side parser runs on every
 *      keystroke and fills the form instantly as the data completes. No AI
 *      call, no upload, no failure — text only, always.
 *   2. نموذج الإجازة — full bilingual document data with live auto-computation
 *      (service number, Umm-al-Qura Hijri dates, inclusive duration).
 *   3. «حفظ وإصدار التقرير» opens صفحة المعاينة والتعديل — a Word-like
 *      review page: the A4 document on one side, its fields on the other.
 *      Every edit updates the document IMMEDIATELY and auto-saves to the
 *      public inquiry database (debounced), so what the customer verifies
 *      always matches the file.
 *   4. تحميل PDF — a REAL file download (no print dialog): the document is
 *      rendered off-screen at full A4 size, rasterised at 3× and packed
 *      into a true PDF in the browser.
 *   5. The verification link on the report auto-fills AND auto-runs the
 *      public inquiry for the client.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TemplateDocument } from "./template-document";
import {
  computeDurationDays,
  generateServiceNumber,
  toHijri,
  type PortalSickLeaveInput,
  type PortalSickLeaveRecord,
} from "@/lib/seha/ops";
import {
  DEFAULT_TEMPLATE_ID,
  SICK_LEAVE_TEMPLATES,
  getTemplateMeta,
  normalizeTemplateId,
} from "@/lib/seha/templates";
import {
  HOSPITAL_DIRECTORY,
  findHospital,
  hospitalLogoUrl,
} from "@/lib/seha/hospital-directory";
import {
  NATIONALITY_EN,
  parseSmartInput,
  type SmartParseResult,
  type SmartParsedFields,
} from "@/lib/seha/smart-parse";

const SESSION_KEY = "seha_ops_code";
/** Remembers the operator's last template choice across leaves. */
const TEMPLATE_KEY = "seha_ops_template";

/**
 * Module-level mirror of the access code — set the moment the operator
 * unlocks the portal. sessionStorage can be dropped mid-session (embedded
 * preview contexts, private mode, iframe remounts) which used to make every
 * save fail with 403 «رمز الدخول غير صالح». With this fallback the code
 * survives as long as the page is open, so saving ALWAYS works.
 */
let lastKnownCode: string | null = null;

export function getStoredOpsCode(): string | null {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) return stored;
  } catch {
    /* fall through to the module mirror */
  }
  return lastKnownCode;
}

export function storeOpsCode(code: string) {
  lastKnownCode = code;
  try {
    sessionStorage.setItem(SESSION_KEY, code);
  } catch {
    /* private mode — the module mirror still holds it */
  }
}

export function clearOpsCode() {
  lastKnownCode = null;
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Form model (workspace)
// ───────────────────────────────────────────────────────────────────────────

type FormState = {
  serviceCode: string;
  patientId: string;
  patientName: string;
  patientNameEn: string;
  patientPhone: string;
  sickLeaveDateIso: string;
  dateFromIso: string;
  dateToIso: string;
  doctorName: string;
  doctorNameEn: string;
  doctorJobTitle: string;
  doctorJobTitleEn: string;
  hospital: string;
  hospitalEn: string;
  licenseNumber: string;
  employerAr: string;
  nationalityAr: string;
  nationalityEn: string;
  templateId: string;
  addQr: boolean;
  showLicense: boolean;
};

const todayIso = () => new Date().toISOString().slice(0, 10);

/** The operator's last template choice (falls back to the default). */
function rememberedTemplateId(): string {
  try {
    return normalizeTemplateId(localStorage.getItem(TEMPLATE_KEY));
  } catch {
    return DEFAULT_TEMPLATE_ID;
  }
}

const emptyForm = (): FormState => ({
  serviceCode: "",
  patientId: "",
  patientName: "",
  patientNameEn: "",
  patientPhone: "",
  sickLeaveDateIso: todayIso(),
  dateFromIso: todayIso(),
  dateToIso: todayIso(),
  doctorName: "",
  doctorNameEn: "",
  doctorJobTitle: "طبيب عام",
  doctorJobTitleEn: "General Practitioner",
  hospital: "المستشفى السعودي الألماني",
  hospitalEn: "Saudi German Hospital",
  licenseNumber: "1410845786",
  employerAr: "",
  nationalityAr: "السعودية",
  nationalityEn: "Saudi Arabia",
  templateId: rememberedTemplateId(),
  addQr: false,
  showLicense: true,
});

/** Sample record rendered inside the template picker's live miniatures. */
const SAMPLE_RECORD: PortalSickLeaveRecord = {
  id: "sample",
  serviceCode: "PSL26197640978",
  patientId: "1023456781",
  patientName: "محمد عبدالله السالم",
  patientNameEn: "MOHAMMED ABDULLAH ALSALOM",
  patientPhone: "",
  sickLeaveDateIso: "2026-11-12",
  dateFromIso: "2026-11-12",
  dateToIso: "2026-11-14",
  doctorName: "د. خالد بن سعد الحربي",
  doctorNameEn: "KHALED SAAD ALHARBI",
  doctorJobTitle: "طبيب عام",
  doctorJobTitleEn: "General Practitioner",
  hospital: "المستشفى السعودي الألماني",
  hospitalEn: "Saudi German Hospital",
  licenseNumber: "1410845786",
  employerAr: "جامعة طيبة",
  nationalityAr: "السعودية",
  nationalityEn: "Saudi Arabia",
  templateId: "official",
  addQr: false,
  showLicense: true,
  dateFromHijri: "02-06-1448",
  dateToHijri: "04-06-1448",
  durationDays: 3,
  reportTime: "05:22 PM",
  reportDate: "Thursday, November 12, 2026",
  verificationCode: "VRF-8K2M-QT91",
  createdAt: "2026-11-12T00:00:00.000Z",
};

/** Merge the live-parsed smart-input fields onto the form (non-empty only). */
function applyParsed(form: FormState, p: Partial<SmartParsedFields>): FormState {
  const next = { ...form };
  const set = (v: string | undefined, apply: (val: string) => void) => {
    if (v && v.trim()) apply(v.trim());
  };
  set(p.serviceCode, (v) => (next.serviceCode = v.toUpperCase()));
  set(p.patientId, (v) => (next.patientId = v.replace(/\D/g, "")));
  set(p.patientPhone, (v) => (next.patientPhone = v));
  set(p.patientName, (v) => (next.patientName = v));
  set(p.patientNameEn, (v) => (next.patientNameEn = v.toUpperCase()));
  set(p.dateFromIso, (v) => (next.dateFromIso = v));
  set(p.dateToIso, (v) => (next.dateToIso = v));
  set(p.sickLeaveDateIso, (v) => (next.sickLeaveDateIso = v));
  set(p.doctorName, (v) => (next.doctorName = v));
  set(p.doctorNameEn, (v) => (next.doctorNameEn = v.toUpperCase()));
  set(p.doctorJobTitle, (v) => (next.doctorJobTitle = v));
  set(p.doctorJobTitleEn, (v) => (next.doctorJobTitleEn = v));
  set(p.hospital, (v) => (next.hospital = v));
  set(p.hospitalEn, (v) => (next.hospitalEn = v));
  set(p.licenseNumber, (v) => (next.licenseNumber = v));
  set(p.employerAr, (v) => (next.employerAr = v));
  set(p.nationalityAr, (v) => {
    next.nationalityAr = v;
    const en = NATIONALITY_EN[v.trim()];
    if (en) next.nationalityEn = en;
  });
  return next;
}

// ───────────────────────────────────────────────────────────────────────────
// Small UI pieces
// ───────────────────────────────────────────────────────────────────────────

function Field({
  label,
  children,
  hint,
  error,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  error?: string;
}) {
  return (
    <label className="ops-field">
      <span className="ops-field-label">{label}</span>
      {children}
      {hint && !error && <span className="ops-field-hint">{hint}</span>}
      {error && <span className="ops-field-error">{error}</span>}
    </label>
  );
}

const inputCls = "ops-input";

/** Which required fields are still missing (smart-input live status). */
function missingLabels(p: SmartParseResult): string[] {
  const missing: string[] = [];
  if (!p.hasName) missing.push("الاسم");
  if (!p.hasId) missing.push("رقم الهوية");
  if (!p.hasDoctor) missing.push("اسم الطبيب");
  if (!p.hasFrom) missing.push("تاريخ بداية الإجازة");
  if (!p.hasTo) missing.push("تاريخ نهاية الإجازة");
  return missing;
}

// ───────────────────────────────────────────────────────────────────────────
// The portal
// ───────────────────────────────────────────────────────────────────────────

type SaveState = "idle" | "saving" | "saved" | "error";

export function OpsPortal({
  onExit,
  onSessionExpired,
}: {
  onExit: () => void;
  onSessionExpired: () => void;
}) {
  const [mode, setMode] = useState<"workspace" | "review">("workspace");
  const [tab, setTab] = useState<"smart" | "form">("smart");
  const [form, setForm] = useState<FormState>(() => ({ ...emptyForm(), templateId: rememberedTemplateId() }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [issuing, setIssuing] = useState(false);
  const [autoNotice, setAutoNotice] = useState("");

  // ── Smart input tab ──
  const [smartText, setSmartText] = useState("");
  const [smartResult, setSmartResult] = useState<SmartParseResult | null>(null);
  const completeRef = useRef(false);
  const advanceTimerRef = useRef<number | null>(null);
  const noticeTimerRef = useRef<number | null>(null);

  // ── Review page (صفحة المعاينة والتعديل) ──
  const [record, setRecordState] = useState<PortalSickLeaveRecord | null>(null);
  const recordRef = useRef<PortalSickLeaveRecord | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState("");
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const saveTimerRef = useRef<number | null>(null);
  const inflightSaveRef = useRef<Promise<void> | null>(null);
  const captureRef = useRef<HTMLDivElement>(null);

  // ── السجل: سجل الإجازات الصادرة (leave history) ──
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<PortalSickLeaveRecord[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historySearch, setHistorySearch] = useState("");

  // ── نظام الأسماء الذكي: ذاكرة الأطباء والمستشفيات + توليد AI ──
  const [dirHospitals, setDirHospitals] = useState<{ hospital: string; hospitalEn: string; doctorCount: number }[]>([]);
  const [dirDoctors, setDirDoctors] = useState<
    { id: string; doctorName: string; doctorNameEn: string; jobTitleAr: string; jobTitleEn: string; hospital: string; hospitalEn: string; useCount: number }[]
  >([]);
  const [aiDoctors, setAiDoctors] = useState<{ nameAr: string; nameEn: string; titleAr: string; titleEn: string }[] | null>(null);
  const [aiHospital, setAiHospital] = useState<{ ar: string; en: string } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const dirFetchRef = useRef("");

  // ── الشعار: شعار المنشأة على التقرير + رفع شعار خاص ──
  const [logoPickerOpen, setLogoPickerOpen] = useState(false);
  const [logoSearch, setLogoSearch] = useState("");
  const [customLogo, setCustomLogo] = useState(""); // dataURL — يعيش في localStorage
  const [pickedLogoSlug, setPickedLogoSlug] = useState(""); // اختيار يدوي من المعرض
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      setCustomLogo(localStorage.getItem("ops-custom-logo") ?? "");
    } catch {
      /* ignore */
    }
  }, []);

  /** الشعار الفعلي المستخدم في التقرير. */
  const activeLogoUrl = useMemo(() => {
    if (customLogo) return customLogo;
    if (pickedLogoSlug) return `/assets/logos/${pickedLogoSlug}.svg`;
    return hospitalLogoUrl(form.hospital);
  }, [customLogo, pickedLogoSlug, form.hospital]);

  const onUploadLogo = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 1_500_000) {
      setAiError("حجم الشعار كبير — اختر صورة أقل من 1.5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result || "");
      setCustomLogo(url);
      setPickedLogoSlug("");
      setLogoPickerOpen(false);
      try {
        localStorage.setItem("ops-custom-logo", url);
      } catch {
        /* oversized — session only */
      }
    };
    reader.readAsDataURL(file);
  };

  const filteredLogoHospitals = useMemo(() => {
    const q = logoSearch.trim();
    if (!q) return HOSPITAL_DIRECTORY;
    return HOSPITAL_DIRECTORY.filter(
      (h) => h.nameAr.includes(q) || h.region.includes(q) || h.nameEn.toLowerCase().includes(q.toLowerCase())
    );
  }, [logoSearch]);

  const loadHospitals = useCallback(async () => {
    try {
      const code = getStoredOpsCode() ?? "";
      const res = await fetch("/api/ops/doctors", { headers: { "x-access-code": code } });
      const json = await res.json();
      if (json.ok && Array.isArray(json.data?.hospitals)) setDirHospitals(json.data.hospitals);
    } catch {
      /* directory is a bonus — silent on failure */
    }
  }, []);

  // Load the remembered hospitals once the portal opens.
  useEffect(() => {
    void loadHospitals();
  }, [loadHospitals]);

  // When the hospital changes → fetch doctors previously used at it (debounced).
  useEffect(() => {
    const hospital = form.hospital.trim();
    if (hospital.length < 3) {
      setDirDoctors([]);
      dirFetchRef.current = "";
      return;
    }
    if (dirFetchRef.current === hospital) return;
    const t = window.setTimeout(async () => {
      dirFetchRef.current = hospital;
      try {
        const code = getStoredOpsCode() ?? "";
        const res = await fetch(`/api/ops/doctors?hospital=${encodeURIComponent(hospital)}`, {
          headers: { "x-access-code": code },
        });
        const json = await res.json();
        if (json.ok && Array.isArray(json.data?.doctors)) setDirDoctors(json.data.doctors);
      } catch {
        /* silent */
      }
    }, 350);
    return () => window.clearTimeout(t);
  }, [form.hospital]);

  /** Fill the form from a directory/AI doctor suggestion and remember it. */
  const pickDoctor = useCallback(
    (
      d: { doctorName: string; doctorNameEn?: string; jobTitleAr?: string; jobTitleEn?: string; hospital?: string; hospitalEn?: string },
      opts?: { save?: boolean }
    ) => {
      setForm((f) => ({
        ...f,
        doctorName: d.doctorName,
        doctorNameEn: (d.doctorNameEn || f.doctorNameEn).toUpperCase(),
        doctorJobTitle: d.jobTitleAr || f.doctorJobTitle,
        doctorJobTitleEn: d.jobTitleEn || f.doctorJobTitleEn,
        hospital: d.hospital || f.hospital,
        hospitalEn: d.hospitalEn || f.hospitalEn,
      }));
      setAiDoctors(null);
      if (opts?.save) {
        void fetch("/api/ops/doctors", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-access-code": getStoredOpsCode() ?? "" },
          body: JSON.stringify({
            doctorName: d.doctorName,
            doctorNameEn: d.doctorNameEn ?? "",
            jobTitleAr: d.jobTitleAr ?? "",
            jobTitleEn: d.jobTitleEn ?? "",
            hospital: d.hospital ?? form.hospital.trim(),
            hospitalEn: d.hospitalEn ?? "",
          }),
        })
          .then(async (r) => {
            const json = await r.json().catch(() => null);
            if (json?.ok && Array.isArray(json.data?.doctors)) setDirDoctors(json.data.doctors);
            await loadHospitals();
          })
          .catch(() => undefined);
      }
    },
    [form.hospital, loadHospitals]
  );

  /** توليد بالذكاء الاصطناعي: أسماء أطباء سعودية واقعية للمستشفى الحالي. */
  const generateAiDoctors = useCallback(async () => {
    if (aiLoading) return;
    setAiLoading(true);
    setAiError("");
    setAiDoctors(null);
    try {
      const res = await fetch("/api/ops/ai-doctor", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-access-code": getStoredOpsCode() ?? "" },
        body: JSON.stringify({ hospital: form.hospital.trim() }),
      });
      const json = await res.json();
      if (json.ok) {
        setAiDoctors(json.data.doctors);
        setAiHospital(json.data.hospital);
      } else {
        setAiError(json.message || "تعذّر التوليد، حاول مرة أخرى");
      }
    } catch {
      setAiError("تعذّر الاتصال بخدمة التوليد");
    } finally {
      setAiLoading(false);
    }
  }, [aiLoading, form.hospital]);

  const setRecord = useCallback((rec: PortalSickLeaveRecord | null) => {
    recordRef.current = rec;
    setRecordState(rec);
  }, []);

  // Live-computed values for the form hints (same algorithms as the server)
  const liveDuration = useMemo(
    () => computeDurationDays(form.dateFromIso, form.dateToIso),
    [form.dateFromIso, form.dateToIso]
  );
  const liveFromHijri = useMemo(() => toHijri(form.dateFromIso), [form.dateFromIso]);
  const liveToHijri = useMemo(() => toHijri(form.dateToIso), [form.dateToIso]);

  // Clean timers on unmount
  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) window.clearTimeout(advanceTimerRef.current);
      if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, []);

  // ── Smart input: parse on EVERY keystroke, fill instantly ───────────────
  const onSmartChange = (value: string) => {
    setSmartText(value);
    const parsed = parseSmartInput(value);
    setSmartResult(parsed);
    setForm((f) => applyParsed(f, parsed.fields));

    if (parsed.isComplete) {
      if (!completeRef.current) {
        completeRef.current = true;
        if (advanceTimerRef.current) window.clearTimeout(advanceTimerRef.current);
        advanceTimerRef.current = window.setTimeout(() => {
          advanceTimerRef.current = null;
          setTab("form");
          setAutoNotice(
            "تمت تعبئة النموذج تلقائيًا من الادخال الذكي — راجع البيانات ثم اضغط «حفظ وإصدار التقرير»"
          );
          if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
          noticeTimerRef.current = window.setTimeout(() => setAutoNotice(""), 9000);
        }, 800);
      }
    } else {
      completeRef.current = false;
      if (advanceTimerRef.current) {
        window.clearTimeout(advanceTimerRef.current);
        advanceTimerRef.current = null;
      }
    }
  };

  // ── Validation + issue ───────────────────────────────────────────────────
  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.patientName.trim()) e.patientName = "الاسم (عربي) مطلوب";
    if (!/^\d{10}$/.test(form.patientId.trim())) e.patientId = "رقم الهوية يجب أن يكون 10 أرقام";
    if (!form.doctorName.trim()) e.doctorName = "اسم الطبيب (عربي) مطلوب";
    if (liveDuration < 1) e.dateToIso = "تاريخ النهاية يجب أن يكون بعد البداية";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const issue = async () => {
    if (issuing) return;
    if (!validate()) {
      setTab("form");
      return;
    }
    setIssuing(true);
    try {
      const code = getStoredOpsCode() ?? "";
      const res = await fetch("/api/ops/sick-leave", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-access-code": code },
        body: JSON.stringify({
          accessCode: code,
          serviceCode: form.serviceCode.trim(),
          patientId: form.patientId.trim(),
          patientName: form.patientName.trim(),
          patientNameEn: form.patientNameEn.trim(),
          patientPhone: form.patientPhone.trim(),
          sickLeaveDateIso: form.sickLeaveDateIso,
          dateFromIso: form.dateFromIso,
          dateToIso: form.dateToIso,
          doctorName: form.doctorName.trim(),
          doctorNameEn: form.doctorNameEn.trim(),
          doctorJobTitle: form.doctorJobTitle.trim(),
          doctorJobTitleEn: form.doctorJobTitleEn.trim(),
          hospital: form.hospital.trim(),
          hospitalEn: form.hospitalEn.trim(),
          licenseNumber: form.licenseNumber.trim(),
          employerAr: form.employerAr.trim(),
          nationalityAr: form.nationalityAr.trim(),
          nationalityEn: form.nationalityEn.trim(),
          templateId: form.templateId,
          addQr: form.addQr,
          showLicense: form.showLicense,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.ok) {
        if (res.status === 403) {
          onSessionExpired();
          return;
        }
        setErrors({ submit: body?.message ?? "تعذّر حفظ الإجازة" });
        return;
      }
      // Saved → open the preview & edit page (صفحة المعاينة والتعديل)
      setRecord({ ...(body.data as PortalSickLeaveRecord), logoUrl: activeLogoUrl });
      setHistory(null); // new leave saved → history cache is stale
      setSaveState("idle");
      setSaveError("");
      setDownloadError("");
      setMode("review");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setErrors({ submit: "تعذّر الاتصال بالخدمة" });
    } finally {
      setIssuing(false);
    }
  };

  const resetAll = () => {
    setForm(emptyForm());
    setErrors({});
    setSmartText("");
    setSmartResult(null);
    setAutoNotice("");
    completeRef.current = false;
    if (advanceTimerRef.current) window.clearTimeout(advanceTimerRef.current);
    setRecord(null);
    setSaveState("idle");
    setSaveError("");
    setDownloadError("");
    setMode("workspace");
    setTab("smart");
  };

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  /** Pick the report template — remembered for the operator's next leave. */
  const chooseTemplate = (id: string) => {
    const templateId = normalizeTemplateId(id);
    setForm((f) => ({ ...f, templateId }));
    try {
      localStorage.setItem(TEMPLATE_KEY, templateId);
    } catch {
      /* private mode — choice still applies to this session */
    }
  };

  // ── Review page: live edit + debounced auto-save ─────────────────────────

  const sendSave = useCallback(
    async (rec: PortalSickLeaveRecord) => {
      setSaveState("saving");
      setSaveError("");
      const payload: (PortalSickLeaveInput & { id: string; accessCode?: string }) = {
        id: rec.id,
        accessCode: getStoredOpsCode() ?? "",
        serviceCode: rec.serviceCode,
        patientId: rec.patientId,
        patientName: rec.patientName,
        patientNameEn: rec.patientNameEn,
        patientPhone: rec.patientPhone,
        sickLeaveDateIso: rec.sickLeaveDateIso,
        dateFromIso: rec.dateFromIso,
        dateToIso: rec.dateToIso,
        doctorName: rec.doctorName,
        doctorNameEn: rec.doctorNameEn,
        doctorJobTitle: rec.doctorJobTitle,
        doctorJobTitleEn: rec.doctorJobTitleEn,
        hospital: rec.hospital,
        hospitalEn: rec.hospitalEn,
        licenseNumber: rec.licenseNumber,
        employerAr: rec.employerAr,
        nationalityAr: rec.nationalityAr,
        nationalityEn: rec.nationalityEn,
        templateId: rec.templateId,
        addQr: rec.addQr,
        showLicense: rec.showLicense,
      };
      try {
        const code = getStoredOpsCode() ?? "";
        const res = await fetch("/api/ops/sick-leave", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "x-access-code": code },
          body: JSON.stringify(payload),
        });
        const body = await res.json().catch(() => null);
        if (!res.ok || !body?.ok) {
          if (res.status === 403) {
            onSessionExpired();
            return;
          }
          setSaveState("error");
          setSaveError(body?.message ?? "تعذّر حفظ التعديلات");
          return;
        }
        const data = body.data as PortalSickLeaveRecord;
        // Merge ONLY the server-computed fields — never clobber live typing.
        const current = recordRef.current;
        if (current && current.id === data.id) {
          const merged: PortalSickLeaveRecord = {
            ...current,
            dateFromHijri: data.dateFromHijri,
            dateToHijri: data.dateToHijri,
            durationDays: data.durationDays,
          };
          setRecord(merged);
        }
        setSaveState("saved");
        window.setTimeout(() => setSaveState((s) => (s === "saved" ? "idle" : s)), 2500);
      } catch {
        setSaveState("error");
        setSaveError("تعذّر الاتصال بالخدمة");
      }
    },
    [onSessionExpired, setRecord]
  );

  const updateRecord = useCallback(
    <K extends keyof PortalSickLeaveInput>(key: K, value: PortalSickLeaveInput[K]) => {
      const current = recordRef.current;
      if (!current) return;
      const next = { ...current, [key]: value } as PortalSickLeaveRecord;
      // Instant client-side recompute so the preview never lags behind.
      if (key === "dateFromIso" || key === "dateToIso") {
        next.dateFromHijri = toHijri(next.dateFromIso);
        next.dateToHijri = toHijri(next.dateToIso);
        next.durationDays = computeDurationDays(next.dateFromIso, next.dateToIso);
      }
      setRecord(next);
      // Word-style autosave: debounce while typing, then commit.
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(() => {
        saveTimerRef.current = null;
        inflightSaveRef.current = sendSave(recordRef.current as PortalSickLeaveRecord);
      }, 800);
    },
    [sendSave, setRecord]
  );

  /** Commit any pending edit immediately (used right before downloading). */
  const flushSave = useCallback(async () => {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
      const rec = recordRef.current;
      if (rec) inflightSaveRef.current = sendSave(rec);
    }
    if (inflightSaveRef.current) await inflightSaveRef.current;
  }, [sendSave]);

  const verificationLink = useMemo(() => {
    if (typeof window === "undefined" || !record) return "";
    return `${window.location.origin}/#/inquiries/slenquiry?service_num=${encodeURIComponent(record.serviceCode)}&national_id=${encodeURIComponent(record.patientId)}`;
  }, [record]);

  const copyLink = async () => {
    if (!verificationLink) return;
    try {
      await navigator.clipboard.writeText(verificationLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  // ── REAL PDF download (no print dialog) ─────────────────────────────────

  const waitForImages = (root: HTMLElement) => {
    const imgs = Array.from(root.querySelectorAll("img"));
    return Promise.all(
      imgs.map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              img.addEventListener("load", () => resolve(), { once: true });
              img.addEventListener("error", () => resolve(), { once: true });
            })
      )
    );
  };

  const downloadPdf = async () => {
    const rec = recordRef.current;
    if (downloading || !rec) return;
    setDownloadError("");
    try {
      setDownloading(true);
      // Commit any pending edit FIRST so the file always matches the data.
      await flushSave();

      const node = captureRef.current;
      if (!node) throw new Error("capture node missing");
      if (typeof document !== "undefined" && document.fonts) {
        await document.fonts.ready;
      }
      await waitForImages(node);

      const [{ toPng }, { jsPDF }] = await Promise.all([
        import("html-to-image"),
        import("jspdf"),
      ]);
      const dataUrl = await toPng(node, {
        pixelRatio: 3, // 794px → 2382px ≈ 200 DPI on A4
        backgroundColor: "#ffffff",
      });
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
      pdf.addImage(dataUrl, "PNG", 0, 0, 210, 297, undefined, "FAST");

      // ── CLICKABLE verification link (the customer's #1 requirement) ──
      // The rasterised sheet renders the link as pixels — overlay real PDF
      // link annotations on top of the visible link text, the QR code AND the
      // whole verification block, each padded well beyond its visible bounds.
      // The result: a large, finger-friendly touch zone (~40×8mm for the link
      // row alone, the full block ~75×35mm) — tapping anywhere on the
      // verification text, link or QR opens the enquiry page with the service
      // code + national ID auto-filled.
      const verifyUrl = `${window.location.origin}/#/inquiries/slenquiry?service_num=${encodeURIComponent(
        rec.serviceCode
      )}&national_id=${encodeURIComponent(rec.patientId)}`;
      const rootRect = node.getBoundingClientRect();
      if (rootRect.width > 0 && rootRect.height > 0) {
        const kx = 210 / rootRect.width; // CSS px → mm (A4 width)
        const ky = 297 / rootRect.height; // CSS px → mm (A4 height)
        /** Overlay a link annotation over `el`, expanded by padX/padY CSS px. */
        const overlayLink = (el: Element | null, padX = 10, padY = 6) => {
          if (!el) return;
          const r = el.getBoundingClientRect();
          if (r.width <= 0 || r.height <= 0) return;
          pdf.link(
            (r.left - rootRect.left - padX) * kx,
            (r.top - rootRect.top - padY) * ky,
            (r.width + padX * 2) * kx,
            (r.height + padY * 2) * ky,
            { url: verifyUrl }
          );
        };
        // 1. The entire verification block (QR + Arabic + English lines +
        //    link) — one big primary touch zone.
        overlayLink(node.querySelector(".sl-verify-block"), 14, 12);
        // 2. The visible link text itself, generously padded.
        overlayLink(node.querySelector(".sl-verify-link"), 16, 10);
        // 3. The QR code, padded.
        if (rec.addQr) {
          overlayLink(node.querySelector(".sl-qr-box canvas") ?? node.querySelector(".sl-qr-box"), 10, 10);
        }
      }

      pdf.save(`إجازة مرضية ${rec.serviceCode}.pdf`);
    } catch {
      setDownloadError("تعذّر إنشاء الملف، حاول مرة أخرى");
    } finally {
      setDownloading(false);
    }
  };

  // ── السجل: fetch every issued leave and open the history dialog ─────────
  const openHistory = async () => {
    setHistoryOpen(true);
    setHistoryError("");
    setHistorySearch("");
    if (history) return; // already loaded — the list is fresh enough after saves
    setHistoryLoading(true);
    try {
      const code = getStoredOpsCode() ?? "";
      const res = await fetch("/api/ops/sick-leave?limit=200", {
        headers: { "x-access-code": code },
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.ok) {
        if (res.status === 403) {
          setHistoryOpen(false);
          onSessionExpired();
          return;
        }
        setHistoryError(body?.message ?? "تعذّر تحميل السجل");
        return;
      }
      setHistory(body.data as PortalSickLeaveRecord[]);
    } catch {
      setHistoryError("تعذّر الاتصال بالخدمة");
    } finally {
      setHistoryLoading(false);
    }
  };

  /** Reload the history (called right after a new leave is saved). */
  const refreshHistory = () => setHistory(null);

  /** Open a past leave on the review page — editable, printable, verifiable. */
  const loadFromHistory = (rec: PortalSickLeaveRecord) => {
    setRecord(rec);
    setSaveState("idle");
    setSaveError("");
    setDownloadError("");
    setMode("review");
    setHistoryOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Keep the history cache honest: any successful save invalidates it.
  useEffect(() => {
    if (saveState === "saved") refreshHistory();
  }, [saveState]);

  const historyFiltered = useMemo(() => {
    if (!history) return [];
    const q = historySearch.trim().toLowerCase();
    if (!q) return history;
    return history.filter(
      (r) =>
        r.patientName.toLowerCase().includes(q) ||
        (r.patientNameEn ?? "").toLowerCase().includes(q) ||
        r.patientId.includes(q) ||
        r.serviceCode.toLowerCase().includes(q)
    );
  }, [history, historySearch]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="ops-portal" dir="rtl">
      <div className="ops-topbar">
        <div className="ops-topbar-title">
          <span className="ops-topbar-badge" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </span>
          <div>
            <h1>بوابة إصدار الإجازات المرضية</h1>
            <p>
              {mode === "review"
                ? "صفحة المعاينة والتعديل — كل تعديل يظهر فورًا ويُحفظ تلقائيًا"
                : "منطقة خاصة بالمشغلين — إدخال ذكي، إصدار، وتحميل فوري"}
            </p>
          </div>
        </div>
        <div className="ops-topbar-actions">
          <button type="button" className="ops-history-btn" onClick={openHistory} aria-haspopup="dialog">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            السجل
          </button>
          <button type="button" className="ops-exit-btn" onClick={onExit}>
            خروج آمن
          </button>
        </div>
      </div>

      {/* ── معرض الشعارات: زر تغيير الشعار ── */}
      {logoPickerOpen && (
        <div
          className="ops-history-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="اختيار شعار المنشأة"
          onClick={(e) => {
            if (e.target === e.currentTarget) setLogoPickerOpen(false);
          }}
        >
          <div className="ops-history-dialog">
            <div className="ops-history-head">
              <div>
                <h2>شعار المنشأة</h2>
                <p>شعارات المستشفيات الحكومية والخاصة والعسكرية حسب المنطقة</p>
              </div>
              <button type="button" className="ops-chip" onClick={() => setLogoPickerOpen(false)}>
                إغلاق
              </button>
            </div>
            <div className="ops-logo-actions">
              <input
                className={inputCls}
                placeholder="ابحث باسم المستشفى أو المنطقة…"
                value={logoSearch}
                onChange={(e) => setLogoSearch(e.target.value)}
                style={{ maxWidth: 320 }}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => onUploadLogo(e.target.files?.[0])}
              />
              <button type="button" className="ops-mini-btn" onClick={() => fileInputRef.current?.click()}>
                رفع شعار خاص
              </button>
            </div>
            <div className="ops-logo-grid">
              {filteredLogoHospitals.map((h) => (
                <button
                  key={h.slug}
                  type="button"
                  className={`ops-logo-card${activeLogoUrl === `/assets/logos/${h.slug}.svg` ? " ops-logo-card-active" : ""}`}
                  onClick={() => {
                    setPickedLogoSlug(h.slug);
                    setCustomLogo("");
                    try {
                      localStorage.removeItem("ops-custom-logo");
                    } catch {
                      /* ignore */
                    }
                    // Picking a hospital's logo switches the facility to it.
                    setForm((f) => ({ ...f, hospital: h.nameAr, hospitalEn: h.nameEn }));
                    setLogoPickerOpen(false);
                  }}
                >
                  <img src={`/assets/logos/${h.slug}.svg`} alt={h.nameAr} />
                  <span className="ops-logo-card-region">{h.region}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── سجل الإجازات: every previously created leave ── */}
      {historyOpen && (
        <div
          className="ops-history-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="سجل الإجازات الصادرة"
          onClick={(e) => {
            if (e.target === e.currentTarget) setHistoryOpen(false);
          }}
        >
          <div className="ops-history-dialog">
            <div className="ops-history-head">
              <div>
                <h2>سجل الإجازات الصادرة</h2>
                <p>
                  {historyLoading
                    ? "جارٍ التحميل…"
                    : history
                      ? `${history.length} إجازة — الأحدث أولًا`
                      : "جميع الإجازات التي أُنشئت من هذه البوابة"}
                </p>
              </div>
              <button
                type="button"
                className="ops-history-close"
                onClick={() => setHistoryOpen(false)}
                aria-label="إغلاق السجل"
              >
                ✕
              </button>
            </div>

            <input
              type="search"
              className="ops-history-search"
              placeholder="ابحث بالاسم أو رقم الهوية أو رمز الخدمة…"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              aria-label="بحث في السجل"
            />

            <div className="ops-history-list">
              {historyLoading && (
                <div className="ops-history-empty">
                  <span className="ops-spinner" aria-hidden="true" /> جارٍ تحميل السجل…
                </div>
              )}
              {!historyLoading && historyError && (
                <div className="ops-history-empty ops-history-error">{historyError}</div>
              )}
              {!historyLoading && !historyError && historyFiltered.length === 0 && (
                <div className="ops-history-empty">لا توجد إجازات مطابقة</div>
              )}
              {!historyLoading &&
                !historyError &&
                historyFiltered.map((r) => (
                  <button
                    type="button"
                    key={r.id}
                    className="ops-history-item"
                    onClick={() => loadFromHistory(r)}
                    title="فتح هذه الإجازة في صفحة المعاينة"
                  >
                    <span className="ops-history-item-main">
                      <span className="ops-history-item-name">{r.patientName}</span>
                      <span className="ops-history-item-sub" dir="ltr">
                        {r.serviceCode} · {r.patientId}
                      </span>
                    </span>
                    <span className="ops-history-item-meta">
                      <span className="ops-history-item-tpl">{getTemplateMeta(r.templateId).nameAr}</span>
                      <span className="ops-history-item-dates">
                        {r.dateFromIso} ← {r.dateToIso} ({r.durationDays} {r.durationDays > 1 ? "أيام" : "يوم"})
                      </span>
                      <span className="ops-history-item-time" dir="ltr">
                        {new Date(r.createdAt).toLocaleString("ar-SA", { dateStyle: "short", timeStyle: "short" })}
                      </span>
                    </span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {mode === "review" && record ? (
        /* ─────────────── صفحة المعاينة والتعديل (Word-like) ─────────────── */
        <div className="ops-review">
          <div className="ops-review-toolbar">
            <div className="ops-review-heading">
              <span className="ops-review-heading-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </span>
              <div>
                <h2>صفحة المعاينة والتعديل</h2>
                <span className={`ops-save-state ops-save-state--${saveState}`} role="status">
                  {saveState === "saving" && <>جارٍ الحفظ…</>}
                  {saveState === "saved" && <>تم الحفظ ✓</>}
                  {saveState === "error" && <>تعذّر الحفظ — أعد المحاولة</>}
                  {saveState === "idle" && <>الحفظ التلقائي مفعّل</>}
                </span>
              </div>
            </div>
            <div className="ops-review-actions">
              <span className="ops-review-tpl-chip" title="القالب المطبق على هذا التقرير">
                القالب: {getTemplateMeta(record.templateId).nameAr}
              </span>
              <button
                type="button"
                className="ops-btn ops-btn-primary"
                onClick={downloadPdf}
                disabled={downloading}
              >
                {downloading ? (
                  <>
                    <span className="ops-spinner" aria-hidden="true" />
                    جارٍ إنشاء الملف…
                  </>
                ) : (
                  <>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    تحميل PDF
                  </>
                )}
              </button>
              <button type="button" className="ops-btn ops-btn-ghost" onClick={copyLink}>
                {copied ? "تم نسخ الرابط ✓" : "نسخ رابط التحقق"}
              </button>
              <button type="button" className="ops-btn ops-btn-ghost" onClick={resetAll}>
                إجازة جديدة
              </button>
            </div>
          </div>

          {saveError && (
            <p className="ops-form-error" role="alert">{saveError}</p>
          )}
          {downloadError && (
            <p className="ops-form-error" role="alert">{downloadError}</p>
          )}

          <div className="ops-review-grid">
            {/* Edit panel — every keystroke updates the document instantly */}
            <div className="ops-review-edit">
              <fieldset className="ops-group">
                <legend>بيانات المريض</legend>
                <div className="ops-grid">
                  <Field label="الاسم (عربي)">
                    <input
                      className={inputCls}
                      value={record.patientName}
                      onChange={(e) => updateRecord("patientName", e.target.value)}
                    />
                  </Field>
                  <Field label="الاسم (إنجليزي)">
                    <input
                      className={inputCls}
                      value={record.patientNameEn}
                      dir="ltr"
                      onChange={(e) => updateRecord("patientNameEn", e.target.value)}
                    />
                  </Field>
                  <Field label="رقم الهوية / الإقامة">
                    <input
                      className={inputCls}
                      value={record.patientId}
                      dir="ltr"
                      inputMode="numeric"
                      maxLength={10}
                      onChange={(e) => updateRecord("patientId", e.target.value.replace(/\D/g, ""))}
                    />
                  </Field>
                  <Field label="الجوال">
                    <input
                      className={inputCls}
                      value={record.patientPhone}
                      dir="ltr"
                      inputMode="tel"
                      onChange={(e) => updateRecord("patientPhone", e.target.value)}
                    />
                  </Field>
                  <Field label="الجنسية">
                    <input
                      className={inputCls}
                      value={record.nationalityAr}
                      onChange={(e) => updateRecord("nationalityAr", e.target.value)}
                    />
                  </Field>
                  <Field label="الجنسية (إنجليزي)">
                    <input
                      className={inputCls}
                      value={record.nationalityEn}
                      dir="ltr"
                      onChange={(e) => updateRecord("nationalityEn", e.target.value)}
                    />
                  </Field>
                  <Field label="جهة العمل">
                    <input
                      className={inputCls}
                      value={record.employerAr}
                      onChange={(e) => updateRecord("employerAr", e.target.value)}
                    />
                  </Field>
                </div>
              </fieldset>

              <fieldset className="ops-group">
                <legend>بيانات الإجازة</legend>
                <div className="ops-grid">
                  <Field label="رمز الخدمة" hint="هو المفتاح الذي يستعلم به العميل">
                    <input
                      className={inputCls}
                      value={record.serviceCode}
                      dir="ltr"
                      onChange={(e) => updateRecord("serviceCode", e.target.value.toUpperCase())}
                    />
                  </Field>
                  <Field label="تاريخ إصدار التقرير">
                    <input
                      className={inputCls}
                      type="date"
                      value={record.sickLeaveDateIso}
                      onChange={(e) => updateRecord("sickLeaveDateIso", e.target.value)}
                    />
                  </Field>
                  <Field label="تبدأ من" hint={record.dateFromHijri ? `هجري: ${record.dateFromHijri}` : undefined}>
                    <input
                      className={inputCls}
                      type="date"
                      value={record.dateFromIso}
                      onChange={(e) => updateRecord("dateFromIso", e.target.value)}
                    />
                  </Field>
                  <Field
                    label="وحتى"
                    hint={
                      record.durationDays > 0
                        ? `هجري: ${record.dateToHijri} — المدة: ${record.durationDays} ${record.durationDays > 1 ? "أيام" : "يوم"}`
                        : undefined
                    }
                  >
                    <input
                      className={inputCls}
                      type="date"
                      value={record.dateToIso}
                      onChange={(e) => updateRecord("dateToIso", e.target.value)}
                    />
                  </Field>
                </div>
              </fieldset>

              <fieldset className="ops-group">
                <legend>الطبيب والمنشأة</legend>
                <div className="ops-grid">
                  <Field label="اسم الطبيب (عربي)">
                    <input
                      className={inputCls}
                      value={record.doctorName}
                      onChange={(e) => updateRecord("doctorName", e.target.value)}
                    />
                  </Field>
                  <Field label="اسم الطبيب (إنجليزي)">
                    <input
                      className={inputCls}
                      value={record.doctorNameEn}
                      dir="ltr"
                      onChange={(e) => updateRecord("doctorNameEn", e.target.value)}
                    />
                  </Field>
                  <Field label="المسمى الوظيفي (عربي)">
                    <input
                      className={inputCls}
                      value={record.doctorJobTitle}
                      onChange={(e) => updateRecord("doctorJobTitle", e.target.value)}
                    />
                  </Field>
                  <Field label="المسمى الوظيفي (إنجليزي)">
                    <input
                      className={inputCls}
                      value={record.doctorJobTitleEn}
                      dir="ltr"
                      onChange={(e) => updateRecord("doctorJobTitleEn", e.target.value)}
                    />
                  </Field>
                  <Field label="المنشأة الصحية (عربي)">
                    <input
                      className={inputCls}
                      value={record.hospital}
                      onChange={(e) => updateRecord("hospital", e.target.value)}
                    />
                  </Field>
                  <Field label="المنشأة الصحية (إنجليزي)">
                    <input
                      className={inputCls}
                      value={record.hospitalEn}
                      dir="ltr"
                      onChange={(e) => updateRecord("hospitalEn", e.target.value)}
                    />
                  </Field>
                  <Field label="رقم الترخيص">
                    <input
                      className={inputCls}
                      value={record.licenseNumber}
                      dir="ltr"
                      onChange={(e) => updateRecord("licenseNumber", e.target.value)}
                    />
                  </Field>
                </div>
              </fieldset>

              <fieldset className="ops-group">
                <legend>خيارات التقرير</legend>
                <div className="ops-toggles">
                  <label className="ops-toggle">
                    <input
                      type="checkbox"
                      checked={record.showLicense}
                      onChange={(e) => updateRecord("showLicense", e.target.checked)}
                    />
                    إظهار رقم الترخيص في التقرير
                  </label>
                  <label className="ops-toggle">
                    <input
                      type="checkbox"
                      checked={record.addQr}
                      onChange={(e) => updateRecord("addQr", e.target.checked)}
                    />
                    إضافة رمز QR للتحقق في التقرير
                  </label>
                </div>
              </fieldset>

              <div className="ops-issued-link" dir="ltr">
                <a href={verificationLink} target="_blank" rel="noopener noreferrer">
                  {verificationLink}
                </a>
              </div>
            </div>

            {/* The document — updates instantly with every edit */}
            <div className="ops-review-doc">
              <div className="ops-preview-frame">
                <DocumentPreview data={record} />
              </div>
              <p className="ops-review-hint">
                هذه المعاينة هي نفسها الملف الذي سيُحمّل — أي تعديل تكتبه يظهر هنا فورًا ويُحفظ تلقائيًا.
              </p>
            </div>
          </div>

          {/* Hidden FULL-SIZE A4 render used only for the real PDF capture */}
          <div aria-hidden="true" style={{ position: "fixed", left: "-10000px", top: 0, width: 794 }}>
            <div ref={captureRef}>
              <TemplateDocument templateId={record.templateId} data={record} />
            </div>
          </div>
        </div>
      ) : (
        /* ─────────────── Workspace: template picker + smart input + form ─────────────── */
        <div className="ops-workspace">
          <div className="ops-main">
            {/* STEP 1 — template selection (اختيار القالب قبل البدء) */}
            <section className="ops-tpl-section" aria-labelledby="ops-tpl-title">
              <div className="ops-tpl-head">
                <h3 id="ops-tpl-title">
                  <span className="ops-tpl-stepnum" aria-hidden="true">١</span>
                  اختر قالب التقرير
                </h3>
                <p>القالب المختار يُطبَّق على المعاينة وملف PDF — ويمكن تغييره في أي وقت قبل الإصدار.</p>
              </div>
              <div className="ops-tpl-grid" role="radiogroup" aria-label="قوالب تقرير الإجازة المرضية">
                {SICK_LEAVE_TEMPLATES.map((t) => {
                  const selected = form.templateId === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      aria-label={`قالب ${t.nameAr} — ${t.taglineAr}`}
                      className={`ops-tpl-card${selected ? " selected" : ""}`}
                      onClick={() => chooseTemplate(t.id)}
                    >
                      <span className="ops-tpl-thumb" aria-hidden="true">
                        <span className="ops-tpl-thumb-frame">
                          <span className="ops-tpl-thumb-scale">
                            <TemplateDocument templateId={t.id} data={SAMPLE_RECORD} />
                          </span>
                        </span>
                      </span>
                      <span className="ops-tpl-card-body">
                        <span className="ops-tpl-card-name">
                          {t.nameAr}
                          <span className="ops-tpl-card-check" aria-hidden="true">✓</span>
                        </span>
                        <span className="ops-tpl-card-tag">{t.taglineAr}</span>
                        <span className="ops-tpl-card-desc">{t.descriptionAr}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* STEP 2 — data entry tabs */}
            <div className="ops-tabs-label">
              <span className="ops-tpl-stepnum" aria-hidden="true">٢</span>
              بيانات الإجازة
            </div>

            {/* Tabs */}
            <div className="ops-tabs" role="tablist" aria-label="أدوات الإصدار">
              <button
                type="button"
                role="tab"
                aria-selected={tab === "smart"}
                className={`ops-tab${tab === "smart" ? " active" : ""}`}
                onClick={() => setTab("smart")}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3z" />
                </svg>
                الادخال الذكي
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "form"}
                className={`ops-tab${tab === "form" ? " active" : ""}`}
                onClick={() => setTab("form")}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
                نموذج الإجازة
              </button>
            </div>

            {/* Smart input tab — TEXT ONLY, fills live on every keystroke */}
            {tab === "smart" && (
              <div className="ops-tabpane">
                <div className="ops-ai-intro">
                  <h3>الادخال الذكي</h3>
                  <p>
                    اكتب أو الصق بيانات الإجازة هنا (نص فقط) — يكتب السطر باسم الحقل ثم القيمة،
                    والنموذج يُعبّى فورًا أثناء الكتابة بدون أي زر.
                  </p>
                </div>

                <textarea
                  className="ops-ai-textarea"
                  placeholder={`مثال:\nالاسم: محمد عبدالله السالم\nرقم الهوية: 1023456781\nالجنسية: سعودي\nجهة العمل: جامعة طيبة\nرقم الجوال: 0551234567\nتاريخ الاجازه: 20-11-2026\nالمدة: 3 ايام\nاسم الطبيب: د. خالد بن سعد الحربي`}
                  value={smartText}
                  dir="rtl"
                  rows={12}
                  onChange={(e) => onSmartChange(e.target.value)}
                />

                {/* Live status */}
                {smartResult && smartResult.filledCount > 0 && (
                  <div className="ops-smart-status" role="status">
                    <div className="ops-smart-status-main">
                      <span className={`ops-smart-chip${smartResult.isComplete ? " ok" : ""}`}>
                        {smartResult.isComplete
                          ? "اكتملت البيانات الأساسية ✓"
                          : `تم تعبئة ${smartResult.filledCount} حقلًا تلقائيًا`}
                      </span>
                      {smartResult.recognizedLabels.length > 0 && (
                        <span className="ops-smart-tags">
                          {smartResult.recognizedLabels.map((l) => (
                            <span key={l} className="ops-smart-tag">{l}</span>
                          ))}
                        </span>
                      )}
                    </div>
                    {!smartResult.isComplete && missingLabels(smartResult).length > 0 && (
                      <p className="ops-smart-missing">
                        الناقص: {missingLabels(smartResult).join("، ")}
                      </p>
                    )}
                  </div>
                )}

                {smartText && (
                  <button type="button" className="ops-btn ops-btn-ghost ops-smart-clear" onClick={() => onSmartChange("")}>
                    مسح النص
                  </button>
                )}
              </div>
            )}

            {/* Form tab */}
            {tab === "form" && (
              <div className="ops-tabpane">
                {autoNotice && <p className="ops-ai-notice" role="status">{autoNotice}</p>}

                <fieldset className="ops-group">
                  <legend>بيانات المريض</legend>
                  <div className="ops-grid">
                    <Field label="الاسم (عربي) *" error={errors.patientName}>
                      <input
                        className={inputCls}
                        value={form.patientName}
                        onChange={(e) => set("patientName", e.target.value)}
                        placeholder="محمد عبدالله السالم"
                      />
                    </Field>
                    <Field label="الاسم (إنجليزي)">
                      <input
                        className={inputCls}
                        value={form.patientNameEn}
                        dir="ltr"
                        onChange={(e) => set("patientNameEn", e.target.value)}
                        placeholder="MOHAMMED ABDULLAH ALSALOM"
                      />
                    </Field>
                    <Field label="رقم الهوية / الإقامة *" error={errors.patientId}>
                      <input
                        className={inputCls}
                        value={form.patientId}
                        dir="ltr"
                        inputMode="numeric"
                        maxLength={10}
                        onChange={(e) => set("patientId", e.target.value.replace(/\D/g, ""))}
                        placeholder="1023456781"
                      />
                    </Field>
                    <Field label="الجوال">
                      <input
                        className={inputCls}
                        value={form.patientPhone}
                        dir="ltr"
                        inputMode="tel"
                        onChange={(e) => set("patientPhone", e.target.value)}
                        placeholder="05xxxxxxxx"
                      />
                    </Field>
                    <Field label="الجنسية">
                      <input
                        className={inputCls}
                        value={form.nationalityAr}
                        onChange={(e) => set("nationalityAr", e.target.value)}
                      />
                    </Field>
                    <Field label="الجنسية (إنجليزي)">
                      <input
                        className={inputCls}
                        value={form.nationalityEn}
                        dir="ltr"
                        onChange={(e) => set("nationalityEn", e.target.value)}
                      />
                    </Field>
                    <Field label="جهة العمل">
                      <input
                        className={inputCls}
                        value={form.employerAr}
                        onChange={(e) => set("employerAr", e.target.value)}
                        placeholder="جامعة طيبة"
                      />
                    </Field>
                  </div>
                </fieldset>

                <fieldset className="ops-group">
                  <legend>بيانات الإجازة</legend>
                  <div className="ops-grid">
                    <Field label="رمز الخدمة (اتركه فارغًا للتوليد التلقائي)">
                      <div className="ops-inline">
                        <input
                          className={inputCls}
                          value={form.serviceCode}
                          dir="ltr"
                          onChange={(e) => set("serviceCode", e.target.value.toUpperCase())}
                          placeholder="PSL261XXXXXXXX"
                        />
                        <button
                          type="button"
                          className="ops-mini-btn"
                          onClick={() => set("serviceCode", generateServiceNumber("PSL"))}
                        >
                          توليد
                        </button>
                      </div>
                    </Field>
                    <Field label="تاريخ إصدار التقرير">
                      <input
                        className={inputCls}
                        type="date"
                        value={form.sickLeaveDateIso}
                        onChange={(e) => set("sickLeaveDateIso", e.target.value)}
                      />
                    </Field>
                    <Field label="تبدأ من" hint={liveFromHijri ? `هجري: ${liveFromHijri}` : undefined}>
                      <input
                        className={inputCls}
                        type="date"
                        value={form.dateFromIso}
                        onChange={(e) => set("dateFromIso", e.target.value)}
                      />
                    </Field>
                    <Field
                      label="وحتى"
                      hint={
                        liveDuration > 0
                          ? `هجري: ${liveToHijri} — المدة: ${liveDuration} ${liveDuration > 1 ? "أيام" : "يوم"}`
                          : undefined
                      }
                      error={errors.dateToIso}
                    >
                      <input
                        className={inputCls}
                        type="date"
                        value={form.dateToIso}
                        onChange={(e) => set("dateToIso", e.target.value)}
                      />
                    </Field>
                  </div>
                </fieldset>

                <fieldset className="ops-group">
                  <legend>الطبيب والمنشأة</legend>
                  <div className="ops-grid">
                    <div className="ops-field">
                      <span className="ops-field-label">اسم الطبيب (عربي) *</span>
                      <div className="ops-inline">
                        <input
                          className={inputCls}
                          value={form.doctorName}
                          onChange={(e) => set("doctorName", e.target.value)}
                          placeholder="د. خالد بن سعد الحربي"
                        />
                        <button
                          type="button"
                          className="ops-mini-btn"
                          onClick={generateAiDoctors}
                          disabled={aiLoading}
                          title="توليد أسماء أطباء بالذكاء الاصطناعي حسب المستشفى"
                        >
                          {aiLoading ? "جارٍ التوليد…" : "توليد ذكي"}
                        </button>
                      </div>
                      {errors.doctorName && <span className="ops-field-error">{errors.doctorName}</span>}
                      {dirDoctors.length > 0 && (
                        <div className="ops-dir-chips">
                          <span className="ops-dir-chips-label">أطباء سبق استخدامهم هنا:</span>
                          {dirDoctors.slice(0, 6).map((d) => (
                            <button
                              key={d.id}
                              type="button"
                              className="ops-chip"
                              onClick={() => pickDoctor(d)}
                              title={`${d.jobTitleAr || ""} — استُخدم ${d.useCount} مرة`}
                            >
                              {d.doctorName}
                            </button>
                          ))}
                        </div>
                      )}
                      {aiDoctors && (
                        <div className="ops-dir-chips ops-dir-ai">
                          <span className="ops-dir-chips-label">
                            مقترحات الذكاء الاصطناعي{aiHospital?.ar ? ` — ${aiHospital.ar}` : ""}:
                          </span>
                          {aiDoctors.map((d) => (
                            <button
                              key={d.nameAr}
                              type="button"
                              className="ops-chip ops-chip-ai"
                              onClick={() =>
                                pickDoctor(
                                  {
                                    doctorName: d.nameAr,
                                    doctorNameEn: d.nameEn,
                                    jobTitleAr: d.titleAr,
                                    jobTitleEn: d.titleEn,
                                    hospital: aiHospital?.ar || form.hospital.trim(),
                                    hospitalEn: aiHospital?.en || "",
                                  },
                                  { save: true }
                                )
                              }
                              title={d.titleAr}
                            >
                              {d.nameAr}
                            </button>
                          ))}
                        </div>
                      )}
                      {aiError && <span className="ops-field-error">{aiError}</span>}
                    </div>
                    <Field label="اسم الطبيب (إنجليزي)">
                      <input
                        className={inputCls}
                        value={form.doctorNameEn}
                        dir="ltr"
                        onChange={(e) => set("doctorNameEn", e.target.value)}
                        placeholder="KHALED SAAD ALHARBI"
                      />
                    </Field>
                    <Field label="المسمى الوظيفي (عربي)">
                      <input
                        className={inputCls}
                        value={form.doctorJobTitle}
                        onChange={(e) => set("doctorJobTitle", e.target.value)}
                      />
                    </Field>
                    <Field label="المسمى الوظيفي (إنجليزي)">
                      <input
                        className={inputCls}
                        value={form.doctorJobTitleEn}
                        dir="ltr"
                        onChange={(e) => set("doctorJobTitleEn", e.target.value)}
                      />
                    </Field>
                    <div className="ops-field">
                      <span className="ops-field-label">شعار المنشأة على التقرير</span>
                      <div className="ops-logo-row">
                        <img src={activeLogoUrl} alt="شعار المنشأة" className="ops-logo-preview" />
                        <button type="button" className="ops-mini-btn" onClick={() => setLogoPickerOpen(true)}>
                          تغيير الشعار
                        </button>
                        {(customLogo || pickedLogoSlug) && (
                          <button
                            type="button"
                            className="ops-chip"
                            onClick={() => {
                              setCustomLogo("");
                              setPickedLogoSlug("");
                              try {
                                localStorage.removeItem("ops-custom-logo");
                              } catch {
                                /* ignore */
                              }
                            }}
                          >
                            إرجاع تلقائي حسب المستشفى
                          </button>
                        )}
                      </div>
                      <span className="ops-field-hint">يتغيّر تلقائيًا حسب المستشفى — أو اختر/ارفع شعارًا يدويًا</span>
                    </div>
                    <div className="ops-field">
                      <span className="ops-field-label">المنشأة الصحية (عربي)</span>
                      <input
                        className={inputCls}
                        value={form.hospital}
                        onChange={(e) => set("hospital", e.target.value)}
                        list="ops-hospital-list"
                        placeholder="مستشفى الملك فهد"
                      />
                      <datalist id="ops-hospital-list">
                        {dirHospitals.map((h) => (
                          <option key={h.hospital} value={h.hospital}>
                            {h.doctorCount > 0 ? `${h.doctorCount} طبيب محفوظ` : ""}
                          </option>
                        ))}
                      </datalist>
                      {dirDoctors.length > 0 && (
                        <span className="ops-field-hint">{dirDoctors.length} طبيب محفوظ لهذه المنشأة</span>
                      )}
                    </div>
                    <Field label="المنشأة الصحية (إنجليزي)">
                      <input
                        className={inputCls}
                        value={form.hospitalEn}
                        dir="ltr"
                        onChange={(e) => set("hospitalEn", e.target.value)}
                      />
                    </Field>
                    <Field label="رقم الترخيص">
                      <input
                        className={inputCls}
                        value={form.licenseNumber}
                        dir="ltr"
                        onChange={(e) => set("licenseNumber", e.target.value)}
                      />
                    </Field>
                  </div>
                </fieldset>

                <fieldset className="ops-group">
                  <legend>خيارات التقرير</legend>
                  <div className="ops-toggles">
                    <label className="ops-toggle">
                      <input
                        type="checkbox"
                        checked={form.showLicense}
                        onChange={(e) => set("showLicense", e.target.checked)}
                      />
                      إظهار رقم الترخيص في التقرير
                    </label>
                    <label className="ops-toggle">
                      <input
                        type="checkbox"
                        checked={form.addQr}
                        onChange={(e) => set("addQr", e.target.checked)}
                      />
                      إضافة رمز QR للتحقق في التقرير
                    </label>
                  </div>
                </fieldset>

                {errors.submit && <p className="ops-form-error" role="alert">{errors.submit}</p>}

                <div className="ops-form-actions">
                  <button type="button" className="ops-btn ops-btn-primary" onClick={issue} disabled={issuing}>
                    {issuing ? (
                      <>
                        <span className="ops-spinner" aria-hidden="true" />
                        جارٍ الإصدار…
                      </>
                    ) : (
                      <>
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M22 2L11 13" />
                          <path d="M22 2l-7 20-4-9-9-4 20-7z" />
                        </svg>
                        حفظ وإصدار التقرير
                      </>
                    )}
                  </button>
                  <button type="button" className="ops-btn ops-btn-ghost" onClick={resetAll}>
                    مسح البيانات
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <OpsPortalStyles />
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Scaled A4 preview (measures its frame, scales 794px sheet to fit)
// ───────────────────────────────────────────────────────────────────────────

function DocumentPreview({ data }: { data: PortalSickLeaveRecord }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const update = () => setScale(Math.min(1, el.clientWidth / 794));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={frameRef} className="doc-preview-frame">
      <div
        className="doc-preview-scale"
        style={{ transform: `scale(${scale})`, height: 1123 * scale }}
      >
        <TemplateDocument templateId={data.templateId} data={data} />
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Styles
// ───────────────────────────────────────────────────────────────────────────

function OpsPortalStyles() {
  return (
    <style>{`
      .ops-portal {
        min-height: 100vh; background: #f6f8f7;
        font-family: var(--font-plex-arabic), "IBM Plex Sans Arabic", "Cairo", sans-serif;
        padding: 0 0 60px;
      }

      /* ── Top bar ── */
      .ops-topbar {
        position: sticky; top: 0; z-index: 50;
        display: flex; align-items: center; justify-content: space-between; gap: 16px;
        padding: 14px clamp(16px, 4vw, 40px);
        background: linear-gradient(120deg, #0d5c3a, #1b8354);
        color: #fff;
        box-shadow: 0 6px 18px rgba(13, 92, 58, 0.28);
      }
      .ops-topbar-title { display: flex; align-items: center; gap: 14px; min-width: 0; }
      .ops-topbar-badge {
        width: 42px; height: 42px; border-radius: 12px; flex-shrink: 0;
        background: rgba(255, 255, 255, 0.16);
        display: flex; align-items: center; justify-content: center;
      }
      .ops-topbar-title h1 { margin: 0; font-size: clamp(15px, 2.4vw, 19px); font-weight: 700; }
      .ops-topbar-title p { margin: 2px 0 0; font-size: 12px; opacity: 0.85; }
      .ops-exit-btn {
        flex-shrink: 0; padding: 9px 18px; border-radius: 10px; border: 1.5px solid rgba(255,255,255,0.55);
        background: transparent; color: #fff; font-family: inherit; font-size: 13.5px; font-weight: 700;
        cursor: pointer; transition: background 0.15s;
      }
      .ops-exit-btn:hover { background: rgba(255,255,255,0.14); }

      .ops-topbar-actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
      .ops-history-btn {
        display: inline-flex; align-items: center; gap: 7px; flex-shrink: 0;
        padding: 9px 18px; border-radius: 10px; border: 1.5px solid rgba(255,255,255,0.55);
        background: rgba(255,255,255,0.12); color: #fff; font-family: inherit;
        font-size: 13.5px; font-weight: 700; cursor: pointer; transition: background 0.15s;
      }
      .ops-history-btn:hover { background: rgba(255,255,255,0.26); }

      /* ── سجل الإجازات (history dialog) ── */
      .ops-history-overlay {
        position: fixed; inset: 0; z-index: 90;
        background: rgba(6, 40, 26, 0.55); backdrop-filter: blur(2px);
        display: flex; align-items: center; justify-content: center; padding: 18px;
      }
      .ops-history-dialog {
        width: min(680px, 100%); max-height: min(82vh, 720px);
        display: flex; flex-direction: column;
        background: #fff; border-radius: 16px; overflow: hidden;
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.3);
      }
      .ops-history-head {
        display: flex; align-items: center; justify-content: space-between; gap: 12px;
        padding: 16px 20px 12px; color: #fff;
        background: linear-gradient(120deg, #0d5c3a, #1b8354);
      }
      .ops-history-head h2 { margin: 0; font-size: 17px; font-weight: 700; }
      .ops-history-head p { margin: 3px 0 0; font-size: 12px; opacity: 0.85; }
      .ops-history-close {
        flex-shrink: 0; width: 36px; height: 36px; border-radius: 10px;
        border: 1.5px solid rgba(255,255,255,0.55); background: transparent;
        color: #fff; font-size: 15px; font-weight: 700; cursor: pointer;
      }
      .ops-history-close:hover { background: rgba(255,255,255,0.18); }
      .ops-history-search {
        margin: 14px 20px 0; padding: 10px 14px; border-radius: 10px;
        border: 1.5px solid #cfe0d8; background: #f6faf8;
        font-family: inherit; font-size: 14px; color: #133528;
      }
      .ops-history-search:focus { outline: 2px solid #1b8354; outline-offset: 1px; background: #fff; }
      .ops-history-list {
        margin: 12px; padding: 0 8px 10px; overflow-y: auto; flex: 1;
        display: flex; flex-direction: column; gap: 8px;
      }
      .ops-history-empty {
        display: flex; align-items: center; justify-content: center; gap: 10px;
        padding: 36px 12px; color: #5a7568; font-size: 14px; text-align: center;
      }
      .ops-history-error { color: #a03030; font-weight: 700; }
      .ops-history-item {
        display: flex; align-items: center; justify-content: space-between; gap: 12px;
        flex-wrap: wrap; text-align: right; cursor: pointer;
        padding: 12px 14px; border-radius: 12px; border: 1.5px solid #dbe8e2;
        background: #fbfdfc; font-family: inherit; transition: border-color 0.15s, background 0.15s;
      }
      .ops-history-item:hover { border-color: #1b8354; background: #eef8f2; }
      .ops-history-item-main { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
      .ops-history-item-name { font-size: 14.5px; font-weight: 700; color: #12362a; }
      .ops-history-item-sub { font-size: 12px; color: #4c6a5d; direction: ltr; }
      .ops-history-item-meta { display: flex; flex-direction: column; align-items: flex-start; gap: 3px; }
      .ops-history-item-tpl {
        font-size: 11px; font-weight: 700; color: #0d5c3a;
        background: #e2f2e9; border-radius: 999px; padding: 2px 10px;
      }
      .ops-history-item-dates { font-size: 12px; color: #365a4c; direction: rtl; }
      .ops-history-item-time { font-size: 11px; color: #7d968a; }
      .ops-history-list::-webkit-scrollbar { width: 8px; }
      .ops-history-list::-webkit-scrollbar-thumb { background: #c4d8cf; border-radius: 8px; }
      .ops-history-list::-webkit-scrollbar-track { background: transparent; }

      /* ── Workspace (single column — no live preview) ── */
      .ops-workspace {
        padding: 24px clamp(14px, 3vw, 36px);
        max-width: 920px; margin: 0 auto;
      }
      .ops-main { min-width: 0; }

      /* ── Tabs ── */
      .ops-tabs {
        display: flex; gap: 8px; padding: 6px;
        background: #e9efec; border-radius: 14px; margin-bottom: 18px;
      }
      .ops-tab {
        flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 8px;
        padding: 11px 12px; border: none; border-radius: 10px;
        background: transparent; color: #475467;
        font-family: inherit; font-size: 14px; font-weight: 700; cursor: pointer;
        transition: background 0.15s, color 0.15s, box-shadow 0.15s;
      }
      .ops-tab:hover { color: #0d5c3a; }
      .ops-tab.active {
        background: #fff; color: #0d5c3a;
        box-shadow: 0 2px 8px rgba(16, 24, 40, 0.1);
      }

      .ops-tabpane {
        background: #fff; border: 1px solid #e4e9e6; border-radius: 16px;
        padding: clamp(16px, 2.5vw, 26px);
      }

      /* ── STEP 1: template picker (اختيار القالب) ── */
      .ops-tpl-section { margin-bottom: 22px; }
      .ops-tpl-head h3 {
        margin: 0 0 4px; font-size: 16.5px; color: #101828; font-weight: 800;
        display: flex; align-items: center; gap: 8px;
      }
      .ops-tpl-head p { margin: 0; font-size: 13px; color: #667085; line-height: 1.8; }
      .ops-tpl-stepnum {
        display: inline-flex; align-items: center; justify-content: center;
        width: 24px; height: 24px; border-radius: 50%;
        background: #0d5c3a; color: #fff; font-size: 13px; font-weight: 800;
        flex-shrink: 0;
      }
      .ops-tabs-label {
        display: flex; align-items: center; gap: 8px;
        margin: 0 0 10px; font-size: 15px; font-weight: 800; color: #101828;
      }
      .ops-tpl-grid {
        display: grid; grid-template-columns: repeat(auto-fill, minmax(215px, 1fr));
        gap: 14px; margin-top: 12px;
      }
      .ops-tpl-card {
        display: flex; flex-direction: column; gap: 0; text-align: right;
        padding: 10px; border: 2px solid #e4e9e6; border-radius: 14px;
        background: #fff; cursor: pointer; font-family: inherit;
        transition: border-color 0.15s, box-shadow 0.15s, transform 0.1s;
      }
      .ops-tpl-card:hover { border-color: #86c3a4; box-shadow: 0 4px 14px rgba(16, 24, 40, 0.08); }
      .ops-tpl-card:active { transform: scale(0.99); }
      .ops-tpl-card.selected {
        border-color: #1b8354;
        box-shadow: 0 0 0 3px rgba(27, 131, 84, 0.16), 0 6px 18px rgba(13, 92, 58, 0.14);
      }
      .ops-tpl-thumb {
        display: flex; justify-content: center; padding: 4px 4px 0;
      }
      .ops-tpl-thumb-frame {
        display: block; width: 186px; height: 263px; overflow: hidden;
        position: relative; border-radius: 6px; border: 1px solid #e0e6e2;
        background: #fff; direction: ltr; pointer-events: none;
      }
      /* 186 / 794 = 0.23426 — fixed mini scale of the real A4 sheet */
      .ops-tpl-thumb-scale {
        display: block; width: 794px; height: 1123px;
        transform: scale(0.23426); transform-origin: top left;
      }
      .ops-tpl-card-body {
        display: flex; flex-direction: column; gap: 4px; padding: 10px 6px 4px; min-width: 0;
      }
      .ops-tpl-card-name {
        display: flex; align-items: center; justify-content: space-between; gap: 8px;
        font-size: 14.5px; font-weight: 800; color: #101828;
      }
      .ops-tpl-card-check {
        display: none; align-items: center; justify-content: center;
        width: 20px; height: 20px; border-radius: 50%;
        background: #067647; color: #fff; font-size: 12px; font-weight: 800;
        flex-shrink: 0;
      }
      .ops-tpl-card.selected .ops-tpl-card-check { display: inline-flex; }
      .ops-tpl-card.selected .ops-tpl-card-name { color: #067647; }
      .ops-tpl-card-tag {
        font-size: 11.5px; font-weight: 700; color: #0d5c3a;
        background: #ecfdf3; border: 1px solid #abefc6; border-radius: 999px;
        padding: 2px 9px; align-self: flex-start;
      }
      .ops-tpl-card-desc {
        font-size: 11.5px; color: #667085; line-height: 1.7;
        display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .ops-review-tpl-chip {
        display: inline-flex; align-items: center; gap: 6px;
        padding: 7px 14px; border-radius: 999px;
        background: #ecfdf3; border: 1px solid #abefc6; color: #067647;
        font-size: 12.5px; font-weight: 800; white-space: nowrap;
      }

      /* ── Smart input tab ── */
      .ops-ai-intro h3 { margin: 0 0 6px; font-size: 16.5px; color: #101828; font-weight: 700; }
      .ops-ai-intro p { margin: 0 0 14px; font-size: 13.5px; color: #667085; line-height: 1.8; }
      .ops-ai-textarea {
        width: 100%; box-sizing: border-box; border: 1.5px solid #9da4ae; border-radius: 12px;
        padding: 14px; font-family: inherit; font-size: 14px; line-height: 2.1; color: #101828;
        resize: vertical; background: #fff; outline: none; transition: border-color 0.15s, box-shadow 0.15s;
      }
      .ops-ai-textarea:focus { border-color: #1b8354; box-shadow: 0 0 0 3px rgba(27,131,84,0.14); }

      .ops-smart-status {
        margin-top: 14px; padding: 12px 14px; border-radius: 12px;
        background: #f8faf9; border: 1px solid #e4e9e6;
      }
      .ops-smart-status-main { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
      .ops-smart-chip {
        display: inline-flex; align-items: center; gap: 6px;
        padding: 6px 12px; border-radius: 999px;
        background: #ecfdf3; border: 1px solid #abefc6; color: #067647;
        font-size: 12.5px; font-weight: 700;
      }
      .ops-smart-chip.ok { background: #067647; border-color: #067647; color: #fff; }
      .ops-smart-tags { display: inline-flex; gap: 6px; flex-wrap: wrap; }
      .ops-smart-tag {
        padding: 4px 10px; border-radius: 999px;
        background: #eef4f0; border: 1px solid #d5e5db; color: #0d5c3a;
        font-size: 11.5px; font-weight: 600;
      }
      .ops-smart-missing { margin: 8px 0 0; font-size: 12.5px; color: #b54708; font-weight: 600; }
      .ops-smart-clear { margin-top: 12px; }

      .ops-ai-notice {
        margin: 0 0 14px; padding: 10px 14px; border-radius: 10px;
        background: #ecfdf3; border: 1px solid #abefc6; color: #067647;
        font-size: 13px; font-weight: 600;
      }

      /* ── Form ── */
      .ops-group { border: none; margin: 0 0 20px; padding: 0; }
      .ops-group legend {
        font-size: 14.5px; font-weight: 800; color: #0d5c3a; margin-bottom: 12px;
        padding-bottom: 8px; border-bottom: 2px solid #e8f1ec; width: 100%;
      }
      .ops-grid {
        display: grid; grid-template-columns: 1fr;
        gap: 14px 16px;
      }
      @media (min-width: 640px) { .ops-grid { grid-template-columns: 1fr 1fr; } }
      .ops-field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
      .ops-field-label { font-size: 12.5px; font-weight: 700; color: #344054; }
      .ops-input {
        width: 100%; box-sizing: border-box; border: 1.5px solid #9da4ae; border-radius: 10px;
        padding: 10px 12px; font-family: inherit; font-size: 14px; color: #101828;
        background: #fff; outline: none; transition: border-color 0.15s, box-shadow 0.15s;
      }
      .ops-input:focus { border-color: #1b8354; box-shadow: 0 0 0 3px rgba(27,131,84,0.14); }
      .ops-field-hint { font-size: 11.5px; color: #1b8354; font-weight: 600; }
      .ops-field-error { font-size: 11.5px; color: #d92d20; font-weight: 600; }
      .ops-form-error {
        margin: 0 0 14px; padding: 10px 14px; border-radius: 10px;
        background: #fef3f2; border: 1px solid #fecdca; color: #b42318; font-size: 13px; font-weight: 600;
      }
      .ops-inline { display: flex; gap: 8px; align-items: stretch; }
      .ops-inline .ops-input { flex: 1; min-width: 0; }
      .ops-dir-chips {
        display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-top: 6px;
        max-height: 96px; overflow-y: auto;
      }
      .ops-dir-chips-label { font-size: 11px; color: #667085; font-weight: 600; }
      .ops-chip {
        border: 1px solid #d0d5dd; background: #f9fafb; color: #344054;
        border-radius: 999px; padding: 4px 12px; font-family: inherit; font-size: 12px;
        font-weight: 600; cursor: pointer; transition: all 0.15s;
      }
      .ops-chip:hover { border-color: #129153; color: #0d5c3a; background: #e8f5ee; }
      .ops-chip-ai { border-color: #f2c88a; background: #fdf7ec; color: #8a5a12; }
      .ops-chip-ai:hover { background: #f9ecd2; }
      .ops-dir-ai { padding-top: 2px; border-top: 1px dashed #eab308; padding-top: 6px; }
      .ops-logo-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
      .ops-logo-preview { height: 52px; width: auto; max-width: 150px; object-fit: contain; border: 1px solid #d0d5dd; border-radius: 8px; padding: 3px; background: #fff; }
      .ops-logo-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 14px; }
      .ops-logo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; max-height: 55vh; overflow-y: auto; padding: 2px; }
      .ops-logo-card {
        display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 10px;
        background: #f9fafb; border: 2px solid #e4e7ec; border-radius: 12px; cursor: pointer; transition: all 0.15s;
      }
      .ops-logo-card:hover { border-color: #129153; background: #e8f5ee; }
      .ops-logo-card-active { border-color: #129153; background: #e8f5ee; }
      .ops-logo-card img { width: 100%; height: 74px; object-fit: contain; }
      .ops-logo-card-region { font-size: 11px; color: #667085; font-weight: 600; }
      .ops-mini-btn {
        flex-shrink: 0; border: none; border-radius: 10px; padding: 0 16px;
        background: #e8f5ee; color: #0d5c3a; font-family: inherit; font-size: 13px; font-weight: 700;
        cursor: pointer; transition: background 0.15s;
      }
      .ops-mini-btn:hover { background: #d5ebdf; }
      .ops-toggles { display: flex; flex-direction: column; gap: 10px; }
      .ops-toggle {
        display: flex; align-items: center; gap: 10px; font-size: 13.5px; color: #344054;
        cursor: pointer; font-weight: 600;
      }
      .ops-toggle input { width: 17px; height: 17px; accent-color: #1b8354; cursor: pointer; }

      /* ── Buttons ── */
      .ops-btn {
        display: inline-flex; align-items: center; justify-content: center; gap: 8px;
        padding: 12px 20px; border-radius: 11px; border: none;
        font-family: inherit; font-size: 14.5px; font-weight: 700; cursor: pointer;
        transition: background 0.15s, transform 0.1s, border-color 0.15s;
      }
      .ops-btn:active:not(:disabled) { transform: scale(0.985); }
      .ops-btn:disabled { opacity: 0.65; cursor: not-allowed; }
      .ops-btn-primary { background: #1b8354; color: #fff; }
      .ops-btn-primary:hover:not(:disabled) { background: #177046; }
      .ops-btn-ghost {
        background: #fff; color: #0d5c3a; border: 1.5px solid #bfd9cc;
      }
      .ops-btn-ghost:hover:not(:disabled) { background: #f3faf6; border-color: #1b8354; }
      .ops-form-actions { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 6px; }
      .ops-form-actions .ops-btn-primary { flex: 1; min-width: 220px; }

      .ops-spinner {
        width: 16px; height: 16px; border-radius: 50%;
        border: 2px solid rgba(255,255,255,0.4); border-top-color: #fff;
        animation: opsSpin 0.7s linear infinite; display: inline-block;
      }
      @keyframes opsSpin { to { transform: rotate(360deg); } }

      .ops-preview-frame {
        border-radius: 12px; overflow: hidden;
        box-shadow: 0 8px 28px rgba(16, 24, 40, 0.12);
        background: #fff;
      }

      .doc-preview-frame { width: 100%; overflow: hidden; direction: ltr; }
      .doc-preview-scale {
        width: 794px; transform-origin: top left;
        position: relative;
      }

      .ops-issued-link {
        background: #f8faf9; border: 1px dashed #bfd9cc; border-radius: 10px;
        padding: 10px 12px; font-size: 12px; word-break: break-all;
      }
      .ops-issued-link a { color: #1b8354; font-weight: 700; text-decoration: none; }
      .ops-issued-link a:hover { text-decoration: underline; }

      /* ── Review page (صفحة المعاينة والتعديل) — Word-like ── */
      .ops-review {
        padding: 20px clamp(14px, 3vw, 36px) 40px;
        max-width: 1500px; margin: 0 auto;
      }
      .ops-review-toolbar {
        position: sticky; top: 78px; z-index: 40;
        display: flex; align-items: center; justify-content: space-between; gap: 14px;
        flex-wrap: wrap;
        background: #fff; border: 1px solid #e4e9e6; border-radius: 14px;
        padding: 12px 16px; margin-bottom: 18px;
        box-shadow: 0 4px 16px rgba(16, 24, 40, 0.06);
      }
      .ops-review-heading { display: flex; align-items: center; gap: 12px; min-width: 0; }
      .ops-review-heading-icon {
        width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0;
        background: #e8f5ee; color: #0d5c3a;
        display: flex; align-items: center; justify-content: center;
      }
      .ops-review-heading h2 { margin: 0; font-size: 16.5px; font-weight: 800; color: #101828; }
      .ops-save-state { display: block; margin-top: 2px; font-size: 11.5px; font-weight: 700; color: #667085; }
      .ops-save-state--saving { color: #b54708; }
      .ops-save-state--saved { color: #067647; }
      .ops-save-state--error { color: #b42318; }
      .ops-review-actions { display: flex; gap: 10px; flex-wrap: wrap; }
      .ops-review-actions .ops-btn { padding: 11px 18px; font-size: 13.5px; }

      .ops-review-grid {
        display: grid; grid-template-columns: 1fr; gap: 22px; align-items: start;
      }
      /* Grid items must be allowed to shrink below the 794px sheet,
         otherwise the single-column (mobile) track expands and overflows. */
      .ops-review-grid > * { min-width: 0; }
      @media (min-width: 1100px) {
        .ops-review-grid { grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr); }
        .ops-review-doc { position: sticky; top: 160px; }
      }
      /* On mobile the document comes first, the edit panel below */
      @media (max-width: 1099px) {
        .ops-review-doc { order: -1; }
      }

      .ops-review-edit {
        background: #fff; border: 1px solid #e4e9e6; border-radius: 16px;
        padding: clamp(16px, 2.5vw, 24px);
      }
      .ops-review-edit .ops-issued-link { margin-top: 4px; }
      .ops-review-hint {
        margin: 10px 4px 0; font-size: 12px; color: #667085; line-height: 1.8;
        text-align: center;
      }

      @media (max-width: 640px) {
        .ops-review-toolbar { top: 70px; }
        .ops-review-actions { width: 100%; }
        .ops-review-actions .ops-btn-primary { flex: 1; }
      }
    `}</style>
  );
}
