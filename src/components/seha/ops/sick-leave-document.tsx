"use client";

/**
 * SickLeaveDocument — the A4 report sheet, a faithful 1:1 port of the
 * reference issuing system's Chromium print template (generatePdf.js):
 *   - A4 @ 96dpi (794×1123), zero margins
 *   - Bilingual 4-column table with zebra rows and the dark duration row
 *   - Seha / KSA-emblem / polygon-art header, titles in blue
 *   - Footer: optional QR + verification link + timestamp | hospital block
 *     + National Health Information Center logo
 *
 * Rendered on screen (scaled preview) and at print time 1:1 via the
 * browser's own vector engine — selectable Arabic text, sharp at any zoom.
 */

import { useMemo } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { NameSpan } from "./name-wrap";
import type { PortalSickLeaveRecord } from "@/lib/seha/ops";

const pad2 = (n: string) => String(n).padStart(2, "0");

/** YYYY-MM-DD → DD-MM-YYYY (the report's Gregorian format). */
function formatDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso ?? "")) return "";
  const [y, m, d] = iso.split("-");
  return `${pad2(d)}-${pad2(m)}-${y}`;
}

/** Keep the zero-padded shape of stored Hijri dates (DD-MM-YYYY). */
function formatHijri(hijri: string): string {
  if (!hijri) return "";
  const parts = hijri.split(/[-/]/);
  if (parts.length < 3) return hijri;
  return parts.map((p) => (isNaN(Number(p)) ? p : pad2(p))).join("-");
}

export function SickLeaveDocument({ data }: { data: PortalSickLeaveRecord }) {
  // The public verification link — auto-fills the inquiry form and runs it.
  const verificationUrl = useMemo(() => {
    if (typeof window === "undefined") return "#";
    const origin = window.location.origin;
    return `${origin}/#/inquiries/slenquiry?service_num=${encodeURIComponent(data.serviceCode)}&national_id=${encodeURIComponent(data.patientId)}`;
  }, [data.serviceCode, data.patientId]);

  const leaveDaysWord = data.durationDays > 1 ? "أيام" : "يوم";

  return (
    <div className="sl-doc" dir="ltr" lang="en">
      <style>{`
        @font-face { font-family: 'SLNotoSansArabic'; src: url('/assets/pdf/fonts/NotoSansArabic-Regular.ttf') format('truetype'); font-weight: 400; font-style: normal; }
        @font-face { font-family: 'SLNotoSansArabic'; src: url('/assets/pdf/fonts/NotoSansArabic-Bold.ttf') format('truetype'); font-weight: 700; font-style: normal; }
        @font-face { font-family: 'SLAmiri'; src: url('/assets/pdf/fonts/Amiri-Regular.ttf') format('truetype'); font-weight: 400; font-style: normal; }
        @font-face { font-family: 'SLAmiri'; src: url('/assets/pdf/fonts/Amiri-Bold.ttf') format('truetype'); font-weight: 700; font-style: normal; }

        .sl-doc { width: 794px; height: 1123px; background: #fff; overflow: hidden;
          font-family: 'SLNotoSansArabic', sans-serif; box-sizing: border-box; position: relative; }
        .sl-doc * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }

        .sl-doc .sl-head { text-align: center; }
        .sl-doc .sl-header-logos { display: flex; justify-content: space-between; align-items: flex-start;
          padding: 10px 20px; padding-top: 36px; background-color: #fff; }
        .sl-doc .sl-logo-seha { flex: 1; display: flex; justify-content: flex-start; align-items: flex-start; margin-top: -8px; }
        .sl-doc .sl-logo-ksa { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; padding-top: 20px; }
        .sl-doc .sl-logo-ksa img { margin-bottom: -4px; }
        .sl-doc .sl-logo-ksa .english-text { font-size: 15px; font-weight: 400; color: #000; margin: 0;
          text-align: center; font-family: 'SLAmiri', serif; }
        .sl-doc .sl-logo-design { flex: 1; display: flex; justify-content: flex-end; align-items: flex-start; }

        .sl-doc .sl-title { text-align: center; margin-top: -5px; }
        .sl-doc .sl-title .leave-report { font-size: 22px; color: #2f6db4; font-weight: 700; margin: 0; padding: 0; margin-bottom: -5px; }
        .sl-doc .sl-title .dark-head { color: #2b3d77; font-size: 19px; font-family: 'SLAmiri', serif; font-weight: 700; }

        .sl-doc table.sl-table { width: 738px; margin: auto; margin-top: 10px; border-collapse: separate;
          border-spacing: 0; border: 1px solid #dee2e6; border-radius: 8px; background-color: white; overflow: hidden;
          /* Fixed layout + the pixel colgroup below make the middle column
             border a deterministic x (130 + 239 = 369px into the table →
             397px on the 794px sheet), so the footer divider can sit exactly
             on the same vertical axis. Pixel widths (not %) keep it immune to
             any first-pass layout resolution. */
          table-layout: fixed; }
        .sl-doc table.sl-table td { padding: 5px 7px; font-size: 14px; text-align: center;
          border: 1px solid #d0d0d0; vertical-align: middle; background-color: white; }

        .sl-doc .en-text { font-family: 'SLAmiri', serif; }
        .sl-doc .ar-text { font-family: 'SLNotoSansArabic', sans-serif; }
        .sl-doc .ar-date { font-family: 'SLAmiri', serif; }

        .sl-doc table.sl-table tr:first-child td { background-color: white !important; border: 1px solid #dee2e6; }
        .sl-doc table.sl-table tr:first-child td:first-child { border-left: 1px solid #dee2e6; border-top: 1px solid #dee2e6; border-radius: 8px 0 0 0; }
        .sl-doc table.sl-table tr:first-child td:last-child { border-right: 1px solid #dee2e6; border-top: 1px solid #dee2e6; border-radius: 0 8px 0 0; }
        .sl-doc table.sl-table tr:last-child td:first-child { border-left: 1px solid #dee2e6; border-bottom: 1px solid #dee2e6; border-radius: 0 0 0 8px; }
        .sl-doc table.sl-table tr:last-child td:last-child { border-right: 1px solid #dee2e6; border-bottom: 1px solid #dee2e6; border-radius: 0 0 8px 0; }

        .sl-doc table.sl-table .one { width: 130px; min-width: 130px; color: #366fb4 !important;
          font-weight: 700; padding: 6px 0; font-size: 13.5px; }
        .sl-doc table.sl-table .two { color: #2b3d77 !important; font-size: 14px; font-weight: 400;
          line-height: 1.1; padding-top: 4px; padding-bottom: 4px; overflow-wrap: break-word; word-break: normal; }
        .sl-doc .nb { white-space: nowrap; }
        .sl-doc .brk { overflow-wrap: anywhere; }
        .sl-doc .name-cell { text-wrap: pretty; text-wrap: balance; }
        .sl-doc .darkBg td { background-color: #f7f7f7 !important; }
        .sl-doc .leave-duration { background-color: #2b3d76; color: #a8b9e0 !important; font-weight: 700; }
        .sl-doc .leave-duration td { font-size: 11px; background-color: #2b3d76 !important; color: #a8b9e0 !important; }
        .sl-doc table.sl-table tr.leave-duration td.one,
        .sl-doc table.sl-table tr.leave-duration td.two { color: #ffffff !important; font-size: 11px; }
        .sl-doc table.sl-table tbody tr td:last-child { padding: 5px 4px; }
        .sl-doc table.sl-table tbody tr td:last-child.ar-text { font-weight: 700; font-size: 13px; }
        .sl-doc table.sl-table tbody tr .two.ar-text { font-weight: 400 !important; font-size: 14px; }
        .sl-doc table.sl-table tbody tr .ar-text:not(.one) { font-weight: 400 !important; }
        .sl-doc table.sl-table tbody tr td:nth-child(2),
        .sl-doc table.sl-table tbody tr td:nth-child(3) { width: 50%; }
        .sl-doc .transparnt-bg td { background-color: transparent !important; }

        .sl-doc .sl-footer-section { display: flex; justify-content: space-between; position: relative; }
        .sl-doc .qr-section { text-align: center; position: relative; margin-top: 21px; margin-right: -93px; flex: 1; }
        .sl-doc .qr-section a { position: absolute; bottom: 10; right: 25%; }
        .sl-doc .qr-placeholder { display: inline-block; height: 90px; width: 0; }
        .sl-doc .logo-section { display: flex; flex-direction: column; margin-top: 18px !important; flex: 1; margin-left: 65px; }
        .sl-doc .logo-section .text { font-size: 12px; text-align: right; }
        .sl-doc .timestamp { font-size: 13px; font-weight: 700; color: #000000; }
        /* The divider is pinned to the table's middle-column border: the table
           is 738px wide centred on the 794px sheet (left edge 28px) and its
           middle border sits at 130 + 239 = 397px. The line therefore stays
           perfectly level with the column line above it, exactly like the
           reference report. It is taken out of the flex flow; the invisible
           spacer below keeps the QR and hospital sections exactly in place. */
        .sl-doc .vertical-line { position: absolute; left: 397px; top: 10px; width: 1.5px; height: 190px;
          background-color: #d0d0d0; margin: 0; }
        .sl-doc .vertical-line-spacer { width: 1.5px; margin-left: 174px; margin-right: 5px; flex-shrink: 0; }
      `}</style>

      {/* ────────── الرأس: شعار صحة + شعار المملكة + الفن الهندسي ────────── */}
      <div className="sl-head">
        <div className="sl-header-logos">
          <div className="sl-logo-seha">
            <img style={{ height: 80, width: "auto" }} src="/assets/pdf/seha-logo.jpg" alt="Seha logo" />
          </div>
          <div className="sl-logo-ksa">
            <img style={{ height: 54, width: "auto" }} src="/assets/pdf/ksa-emblem.jpg" alt="Kingdom of Saudi Arabia emblem" />
            <div className="english-text">Kingdom of Saudi Arabia</div>
          </div>
          <div className="sl-logo-design">
            <img style={{ height: 100, width: "auto", marginRight: 10 }} src="/assets/pdf/design-art.png" alt="" />
          </div>
        </div>
        <div className="sl-title">
          <h3 className="leave-report">تقرير إجازة مرضية</h3>
          <div className="dark-head">Sick Leave Report</div>
        </div>
      </div>

      {/* ────────── جدول البيانات الثنائي اللغة ────────── */}
      <table className="sl-table">
        {/* Deterministic pixel column widths (130 / 239 / 239 / 130) — keeps
            the middle column border at exactly 397px so the footer divider
            below continues the same vertical axis. */}
        <colgroup>
          <col style={{ width: 130 }} />
          <col style={{ width: 239 }} />
          <col style={{ width: 239 }} />
          <col style={{ width: 130 }} />
        </colgroup>
        <tbody>
          <tr className="transparnt-bg">
            <td className="one en-text">Leave ID</td>
            <td className="two en-text" colSpan={2}>{data.serviceCode}</td>
            <td className="one ar-text">رمز الإجازة</td>
          </tr>
          <tr className="leave-duration">
            <td className="one en-text">Leave Duration</td>
            <td className="two en-text">
              {data.durationDays} {data.durationDays > 1 ? "days" : "day"} ( {formatDate(data.dateFromIso)} to {formatDate(data.dateToIso)} )
            </td>
            <td className="two ar-text" style={{ direction: "rtl" }}>
              <span className="ar-date">{data.durationDays}</span> {leaveDaysWord} (
              <span className="ar-date" dir="ltr">{formatHijri(data.dateFromHijri)}</span> الى{" "}
              <span className="ar-date" dir="ltr">{formatHijri(data.dateToHijri)}</span>)
            </td>
            <td className="one ar-text">مدة الإجازة</td>
          </tr>
          <tr>
            <td className="one en-text">Admission Date</td>
            <td className="two en-text">{formatDate(data.dateFromIso)}</td>
            <td className="two en-text">{formatHijri(data.dateFromHijri)}</td>
            <td className="one ar-text">تاريخ الدخول</td>
          </tr>
          <tr className="darkBg">
            <td className="one en-text">Discharge Date</td>
            <td className="two en-text">{formatDate(data.dateToIso)}</td>
            <td className="two en-text">{formatHijri(data.dateToHijri)}</td>
            <td className="one ar-text">تاريخ الخروج</td>
          </tr>
          <tr>
            <td className="one en-text">Issue Date</td>
            <td className="two en-text" colSpan={2}>{formatDate(data.sickLeaveDateIso)}</td>
            <td className="one ar-text">تاريخ إصدار التقرير</td>
          </tr>
          <tr className="darkBg">
            <td className="one en-text">Name</td>
            <td className="two en-text name-cell">
              <NameSpan name={(data.patientNameEn || "").toUpperCase()} />
            </td>
            <td className="two ar-text name-cell">
              <NameSpan name={data.patientName} />
            </td>
            <td className="one ar-text">الاسم</td>
          </tr>
          <tr>
            <td className="one en-text">National ID / Iqama</td>
            <td className="two en-text" colSpan={2}>{data.patientId}</td>
            <td className="one ar-text">رقم الهوية / الإقامة</td>
          </tr>
          <tr className="darkBg">
            <td className="one en-text">Nationality</td>
            <td className="two en-text">{data.nationalityEn}</td>
            <td className="two ar-text">{data.nationalityAr}</td>
            <td className="one ar-text">الجنسية</td>
          </tr>
          <tr>
            <td className="one en-text">Employer</td>
            <td className="two en-text">{""}</td>
            <td className="two ar-text">{data.employerAr}</td>
            <td className="one ar-text">جهة العمل</td>
          </tr>
          <tr className="darkBg">
            <td className="one en-text">Physician Name</td>
            <td className="two en-text name-cell">
              <NameSpan name={(data.doctorNameEn || "").toUpperCase()} />
            </td>
            <td className="two ar-text name-cell">
              <NameSpan name={data.doctorName} />
            </td>
            <td className="one ar-text">اسم الممارس</td>
          </tr>
          <tr>
            <td className="one en-text">Position</td>
            <td className="two en-text">{data.doctorJobTitleEn}</td>
            <td className="two ar-text">{data.doctorJobTitle}</td>
            <td className="one ar-text">المسمى الوظيفى</td>
          </tr>
        </tbody>
      </table>

      {/* ────────── التذييل: التحقق + الطابع الزمني | المستشفى + المركز الوطني ────────── */}
      <div className="sl-footer-section">
        {/* قسم التحقق والرابط — كل هذه الكتلة منطقة ضغط واحدة كبيرة في ملف PDF */}
        <div className="qr-section">
          <div className="sl-verify-block" style={{ marginLeft: 45 }}>
            {data.addQr ? (
              <span className="sl-qr-box" style={{ display: "inline-block", lineHeight: 0 }}>
                <QRCodeCanvas
                  value={verificationUrl}
                  size={90}
                  style={{ height: 90, width: 90, margin: 0 }}
                  marginSize={1}
                  level="M"
                />
              </span>
            ) : (
              <span className="qr-placeholder" />
            )}
            <p
              className="ar-text"
              style={{ margin: 0, marginTop: -5, fontSize: 10, fontWeight: 900, color: "#000" }}
            >
              للتحقق من بيانات التقرير يرجى التأكد من زيارة موقع منصة صحة الرسمي
            </p>
            <p className="en-text" style={{ margin: 0, fontSize: 10, fontWeight: 900, color: "#000" }}>
              To check the report please visit Seha&rsquo;s official website
            </p>
            <a
              className="en-text sl-verify-link"
              href={verificationUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                margin: 0,
                marginTop: 7,
                fontSize: 10,
                fontWeight: 900,
                color: "blue",
                textDecoration: "underline",
                display: "inline-block",
              }}
            >
              www.seha.sa/#/inquiries/slenquiry
            </a>
          </div>

          {/* الطابع الزمني */}
          <div className="timestamp">
            <div style={{ marginTop: 46, textAlign: "left", marginLeft: 26 }}>
              <p className="en-text" style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>
                {data.reportTime}
              </p>
              <p className="en-text" style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>
                {data.reportDate}
              </p>
            </div>
          </div>
        </div>

        <div className="vertical-line" aria-hidden="true" />
        <div className="vertical-line-spacer" aria-hidden="true" />

        {/* قسم المستشفى + المركز الوطني للمعلومات الصحية */}
        <div className="logo-section">
          <div style={{ textAlign: "center", marginRight: 80 }}>
            <img style={{ height: 100 }} src="/assets/pdf/hospital-logo.jpg" alt="Hospital logo" />
            <div style={{ lineHeight: 1.5, marginTop: 0 }}>
              <p className="ar-text" style={{ margin: 0, fontSize: "12.8px", fontWeight: 900, color: "#000" }}>
                {data.hospital || "المستشفى السعودي الألماني"}
              </p>
              <p className="en-text" style={{ margin: 0, fontSize: "12.8px", fontWeight: 900, color: "#000" }}>
                {data.hospitalEn || "Saudi German Hospital"}
              </p>
              {data.showLicense && (
                <p className="ar-text" style={{ margin: 0, fontSize: 12, fontWeight: 900, color: "#000" }}>
                  رقم الترخيص: <span className="ar-date">{data.licenseNumber || "1410845786"}</span>
                </p>
              )}
            </div>
          </div>
          <div>
            <img
              style={{ width: 140, height: 90, marginLeft: 147, marginTop: 30 }}
              src="/assets/pdf/national-center.jpg"
              alt="National Health Information Center"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
