"use client";

import { useEffect, useRef, useState } from "react";
import type { SehaRoute } from "./seha-types";

/* ==================================================================
 * SEHA PLUS PAGE (#/seha-plus) — executive dashboards landing:
 *   hero + animated stat counters + 3 value cards + packages CTA.
 * ================================================================== */

type Nav = (route: SehaRoute) => void;

/** Animated counter — counts up to `value` when it enters the viewport. */
function CountUp({ value, duration = 1800 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement | null>(null);
  const started = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !started.current) {
            started.current = true;
            const t0 = performance.now();
            const tick = (now: number) => {
              const p = Math.min((now - t0) / duration, 1);
              // easeOutCubic for a natural deceleration
              const eased = 1 - Math.pow(1 - p, 3);
              setDisplay(Math.round(eased * value));
              if (p < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
            io.disconnect();
          }
        });
      },
      { threshold: 0.4 }
    );
    io.observe(node);
    return () => io.disconnect();
  }, [value, duration]);

  return <span ref={ref}>{display.toLocaleString("en-US")}</span>;
}

const PLUS_FEATURES = [
  {
    title: "تحسين كفاءة التشغيل",
    desc: "راقب الأداء لحظيًا، واكتشف التحديات التشغيلية مبكرًا.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 17l6-6 4 4 8-8" />
        <path d="M14 7h7v7" />
      </svg>
    ),
  },
  {
    title: "الاستخدام الأمثل للموارد",
    desc: "تابع استخدام الموارد والطاقة التشغيلية لرفع كفاءة التشغيل.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33h.01a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51h.01a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v.01a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    ),
  },
  {
    title: "رؤى مدعومة بتحليلات متقدمة",
    desc: "استفد من التحليلات المتقدمة لاكتشاف الأنماط والفرص في بياناتك من خلال توصيات وتنبيهات مقترحة لتتميز عن المنشآت الأخرى.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M2 12h4l3-9 4 18 3-9h6" />
      </svg>
    ),
  },
];

export function SehaPlusPage({ onNavigate }: { onNavigate: Nav }) {
  return (
    <main className="seha-plus-page" dir="rtl">
      {/* Hero band */}
      <section className="seha-plus-hero">
        <div className="seha-plus-hero__inner">
          <h1 className="seha-plus-hero__title">صحة بلس</h1>
          <p className="seha-plus-hero__desc">
            يجمع صحة بلس المؤشرات التشغيلية والسريرية والمالية في لوحة تنفيذية واحدة، تمنح
            القيادات الصحية رؤية لحظية تدعم اتخاذ القرار، وتحسين الأداء، والاستفادة المثلى من الموارد.
          </p>
          <button
            type="button"
            className="seha-plus-hero__cta"
            onClick={() => onNavigate("contact")}
          >
            استكشف الباقات
          </button>
        </div>

        {/* Animated stats */}
        <div className="seha-plus-stats">
          <div className="seha-plus-stat">
            <span className="seha-plus-stat__value">
              <CountUp value={22525} />
            </span>
            <span className="seha-plus-stat__label">منشأة</span>
          </div>
          <div className="seha-plus-stat">
            <span className="seha-plus-stat__value">
              <CountUp value={98765} />
            </span>
            <span className="seha-plus-stat__label">مستخدم</span>
          </div>
        </div>
      </section>

      {/* Value cards */}
      <section className="seha-plus-features" aria-labelledby="seha-plus-features-title">
        <div className="seha-plus-features__inner">
          <h2 id="seha-plus-features-title" className="seha-plus-features__title">
            كيف يدعم صحة بلس صحة منشأتك؟
          </h2>
          <p className="seha-plus-features__sub">
            تصفّح مجموعة متنوعة من لوحات البيانات التي صُمِّمت بعناية لتلبية احتياجات أعمالك،
            وتمكّنك من الوصول إلى المؤشرات والإحصائيات الأكثر أهمية بما يساهم في دعم اتخاذ القرارات،
            وتحسين مستوى الأداء، ورفع كفاءة العمليات في مختلف المجالات.
          </p>

          <div className="seha-plus-features__grid">
            {PLUS_FEATURES.map((f) => (
              <article className="plus-card" key={f.title}>
                <span className="plus-card__icon" aria-hidden="true">{f.icon}</span>
                <h3 className="plus-card__title">{f.title}</h3>
                <p className="plus-card__desc">{f.desc}</p>
              </article>
            ))}
          </div>

          <button
            type="button"
            className="seha-plus-hero__cta seha-plus-features__cta"
            onClick={() => onNavigate("contact")}
          >
            استكشف الباقات
          </button>
        </div>
      </section>
    </main>
  );
}
