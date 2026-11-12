"use client";

import type { SehaView } from "./seha-types";

/**
 * Inquiries index — 1:1 port of the reference /inquiries page:
 * hero + responsive card grid (8 services) with the original texts.
 */

/** Document-check icon — the exact glyph used by every reference inquiry card. */
function InquiryDocIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M8 2.75h5.19a2 2 0 0 1 1.42.59l3.05 3.06a2 2 0 0 1 .59 1.41V19.25A2 2 0 0 1 16.25 21.25H8A2 2 0 0 1 6 19.25V4.75A2 2 0 0 1 8 2.75Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M13.5 3v3.5a1 1 0 0 0 1 1H18"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="m9.25 13.6 1.7 1.65 3.8-3.9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type InquiryCardData = {
  title: string;
  description: string;
  /** internal view to open, or null for external/unavailable */
  view: SehaView | null;
  external?: boolean;
};

const CARDS: InquiryCardData[] = [
  {
    title: "الإجازات المرضية",
    description:
      "خدمة الاستعلام عن الـإجازات المرضية تتيح لك الاستعلام عن حالة طلبك للإجازة وتمكنك من تصدير وطباعة نسخة لها",
    view: "sl",
  },
  {
    title: "خدمة الاستعلام عن فحص اللياقة للطلبة المستجدين",
    description:
      "خدمة الاستعلام عن التقارير الطبية تتيح لك الاستعلام عن حالة التقرير الطبي وتمكنك من تصدير وطباعة نسخة له",
    view: null,
  },
  {
    title: "خدمة الاستعلام عن شهادات فحص الزواج",
    description:
      "خدمة الاستعلام عن نتيجة الفحص ماقبل الزواج تتيح لك الاستعلام عن حالة طلبك وتمكنك من تصدير وطباعة نسخة لها",
    view: null,
    external: true,
  },
  {
    title: "الاستعلام عن المنشآت المقدمة للخدمات الصحية",
    description: "يمكنك الاستعلام عن المنشآت المقدمة للخدمات الصحية.",
    view: null,
    external: true,
  },
  {
    title: "التحقق من شهادة فحص فايروس كورونا المستجد (كوفيد-19)",
    description:
      "خدمة الاستعلام تتيح التحقق من صحة تقرير فحص فايروس كورونا المستجد (كوفيد-19) عن طريق تقنية PCR",
    view: null,
  },
  {
    title: "عرض التقرير الطبي وشهادة التطعيم",
    description:
      "خدمة الاستعلام عن التقارير الطبية والشهادات الخاصة بالتطعيمات تتيح امكانية التحقق من صحة البيانات الواردة في التقرير الطبي و شهادة التطعيم",
    view: null,
  },
  {
    title: "الشهادات الصحية",
    description:
      "خدمة الاستعلام للشهادات الصحية (أمانات) تتيح لك الاستعلام عن تقريرك الطبي وتمكنك من تصديره وطباعته",
    view: null,
  },
  {
    title: "رخص القيادة",
    description:
      "خدمة الاستعلام للفحص الطبي لرخص القيادة تتيح لك الاستعلام عن تقريرك الطبي وتمكنك من تصديره وطباعته",
    view: null,
  },
];

export function InquiriesIndex({
  onOpenSickLeave,
}: {
  onOpenSickLeave: () => void;
}) {
  return (
    <div className="inquiries-container" dir="rtl">
      {/* Hero */}
      <section className="inquiries-hero">
        <div className="inquiries-hero__inner">
          <h1>الاستعلامات</h1>
          <p>اختر الخدمة التي تريد الاستعلام عنها.</p>
        </div>
      </section>

      {/* Cards grid */}
      <div className="inquiries-grid">
        {CARDS.map((card) => {
          const inner = (
            <>
              <span className="inquiry-card__icon">
                <InquiryDocIcon />
              </span>
              <div className="inquiry-card__content">
                <h3>{card.title}</h3>
                <p>{card.description}</p>
              </div>
              <span className="inquiry-card__btn">استعلام</span>
            </>
          );

          if (card.view === "sl") {
            return (
              <div key={card.title} className="inquiry-card">
                <a
                  className="inquiry-card__link"
                  href="#/inquiries/slenquiry"
                  onClick={(e) => {
                    e.preventDefault();
                    onOpenSickLeave();
                  }}
                >
                  {inner}
                </a>
              </div>
            );
          }

          return (
            <div key={card.title} className="inquiry-card">
              <a
                className="inquiry-card__link"
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  window.alert("هذه الخدمة غير متاحة في النسخة التجريبية.");
                }}
              >
                {inner}
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}
