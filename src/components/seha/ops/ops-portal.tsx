"use client";

/**
 * OpsPortal — بوابة إصدار الإجازات المرضية (المشغل الخاص).
 *
 * Unlocked from the site logo + secret code. Ports the previous issuing
 * system's workflow:
 *   1. Smart extraction tab — paste a WhatsApp secretary message or a report
 *      text, or upload a photo of the paper; the platform AI extracts every
 *      field and auto-fills the form.
 *   2. Form tab — full bilingual document data with live auto-computation
 *      (service number, Umm-al-Qura Hijri dates, inclusive duration).
 *   3. Live A4 preview that fills automatically as data is typed.
 *   4. Issue → saved to the public inquiry database → print/Save-as-PDF
 *      through the browser's vector engine (selectable Arabic text).
 *   5. The verification link on the report auto-fills AND auto-runs the
 *      public inquiry for the client.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SickLeaveDocument } from "./sick-leave-document";
import {
  computeDurationDays,
  generateServiceNumber,
  toHijri,
  reportDateString,
  reportTimeString,
  type ExtractionResult,
  type PortalSickLeaveRecord,
} from "@/lib/seha/ops";

const SESSION_KEY = "seha_ops_code";

export function getStoredOpsCode(): string | null {
  try {
    return sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function storeOpsCode(code: string) {
  try {
    sessionStorage.setItem(SESSION_KEY, code);
  } catch {
    /* private mode — ignore */
  }
}

export function clearOpsCode() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Form model
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
  addQr: boolean;
  showLicense: boolean;
};

const todayIso = () => new Date().toISOString().slice(0, 10);

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
  addQr: false,
  showLicense: true,
});

const NATIONALITY_EN: Record<string, string> = {
  "السعودية": "Saudi Arabia",
  "سعودي": "Saudi Arabia",
  "مصري": "Egypt",
  "يمني": "Yemen",
  "سوداني": "Sudan",
  "هندي": "India",
  "باكستاني": "Pakistan",
  "بنغلاديشي": "Bangladesh",
  "سوري": "Syria",
  "أردني": "Jordan",
  "فلسطيني": "Palestine",
  "إثيوبي": "Ethiopia",
  "اثيوبي": "Ethiopia",
  "نيجيري": "Nigeria",
  "كيني": "Kenya",
  "أوغندي": "Uganda",
  "اوجندي": "Uganda",
  "سريلانكي": "Sri Lanka",
  "نيبالي": "Nepal",
  "فلبيني": "Philippines",
  "إندونيسي": "Indonesia",
  "اندونيسي": "Indonesia",
  "بورمي": "Myanmar",
  "صومالي": "Somalia",
  "تشادي": "Chad",
  "إريتري": "Eritrea",
  "اريتري": "Eritrea",
  "أفغاني": "Afghanistan",
  "افغاني": "Afghanistan",
  "لبناني": "Lebanon",
  "عماني": "Oman",
  "بحريني": "Bahrain",
  "كويتي": "Kuwait",
  "قطري": "Qatar",
  "إماراتي": "UAE",
  "اماراتي": "UAE",
  "تونسي": "Tunisia",
  "جزائري": "Algeria",
  "مغربي": "Morocco",
  "موريتاني": "Mauritania",
  "جيبوتي": "Djibouti",
  "تنزاني": "Tanzania",
  "غاني": "Ghana",
  "مالي": "Mali",
  "نيجيري": "Nigeria",
  "فيتنامي": "Vietnam",
  "تايلندي": "Thailand",
  "ماليزي": "Malaysia",
  "تركي": "Turkey",
  "أذربيجاني": "Azerbaijan",
  "أوزبكي": "Uzbekistan",
  "قيرغيزي": "Kyrgyzstan",
  "طاجيكي": "Tajikistan",
  "كازاخستاني": "Kazakhstan",
};

/** Apply the AI extraction result onto the form (only non-empty fields). */
function applyExtraction(form: FormState, ex: Partial<ExtractionResult>): FormState {
  const next = { ...form };
  const set = (v: string | undefined, apply: (val: string) => void) => {
    if (v && v.trim()) apply(v.trim());
  };
  set(ex.serviceNum || ex.leaveId, (v) => (next.serviceCode = v.toUpperCase()));
  set(ex.nationalID, (v) => (next.patientId = v.replace(/\D/g, "")));
  set(ex.phone, (v) => (next.patientPhone = v));
  set(ex.name, (v) => (next.patientNameEn = v));
  set(ex.nameArabic, (v) => (next.patientName = v));
  set(ex.admissionDate, (v) => (next.dateFromIso = v));
  set(ex.dischargeDate, (v) => (next.dateToIso = v));
  set(ex.issueDate, (v) => (next.sickLeaveDateIso = v));
  set(ex.doctorName, (v) => (next.doctorNameEn = v));
  set(ex.doctorNameArabic, (v) => (next.doctorName = v));
  set(ex.physicianPosition, (v) => (next.doctorJobTitleEn = v));
  set(ex.physicianPositionArabic, (v) => (next.doctorJobTitle = v));
  set(ex.hospitalNameEnglish, (v) => (next.hospitalEn = v));
  set(ex.hospitalNameArabic, (v) => (next.hospital = v));
  set(ex.licenseNumber, (v) => (next.licenseNumber = v));
  set(ex.employer, (v) => (next.employerAr = v));
  set(ex.nationality, (v) => {
    next.nationalityAr = v;
    if (NATIONALITY_EN[v.trim()]) next.nationalityEn = NATIONALITY_EN[v.trim()];
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

// ───────────────────────────────────────────────────────────────────────────
// The portal
// ───────────────────────────────────────────────────────────────────────────

export function OpsPortal({
  onExit,
  onSessionExpired,
}: {
  onExit: () => void;
  onSessionExpired: () => void;
}) {
  const [tab, setTab] = useState<"ai" | "form">("ai");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [issuing, setIssuing] = useState(false);
  const [issued, setIssued] = useState<PortalSickLeaveRecord | null>(null);
  const [copied, setCopied] = useState(false);

  // AI tab state
  const [aiText, setAiText] = useState("");
  const [aiImage, setAiImage] = useState<{ base64: string; mime: string; name: string } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiNotice, setAiNotice] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live-computed values (same algorithms the server applies on save)
  const liveDuration = useMemo(
    () => computeDurationDays(form.dateFromIso, form.dateToIso),
    [form.dateFromIso, form.dateToIso]
  );
  const liveFromHijri = useMemo(() => toHijri(form.dateFromIso), [form.dateFromIso]);
  const liveToHijri = useMemo(() => toHijri(form.dateToIso), [form.dateToIso]);

  // The document data used for the live preview (before issuing) and print
  // (after issuing, the server-stamped record).
  const previewData: PortalSickLeaveRecord = useMemo(
    () => ({
      id: issued?.id ?? "preview",
      serviceCode: form.serviceCode || "PSL261________",
      patientId: form.patientId || "__________",
      patientName: form.patientName || "—",
      patientNameEn: form.patientNameEn || "—",
      patientPhone: form.patientPhone,
      sickLeaveDateIso: form.sickLeaveDateIso,
      dateFromIso: form.dateFromIso,
      dateToIso: form.dateToIso,
      doctorName: form.doctorName || "—",
      doctorNameEn: form.doctorNameEn || "—",
      doctorJobTitle: form.doctorJobTitle,
      doctorJobTitleEn: form.doctorJobTitleEn,
      hospital: form.hospital,
      hospitalEn: form.hospitalEn,
      licenseNumber: form.licenseNumber,
      employerAr: form.employerAr,
      nationalityAr: form.nationalityAr,
      nationalityEn: form.nationalityEn,
      addQr: form.addQr,
      showLicense: form.showLicense,
      dateFromHijri: issued?.dateFromHijri ?? liveFromHijri,
      dateToHijri: issued?.dateToHijri ?? liveToHijri,
      durationDays: issued?.durationDays ?? liveDuration,
      reportTime: issued?.reportTime ?? reportTimeString(),
      reportDate: issued?.reportDate ?? reportDateString(),
      verificationCode: issued?.verificationCode ?? "VRF-PREVIEW",
      createdAt: issued?.createdAt ?? new Date().toISOString(),
    }),
    [form, issued, liveDuration, liveFromHijri, liveToHijri]
  );

  const printData = issued ?? previewData;

  // ── Print plumbing ──────────────────────────────────────────────────────
  useEffect(() => {
    const after = () => document.body.classList.remove("ops-printing");
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("afterprint", after);
      document.body.classList.remove("ops-printing");
    };
  }, []);

  const printDocument = useCallback(() => {
    document.body.classList.add("ops-printing");
    // Let the browser apply the print layout, then open the dialog.
    requestAnimationFrame(() => {
      setTimeout(() => window.print(), 60);
    });
  }, []);

  const verificationLink = useMemo(() => {
    if (typeof window === "undefined" || !issued) return "";
    return `${window.location.origin}/#/inquiries/slenquiry?service_num=${encodeURIComponent(issued.serviceCode)}&national_id=${encodeURIComponent(issued.patientId)}`;
  }, [issued]);

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

  // ── AI extraction ────────────────────────────────────────────────────────
  const pickImage = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setAiError("الملف المرفق ليس صورة");
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      setAiError("حجم الصورة كبير جدًا (الحد 6 ميجابايت)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const comma = result.indexOf(",");
      setAiImage({
        base64: result.slice(comma + 1),
        mime: file.type || "image/jpeg",
        name: file.name,
      });
      setAiError("");
    };
    reader.readAsDataURL(file);
  };

  const runExtraction = async () => {
    if (aiLoading) return;
    if (!aiText.trim() && !aiImage) {
      setAiError("ألصق نصًا أو ارفع صورة أولًا");
      return;
    }
    setAiLoading(true);
    setAiError("");
    setAiNotice("");
    try {
      const code = getStoredOpsCode() ?? "";
      const res = await fetch("/api/ops/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-access-code": code },
        body: JSON.stringify(
          aiImage
            ? { imageBase64: aiImage.base64, imageMime: aiImage.mime }
            : { text: aiText }
        ),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.ok) {
        if (res.status === 403) {
          onSessionExpired();
          return;
        }
        setAiError(body?.message ?? "تعذّر الاستخراج، حاول مرة أخرى");
        return;
      }
      const fields = body.data as Partial<ExtractionResult>;
      setForm((f) => applyExtraction(f, fields));
      setAiNotice(`تم تعبئة ${body.filled} حقلًا تلقائيًا — راجع النموذج وأكمل الناقص`);
      setTab("form");
    } catch {
      setAiError("تعذّر الاتصال بالخدمة");
    } finally {
      setAiLoading(false);
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
      setIssued(body.data as PortalSickLeaveRecord);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setErrors({ submit: "تعذّر الاتصال بالخدمة" });
    } finally {
      setIssuing(false);
    }
  };

  const resetAll = () => {
    setForm(emptyForm());
    setIssued(null);
    setErrors({});
    setAiText("");
    setAiImage(null);
    setAiNotice("");
    setAiError("");
    setTab("ai");
  };

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="ops-portal" dir="rtl">
      {/* Print sheet — lives at body level, only visible while printing */}
      {typeof document !== "undefined" &&
        createPortal(
          <div id="ops-print-root" aria-hidden="true">
            <SickLeaveDocument data={printData} />
          </div>,
          document.body
        )}

      {/* Portal top bar */}
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
            <p>منطقة خاصة بالمشغلين — إصدار، طباعة، وتحقّق فوري للعملاء</p>
          </div>
        </div>
        <button type="button" className="ops-exit-btn" onClick={onExit}>
          خروج آمن
        </button>
      </div>

      {/* ─────────────── Success screen (after issuing) ─────────────── */}
      {issued ? (
        <div className="ops-issued">
          <div className="ops-issued-panel">
            <div className="ops-issued-check" aria-hidden="true">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2>تم إصدار الإجازة المرضية بنجاح</h2>
            <p className="ops-issued-sub">
              رمز الخدمة <strong dir="ltr">{issued.serviceCode}</strong> محفوظ الآن في قاعدة الاستعلام العامة —
              أي عميل يفتح رابط التحقق من الملف ستر له بياناته فورًا.
            </p>

            <div className="ops-issued-actions">
              <button type="button" className="ops-btn ops-btn-primary" onClick={printDocument}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M6 9V2h12v7" />
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  <rect x="6" y="14" width="12" height="8" />
                </svg>
                طباعة / حفظ PDF
              </button>
              <button type="button" className="ops-btn ops-btn-ghost" onClick={copyLink}>
                {copied ? "تم نسخ الرابط ✓" : "نسخ رابط التحقق"}
              </button>
              <button type="button" className="ops-btn ops-btn-ghost" onClick={resetAll}>
                إجازة جديدة
              </button>
            </div>

            <div className="ops-issued-link" dir="ltr">
              <a href={verificationLink} target="_blank" rel="noopener noreferrer">
                {verificationLink}
              </a>
            </div>
          </div>

          <div className="ops-preview-frame ops-preview-frame--lg">
            <DocumentPreview data={printData} />
          </div>
        </div>
      ) : (
        /* ─────────────── Workspace: tabs + form + live preview ─────────────── */
        <div className="ops-workspace">
          <div className="ops-main">
            {/* Tabs */}
            <div className="ops-tabs" role="tablist" aria-label="أدوات الإصدار">
              <button
                type="button"
                role="tab"
                aria-selected={tab === "ai"}
                className={`ops-tab${tab === "ai" ? " active" : ""}`}
                onClick={() => setTab("ai")}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3z" />
                </svg>
                الاستخراج الذكي
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

            {/* AI extraction tab */}
            {tab === "ai" && (
              <div className="ops-tabpane">
                <div className="ops-ai-intro">
                  <h3>استخراج البيانات تلقائيًا</h3>
                  <p>
                    ألصق رسالة السكرتارية (واتساب) أو نص التقرير، أو ارفع صورة الورقة —
                    والذكاء الاصطناعي يعبّئ النموذج كاملًا خلال ثوانٍ.
                  </p>
                </div>

                <textarea
                  className="ops-ai-textarea"
                  placeholder={`مثال:\nالاسم: محمد عبدالله السالم\nرقم الهوية: 1023456781\nالجنسية: سعودي\nجهة العمل: جامعة طيبة\nتاريخ الاجازه: 2026-11-20`}
                  value={aiText}
                  dir="rtl"
                  rows={9}
                  onChange={(e) => {
                    setAiText(e.target.value);
                    if (aiError) setAiError("");
                  }}
                />

                <div className="ops-ai-divider">
                  <span>أو</span>
                </div>

                <div className="ops-ai-upload">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => pickImage(e.target.files?.[0] ?? null)}
                  />
                  <button
                    type="button"
                    className="ops-btn ops-btn-ghost"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    {aiImage ? "تغيير الصورة" : "رفع صورة الورقة"}
                  </button>
                  {aiImage && (
                    <span className="ops-ai-file">
                      <img src={`data:${aiImage.mime};base64,${aiImage.base64}`} alt="معاينة الصورة المرفوعة" />
                      {aiImage.name}
                      <button
                        type="button"
                        aria-label="إزالة الصورة"
                        onClick={() => setAiImage(null)}
                      >
                        ×
                      </button>
                    </span>
                  )}
                </div>

                {aiError && <p className="ops-form-error" role="alert">{aiError}</p>}
                {aiNotice && <p className="ops-ai-notice" role="status">{aiNotice}</p>}

                <button
                  type="button"
                  className="ops-btn ops-btn-primary ops-ai-run"
                  onClick={runExtraction}
                  disabled={aiLoading}
                >
                  {aiLoading ? (
                    <>
                      <span className="ops-spinner ops-spinner--dark" aria-hidden="true" />
                      جارٍ الاستخراج…
                    </>
                  ) : (
                    <>
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3z" />
                      </svg>
                      استخراج وتعبئة النموذج
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Form tab */}
            {tab === "form" && (
              <div className="ops-tabpane">
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
                    <Field label="اسم الطبيب (عربي) *" error={errors.doctorName}>
                      <input
                        className={inputCls}
                        value={form.doctorName}
                        onChange={(e) => set("doctorName", e.target.value)}
                        placeholder="د. خالد بن سعد الحربي"
                      />
                    </Field>
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
                    <Field label="المنشأة الصحية (عربي)">
                      <input
                        className={inputCls}
                        value={form.hospital}
                        onChange={(e) => set("hospital", e.target.value)}
                      />
                    </Field>
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

          {/* Live preview (desktop) */}
          <aside className="ops-preview-side" aria-label="معاينة حية للتقرير">
            <div className="ops-preview-head">
              <span className="ops-live-dot" aria-hidden="true" />
              معاينة حية — تتحدث تلقائيًا أثناء الكتابة
            </div>
            <div className="ops-preview-frame">
              <DocumentPreview data={previewData} />
            </div>
          </aside>
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
        <SickLeaveDocument data={data} />
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

      /* ── Workspace grid ── */
      .ops-workspace {
        display: grid; grid-template-columns: minmax(0, 1fr);
        gap: 24px; padding: 24px clamp(14px, 3vw, 36px);
        max-width: 1500px; margin: 0 auto;
      }
      @media (min-width: 1150px) {
        .ops-workspace { grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr); align-items: start; }
        .ops-preview-side { position: sticky; top: 96px; }
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

      /* ── AI tab ── */
      .ops-ai-intro h3 { margin: 0 0 6px; font-size: 16.5px; color: #101828; font-weight: 700; }
      .ops-ai-intro p { margin: 0 0 14px; font-size: 13.5px; color: #667085; line-height: 1.8; }
      .ops-ai-textarea {
        width: 100%; box-sizing: border-box; border: 1.5px solid #9da4ae; border-radius: 12px;
        padding: 14px; font-family: inherit; font-size: 14px; line-height: 2; color: #101828;
        resize: vertical; background: #fff; outline: none; transition: border-color 0.15s, box-shadow 0.15s;
      }
      .ops-ai-textarea:focus { border-color: #1b8354; box-shadow: 0 0 0 3px rgba(27,131,84,0.14); }
      .ops-ai-divider {
        display: flex; align-items: center; gap: 12px; margin: 16px 0;
        color: #98a2b3; font-size: 12.5px; font-weight: 600;
      }
      .ops-ai-divider::before, .ops-ai-divider::after {
        content: ""; height: 1px; background: #e4e9ec; flex: 1;
      }
      .ops-ai-upload { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
      .ops-ai-file {
        display: inline-flex; align-items: center; gap: 8px;
        background: #f3f8f5; border: 1px solid #cfe5d8; border-radius: 10px;
        padding: 5px 10px; font-size: 12.5px; color: #0d5c3a; font-weight: 600;
      }
      .ops-ai-file img { width: 34px; height: 34px; object-fit: cover; border-radius: 6px; }
      .ops-ai-file button {
        border: none; background: #dcefe4; color: #0d5c3a; width: 20px; height: 20px;
        border-radius: 50%; cursor: pointer; font-size: 14px; line-height: 1;
      }
      .ops-ai-run { margin-top: 18px; width: 100%; }
      .ops-ai-notice {
        margin: 12px 0 0; padding: 10px 14px; border-radius: 10px;
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
      .ops-spinner--dark { border-color: rgba(13,92,58,0.25); border-top-color: #0d5c3a; }
      @keyframes opsSpin { to { transform: rotate(360deg); } }

      /* ── Live preview panel ── */
      .ops-preview-side { min-width: 0; }
      .ops-preview-head {
        display: flex; align-items: center; gap: 8px;
        font-size: 13px; font-weight: 700; color: #344054;
        padding: 10px 4px;
      }
      .ops-live-dot {
        width: 9px; height: 9px; border-radius: 50%; background: #12b76a;
        box-shadow: 0 0 0 0 rgba(18, 183, 106, 0.5);
        animation: opsPulse 1.8s infinite;
      }
      @keyframes opsPulse {
        0% { box-shadow: 0 0 0 0 rgba(18, 183, 106, 0.45); }
        70% { box-shadow: 0 0 0 9px rgba(18, 183, 106, 0); }
        100% { box-shadow: 0 0 0 0 rgba(18, 183, 106, 0); }
      }
      .ops-preview-frame {
        border-radius: 12px; overflow: hidden;
        box-shadow: 0 8px 28px rgba(16, 24, 40, 0.12);
        background: #fff;
      }
      .ops-preview-frame--lg { max-width: 560px; margin: 0 auto; }

      .doc-preview-frame { width: 100%; overflow: hidden; }
      .doc-preview-scale {
        width: 794px; transform-origin: top left;
        position: relative;
      }

      /* ── Issued success ── */
      .ops-issued {
        display: grid; grid-template-columns: 1fr; gap: 24px;
        padding: 28px clamp(14px, 3vw, 36px);
        max-width: 1100px; margin: 0 auto;
      }
      @media (min-width: 1100px) {
        .ops-issued { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); align-items: start; }
      }
      .ops-issued-panel {
        background: #fff; border: 1px solid #e4e9e6; border-radius: 16px;
        padding: clamp(20px, 3vw, 30px); text-align: center;
      }
      .ops-issued-check {
        width: 64px; height: 64px; margin: 0 auto 16px; border-radius: 50%;
        background: linear-gradient(135deg, #12b76a, #1b8354); color: #fff;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 10px 24px rgba(18, 183, 106, 0.35);
      }
      .ops-issued-panel h2 { margin: 0 0 10px; font-size: 20px; color: #101828; }
      .ops-issued-sub { margin: 0 0 20px; font-size: 13.5px; color: #667085; line-height: 1.9; }
      .ops-issued-actions {
        display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin-bottom: 18px;
      }
      .ops-issued-link {
        background: #f8faf9; border: 1px dashed #bfd9cc; border-radius: 10px;
        padding: 10px 12px; font-size: 12px; word-break: break-all;
      }
      .ops-issued-link a { color: #1b8354; font-weight: 700; text-decoration: none; }
      .ops-issued-link a:hover { text-decoration: underline; }

      /* ── Print: hide the whole app, show only the A4 sheet ── */
      #ops-print-root { display: none; }
      @media print {
        @page { size: A4; margin: 0; }
        body.ops-printing > *:not(#ops-print-root) { display: none !important; }
        body.ops-printing #ops-print-root { display: block !important; }
        body.ops-printing #ops-print-root .sl-doc {
          width: 794px; height: 1123px; box-shadow: none;
        }
      }
    `}</style>
  );
}
