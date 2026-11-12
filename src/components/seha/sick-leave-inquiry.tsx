"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SickLeaveResult } from "@/lib/seha/domain";

/* -------------------------------------------------------------------------
 * Icons — exact glyphs from the reference bundle
 * ---------------------------------------------------------------------- */

/** Search icon — same geometry as the reference button glyph. */
function SearchIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9.1665 1.04166C4.67919 1.04166 1.0415 4.67934 1.0415 9.16666C1.0415 13.654 4.67919 17.2917 9.1665 17.2917C11.1852 17.2917 13.0319 16.5555 14.4529 15.3369L17.8912 18.7753C18.1353 19.0193 18.531 19.0193 18.7751 18.7753C19.0192 18.5312 19.0192 18.1355 18.7751 17.8914L15.3368 14.453C16.5553 13.0321 17.2915 11.1853 17.2915 9.16666C17.2915 4.67934 13.6538 1.04166 9.1665 1.04166ZM2.2915 9.16666C2.2915 5.3697 5.36955 2.29166 9.1665 2.29166C12.9635 2.29166 16.0415 5.3697 16.0415 9.16666C16.0415 12.9636 12.9635 16.0417 9.1665 16.0417C5.36955 16.0417 2.2915 12.9636 2.2915 9.16666Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Back arrow icon (RTL: points left) — reference BackArrowIcon. */
function BackArrowIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M10 4L6 8L10 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** faSpinner circle-notch glyph (FontAwesome) with fa-spin — like the reference loading state. */
function FaSpinner() {
  return (
    <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="fa-spin">
      <path
        d="M256 0C297.7 0 336.3 12.6 368 34c8.4 5.7 10.5 17.2 4.6 25.5L338.7 104c-5.6 7.9-16.2 9.9-24.2 4.5C300.4 100.6 283.1 96 264.9 96c-53 0-96 43-96 96s43 96 96 96c15.8 0 30.9-3.9 44.3-11l-34.1-34.1c-8.1-8.1-8.1-21.2 0-29.3l27.6-27.6c8.1-8.1 21.2-8.1 29.3 0L460.9 429c8.1 8.1 8.1 21.2 0 29.3l-27.6 27.6c-8.1 8.1-21.2 8.1-29.3 0l-47.2-47.2C325.5 457.4 292.3 468.4 256.5 468.4c-117.4 0-212.9-95.5-212.9-212.9S139.1 42.6 256.5 42.6c2.5 0 5 .1 7.5.2L257 40.9C256.6 18.5 274.6 .4 297 .1c12.2-.2 23.8 5.4 31.6 14.9L368 34 256 0z"
        fill="currentColor"
        transform="translate(0 22)"
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------
 * Validation — exact port of the reference validateID:
 * trimmed value must be numeric and exactly 10 digits.
 * ---------------------------------------------------------------------- */
function validateID(value: string): 0 | -1 {
  const v = value.trim();
  return isNaN(parseInt(v, 10)) || v.length !== 10 ? -1 : 0;
}

/* -------------------------------------------------------------------------
 * Field — port of InquiryField
 * ---------------------------------------------------------------------- */
function InquiryField({
  id,
  label,
  ...rest
}: {
  id: string;
  label: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="sl-field">
      {label && <label htmlFor={id}>{label}</label>}
      <input id={id} {...rest} />
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Results grid — port of InquiryResults (filters empty values)
 * ---------------------------------------------------------------------- */
function InquiryResults({
  items,
}: {
  items: { label: string; value: string | number | undefined | null }[];
}) {
  const filled = items.filter(
    (i) =>
      i &&
      i.value !== undefined &&
      i.value !== null &&
      `${i.value}`.trim() !== ""
  );
  if (filled.length === 0) return null;
  return (
    <div className="sl-results">
      {filled.map((item, i) => (
        <div key={i} className="sl-results__item">
          <span>{item.label}</span>
          <b>{item.value}</b>
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Sick leave enquiry — exact port of the reference Slenquiry flow:
 *   form → (validation) → loading (spinner, inputs disabled)
 *        → results grid | "لا يوجد نتائج" | "خطأ في الاستعلام"
 * Senior hardening on top: stale-response abort, aria-live, no double submit.
 * ---------------------------------------------------------------------- */
export function SickLeaveInquiry({
  onBackToInquiries,
}: {
  onBackToInquiries: () => void;
}) {
  const [serial, setSerial] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [networkError, setNetworkError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SickLeaveResult | null>(null);
  const [isNewReq, setIsNewReq] = useState(true);

  const abortRef = useRef<AbortController | null>(null);

  // Abort in-flight request on unmount.
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  // Errors clear whenever either input changes (reference behavior) —
  // done inside the setters to avoid a cascading effect render.

  const submit = useCallback(() => {
    if (loading) return;

    setResult(null);
    setNetworkError(false);

    if (serial === "" || serial.trim() === "") {
      setErrors(["فضلا اكتب الرمز "]);
      return;
    }
    if (validateID(idNumber) < 0) {
      setErrors(["رقم الهوية خاطئ "]);
      return;
    }

    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    const params = new URLSearchParams({
      serviceCode: serial.trim(),
      patientId: idNumber.trim(),
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
        if (body.ok) {
          setIsNewReq(false);
          setResult(body.data as SickLeaveResult);
          return;
        }
        // Executed query with no match → identical to reference "no results".
        if (body.error === "NOT_FOUND" || body.error === "SERVER") {
          setIsNewReq(false);
          setResult(null);
          if (body.error === "SERVER") setNetworkError(true);
          return;
        }
        // Validation / rate-limit: keep form editable, show server message.
        setErrors([body.message ?? "خطأ في الاستعلام"]);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setLoading(false);
        setIsNewReq(false);
        setResult(null);
        setNetworkError(true);
      });
  }, [serial, idNumber, loading]);

  const newRequest = useCallback(() => {
    setErrors([]);
    setNetworkError(false);
    setSerial("");
    setIdNumber("");
    setResult(null);
    setIsNewReq(true);
  }, []);

  const resultItems: { label: string; value: string | number | undefined | null }[] =
    result
      ? [
          { label: "الاسم", value: result.patientName },
          { label: "اسم المرافق", value: result.companionName },
          { label: "صلة القرابة", value: result.relationshipLabel },
          { label: "تاريخ إصدار تقرير الإجازة", value: result.sickLeaveDate },
          { label: "تبدأ من", value: result.dateFrom },
          { label: "وحتى", value: result.dateTo },
          { label: "المدة بالأيام", value: result.durationDays },
          { label: "اسم الطبيب", value: result.doctorName },
          { label: "المسمى الوظيفي", value: result.doctorJobTitle },
        ]
      : [];

  return (
    <div className="sl-inquiry" dir="rtl">
      {/* Hero — green band with title + subtitle */}
      <section className="sl-inquiry__hero">
        <div className="sl-inquiry__hero-inner">
          <h1>الإجازات المرضية</h1>
          <p>
            خدمة الاستعلام عن الإجازات المرضية تتيح لك الاستعلام عن حالة طلبك
            للإجازة ويمكنك طباعتها عن طريق تطبيق صحتي
          </p>
        </div>
      </section>

      {/* Card */}
      <div className="sl-inquiry__card">
        <h2 className="sl-inquiry__card-title">الاستعلام عن إجازة مرضية</h2>

        {errors.map((e, i) => (
          <p key={i} className="sl-alert">
            {e}
          </p>
        ))}

        <InquiryField
          id="sl-serial"
          label="رمز الخدمة"
          type="text"
          maxLength={20}
          placeholder="أدخل رمز الخدمة"
          value={serial}
          disabled={!isNewReq}
          onChange={(e) => {
            setSerial(e.target.value);
            if (errors.length) setErrors([]);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && isNewReq) submit();
          }}
          autoComplete="off"
        />

        <InquiryField
          id="sl-id"
          label="رقم الهوية / الإقامة"
          type="text"
          maxLength={10}
          pattern="\d*"
          placeholder="أدخل رقم الهوية / الإقامة"
          value={idNumber}
          disabled={!isNewReq}
          onChange={(e) => {
            setIdNumber(e.target.value.replace(/[^\d]/g, "").slice(0, 10));
            if (errors.length) setErrors([]);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && isNewReq) submit();
          }}
          autoComplete="off"
        />

        {/* Result / alert area (aria-live for screen readers — senior a11y win) */}
        <div aria-live="polite" aria-atomic="true">
          {networkError && (
            <div className="sl-alert" role="alert">
              خطأ في الاستعلام
            </div>
          )}

          {result && <InquiryResults items={resultItems} />}

          {!networkError && !result && !isNewReq && !loading && (
            <div className="sl-alert" role="alert">
              لا يوجد نتائج
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="sl-actions">
          {!isNewReq && (
            <button
              type="button"
              className="sl-btn sl-btn--outline"
              onClick={onBackToInquiries}
            >
              <BackArrowIcon />
              رجوع للاستعلامات
            </button>
          )}

          {isNewReq ? (
            <button
              type="submit"
              className="sl-btn sl-btn--primary"
              disabled={loading}
              onClick={submit}
              aria-busy={loading}
            >
              {loading ? <FaSpinner /> : <SearchIcon />}
              استعلام
            </button>
          ) : (
            <button
              type="button"
              className="sl-btn sl-btn--primary"
              onClick={newRequest}
            >
              <SearchIcon />
              استعلام جديد
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
