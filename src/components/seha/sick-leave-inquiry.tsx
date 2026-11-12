"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SickLeaveResult } from "@/lib/seha/domain";
import { STATUS_LABELS } from "@/lib/seha/domain";

/* -------------------------------------------------------------------------
 * Icons — exact glyphs from the extracted page
 * ---------------------------------------------------------------------- */

/** Search icon — the exact 18×18 glyph inside the reference submit button. */
function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

/** Spinner — shown inside the button while the request is in flight. */
function Spinner() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="fa-spin">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.6" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

/* -------------------------------------------------------------------------
 * Validation — identical contract to the extracted page:
 *   serial: non-empty (≥ 4 chars) · identity: exactly 10 numeric digits
 * ---------------------------------------------------------------------- */
const SERIAL_ERROR = "يرجى إدخال رمز الخدمة بشكل صحيح (مثال: GSL-2026-88412).";
const IDENTITY_ERROR = "يرجى إدخال رقم هوية أو إقامة مكون من 10 أرقام.";

type FieldErrors = { serial?: string; identity?: string };

/* -------------------------------------------------------------------------
 * Sick leave enquiry — exact port of the extracted form flow:
 *   per-field inline errors → loading (spinner) → result box | لا يوجد نتائج
 * Senior hardening kept on top: stale-response abort, aria-live,
 * no double submit, rate-limit friendly error surface.
 * ---------------------------------------------------------------------- */
export function SickLeaveInquiry() {
  const [serial, setSerial] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [alertMessage, setAlertMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SickLeaveResult | null>(null);
  const [searched, setSearched] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const serialRef = useRef<HTMLInputElement | null>(null);

  // Abort in-flight request on unmount.
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const submit = useCallback(() => {
    if (loading) return;

    setResult(null);
    setAlertMessage("");
    setSearched(false);

    // ---- validation (exact messages from the reference) ----------------
    const serialVal = serial.trim();
    const identityVal = idNumber.trim();
    const nextErrors: FieldErrors = {};
    if (serialVal.length < 4) nextErrors.serial = SERIAL_ERROR;
    if (!/^\d{10}$/.test(identityVal)) nextErrors.identity = IDENTITY_ERROR;
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});

    // ---- request --------------------------------------------------------
    setLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;

    const params = new URLSearchParams({
      serviceCode: serialVal,
      patientId: identityVal,
    });

    fetch(`/api/inquiries/sick-leave?${params.toString()}`, {
      method: "GET",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    })
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!body) throw new Error("bad-json");
        return body;
      })
      .then((body) => {
        setLoading(false);
        setSearched(true);
        if (body.ok) {
          setResult(body.data as SickLeaveResult);
          return;
        }
        // Executed query with no match → identical to reference "لا يوجد نتائج".
        if (body.error === "NOT_FOUND") {
          setResult(null);
          return;
        }
        if (body.error === "SERVER") {
          setResult(null);
          setAlertMessage("خطأ في الاستعلام");
          return;
        }
        // Validation / rate-limit → surface the server message.
        setSearched(false);
        setAlertMessage(body.message ?? "خطأ في الاستعلام");
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setLoading(false);
        setSearched(true);
        setResult(null);
        setAlertMessage("خطأ في الاستعلام");
      });
  }, [serial, idNumber, loading]);

  /** استعلام جديد ↺ — reset to a fresh form (exact reference behavior). */
  const newRequest = useCallback(() => {
    abortRef.current?.abort();
    setErrors({});
    setAlertMessage("");
    setSerial("");
    setIdNumber("");
    setResult(null);
    setSearched(false);
    setLoading(false);
    serialRef.current?.focus();
  }, []);

  const statusText = result
    ? result.status === "ACTIVE"
      ? "معتمدة - متاحة للطباعة عبر تطبيق صحتي"
      : (STATUS_LABELS[result.status] ?? result.status)
    : "";

  return (
    <form
      className="sl-inquiry__card"
      id="slInquiryForm"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <h2 className="sl-inquiry__card-title">الاستعلام عن إجازة مرضية</h2>

      {/* الحقل الأول: رمز الخدمة */}
      <div className={`sl-field${errors.serial ? " has-error" : ""}`} id="serialFieldGroup">
        <label htmlFor="sl-serial">رمز الخدمة</label>
        <input
          id="sl-serial"
          ref={serialRef}
          className="sl-input"
          type="text"
          maxLength={20}
          placeholder="أدخل رمز الخدمة"
          autoComplete="off"
          value={serial}
          disabled={loading}
          aria-invalid={errors.serial ? true : undefined}
          onChange={(e) => {
            setSerial(e.target.value);
            if (errors.serial) setErrors((p) => ({ ...p, serial: undefined }));
          }}
        />
        <span className="sl-field-error" id="serialError">
          {errors.serial ?? SERIAL_ERROR}
        </span>
      </div>

      {/* الحقل الثاني: رقم الهوية / الإقامة */}
      <div className={`sl-field${errors.identity ? " has-error" : ""}`} id="identityFieldGroup">
        <label htmlFor="sl-identity">رقم الهوية / الإقامة</label>
        <input
          id="sl-identity"
          className="sl-input"
          type="text"
          maxLength={10}
          placeholder="أدخل رقم الهوية / الإقامة"
          autoComplete="off"
          inputMode="numeric"
          value={idNumber}
          disabled={loading}
          aria-invalid={errors.identity ? true : undefined}
          onChange={(e) => {
            setIdNumber(e.target.value.replace(/[^\d]/g, "").slice(0, 10));
            if (errors.identity) setErrors((p) => ({ ...p, identity: undefined }));
          }}
        />
        <span className="sl-field-error" id="identityError">
          {errors.identity ?? IDENTITY_ERROR}
        </span>
      </div>

      {/* زر الاستعلام الرئيسي */}
      <div className="sl-actions">
        <button
          className="sl-btn sl-btn--primary"
          type="submit"
          id="submitInquiryBtn"
          disabled={loading}
          aria-busy={loading}
        >
          {loading ? <Spinner /> : <SearchIcon />}
          <span>استعلام</span>
        </button>
      </div>

      {/* منطقة عرض النتيجة (aria-live لقارئات الشاشة — تحسين إتاحة) */}
      <div aria-live="polite" aria-atomic="true">
        {alertMessage && (
          <div className="sl-alert" style={{ marginTop: 12 }} role="alert">
            {alertMessage}
          </div>
        )}

        {result && (
          <div className="sl-result-box show" id="inquiryResultBox">
            <div className="sl-result-header">
              <span>بيانات الإجازة المرضية المستعلم عنها</span>
              <button type="button" className="sl-result-reset" id="resetInquiryBtn" onClick={newRequest}>
                استعلام جديد ↺
              </button>
            </div>
            <div className="sl-result-grid">
              <div className="sl-result-item">
                <span>رمز الخدمة</span>
                <strong>{result.serviceCode}</strong>
              </div>
              <div className="sl-result-item">
                <span>رقم الهوية / الإقامة</span>
                <strong dir="ltr">{result.patientId}</strong>
              </div>
              <div className="sl-result-item">
                <span>حالة الطلب</span>
                <strong style={{ color: "#1B8354" }}>{statusText}</strong>
              </div>
              <div className="sl-result-item">
                <span>الاسم</span>
                <strong>{result.patientName}</strong>
              </div>
              {result.companionName && (
                <div className="sl-result-item">
                  <span>اسم المرافق</span>
                  <strong>{result.companionName}</strong>
                </div>
              )}
              {result.relationshipLabel && (
                <div className="sl-result-item">
                  <span>صلة القرابة</span>
                  <strong>{result.relationshipLabel}</strong>
                </div>
              )}
              <div className="sl-result-item">
                <span>تاريخ إصدار تقرير الإجازة</span>
                <strong dir="ltr">{result.sickLeaveDate}</strong>
              </div>
              <div className="sl-result-item">
                <span>تبدأ من</span>
                <strong dir="ltr">{result.dateFrom}</strong>
              </div>
              <div className="sl-result-item">
                <span>وحتى</span>
                <strong dir="ltr">{result.dateTo}</strong>
              </div>
              <div className="sl-result-item">
                <span>المدة بالأيام</span>
                <strong>{result.durationDays}</strong>
              </div>
              <div className="sl-result-item">
                <span>اسم الطبيب</span>
                <strong>{result.doctorName}</strong>
              </div>
              <div className="sl-result-item">
                <span>المسمى الوظيفي</span>
                <strong>{result.doctorJobTitle}</strong>
              </div>
            </div>
          </div>
        )}

        {searched && !result && !alertMessage && (
          <div className="sl-result-box sl-result-box--empty" id="inquiryResultBox" role="status">
            لا يوجد نتائج
          </div>
        )}
      </div>
    </form>
  );
}
