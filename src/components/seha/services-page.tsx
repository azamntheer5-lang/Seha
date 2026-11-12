"use client";

import { useMemo, useState } from "react";
import type { SehaRoute } from "./seha-types";

/* ==================================================================
 * SERVICES PAGE (#/cms/services) — stable rebuild of the reference
 * page (the original crashes with `ne.map is not a function`).
 * Design language: search bar + category chips + svc-card grid,
 * all shared with the home services section.
 * ================================================================== */

type Nav = (route: SehaRoute) => void;

const SERVICE_CATEGORIES = [
  "الكل",
  "التراخيص الصحية",
  "التقارير والشهادات الصحية",
  "قياس الالتزام",
  "البلاغات الصحية",
  "الصحة العامة والوقاية",
  "أخرى",
] as const;

type ServiceItem = {
  title: string;
  desc: string;
  tag: string;
  view: SehaRoute;
};

const ALL_SERVICES: ServiceItem[] = [
  {
    title: "رفع طلبات الإحالات",
    desc: "خدمة إلكترونية لرفع طلبات علاج المرضى وإحالاتهم بين المنشآت الصحية وفي حال تطلب نقلهم بالإخلاء الطبي يتم رفع الطلب من خلال هذه الخدمة",
    tag: "أخرى",
    view: "services",
  },
  {
    title: "أمين عهدة الوصفات المقيدة",
    desc: "خدمة إلكترونية على منصة صحة تتيح لأمين عهدة الصيدلية الاطلاع على أرشيف الوصفات المصروفة وسجل العمليات وإدارة الأصناف الجنيسة والتجارية في المنشأة.",
    tag: "أخرى",
    view: "services",
  },
  {
    title: "اصدار شهادة فحص الزواج",
    desc: "خدمة إلكترونية تتيح للمنشآت الصحية من تقديم فحص ما قبل الزواج للأفراد المقبلين على الزواج وإصدار شهادة فحص الزواج إلكترونياً.",
    tag: "التقارير والشهادات الصحية",
    view: "inquiries",
  },
  {
    title: "استعراض تقرير فحص اللياقة المدرسي",
    desc: "خدمة إلكترونية تتيح للأفراد من الاطلاع على تقرير الفحص من خلال منصة صحة.",
    tag: "التقارير والشهادات الصحية",
    view: "inquiries",
  },
  {
    title: "إصدار موافقة خبير الصحة",
    desc: "تتيح الخدمة للمنشآت الصحية من إصدار موافقة خبير الصحة للممارسين الحكوميين للعمل في القطاع الخاص خارج أوقات الدوام الرسمي.",
    tag: "التراخيص الصحية",
    view: "services",
  },
  {
    title: "استعراض شهادة فحص الزواج",
    desc: "خدمة إلكترونية تتيح للأفراد من الاطلاع على الشهادة من خلال تطبيق صحتي.",
    tag: "التقارير والشهادات الصحية",
    view: "inquiries",
  },
  {
    title: "إصدار ترخيص مزاولة مهنة",
    desc: "تتيح الخدمة للمنشآت الصحية من إصدار ترخيص مزاولة مهنة للممارسين التابعين لها.",
    tag: "التراخيص الصحية",
    view: "services",
  },
  {
    title: "التحقق من شهادة فحص الزواج",
    desc: "خدمة إلكترونية تتيح للأفراد التحقق من صلاحية الشهادة والاطلاع عليها.",
    tag: "التقارير والشهادات الصحية",
    view: "inquiries",
  },
  {
    title: "اصدار تقرير فحص اللياقة المدرسي",
    desc: "خدمة إلكترونية تتيح للمنشآت الصحية من تقديم فحص ما قبل دخول المدرسة للأطفال المستجدين.",
    tag: "التقارير والشهادات الصحية",
    view: "inquiries",
  },
  {
    title: "الإجازات المرضية",
    desc: "هي خدمة تتيح للمنشآت الصحية تسجيل الإجازات المرضية والتحقق من صحة بيانات المرضى، الأطباء، والمنشآت الصحية وموثوقية مصدرها المعتمد، وتتيح للأفراد إمكانية الوصول الى الإجازات المرضية إلكترونيا.",
    tag: "التقارير والشهادات الصحية",
    view: "sl",
  },
  {
    title: "الشهادات الصحية",
    desc: "هي إحدى خدمات التقارير الطبية وتتمثل في الربط الإلكتروني لنتائج الفحص الطبي بحيث يتسنى للمستفيد إجراء الفحص في المنشآت الصحية المرخصة وإرسال نتيجة الفحص إلكترونيا للجهة المسؤولة بما يمكن من الإصدار الإلكتروني للشهادات الصحية.",
    tag: "التقارير والشهادات الصحية",
    view: "inquiries",
  },
  {
    title: "الوصفة الإلكترونية",
    desc: "خدمة تتيح إمكانية صرف الوصفات الطبية إلكترونيا للصيدليات المسجلة في منصة صحة حيث توفر الخدمة إمكانية متابعة عدد الوصفات المصروفة من المنشأة.",
    tag: "أخرى",
    view: "services",
  },
  {
    title: "ترخيص الترميز الطبي الأسترالي",
    desc: "الآن يمكنك إصدار ترخيص الترميز الطبي الأسترالي \"ICD-10 AM/ACHI\" الترميز الطبي هو آلية تحويل الأسماء أو المصطلحات الطبية للأمراض إلى رموز لتمكين القطاع الصحي وقطاع التأمين من تسهيل وتسريع الإجراءات.",
    tag: "التراخيص الصحية",
    view: "services",
  },
  {
    title: "خدمات قياس الالتزام الصحية",
    desc: "خدمات تتيح للمنشآت الصحية قياس مستوى الالتزام بالمعايير والمتطلبات الصحية المعتمدة ورفع تقارير التقييم الدورية.",
    tag: "قياس الالتزام",
    view: "services",
  },
  {
    title: "البلاغات الصحية",
    desc: "خدمة إلكترونية لتقديم البلاغات الصحية ومتابعة حالتها من خلال منصة صحة بالتكامل مع الجهات المختصة.",
    tag: "البلاغات الصحية",
    view: "services",
  },
  {
    title: "التوعية والصحة العامة",
    desc: "خدمات ومحتوى توعوي في مجال الصحة العامة والوقاية من الأمراض والأوبئة، تقدمه منصة صحة بالشراكة مع وزارة الصحة.",
    tag: "الصحة العامة والوقاية",
    view: "services",
  },
];

/** Search icon — the exact blue glyph used by the reference search input. */
function SearchGlyph() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15.14" height="15.14" viewBox="0 0 15.136 15.136" aria-hidden="true">
      <path fill="#306db5" d="M18.49,17.7l-4.23-4.252a6.162,6.162,0,1,0-.812.812L17.7,18.49ZM4.484,9.526a5.042,5.042,0,1,1,5.042,5.042A5.042,5.042,0,0,1,4.484,9.526Z" transform="translate(-3.353 -3.353)" />
    </svg>
  );
}

function FileTextIcon() {
  return (
    <svg viewBox="64 64 896 896" focusable="false" width="1em" height="1em" fill="currentColor" aria-hidden="true">
      <path d="M854.6 288.6L639.4 73.4c-6-6-14.1-9.4-22.6-9.4H192c-17.7 0-32 14.3-32 32v832c0 17.7 14.3 32 32 32h640c17.7 0 32-14.3 32-32V311.3c0-8.5-3.4-16.7-9.4-22.7zM790.2 326H602V137.8L790.2 326zm1.8 562H232V136h302v216a42 42 0 0042 42h216v494zM504 618H320c-4.4 0-8 3.6-8 8v48c0 4.4 3.6 8 8 8h184c4.4 0 8-3.6 8-8v-48c0-4.4-3.6-8-8-8zM312 490v48c0 4.4 3.6 8 8 8h384c4.4 0 8-3.6 8-8v-48c0-4.4-3.6-8-8-8H320c-4.4 0-8 3.6-8 8z"></path>
    </svg>
  );
}

export function ServicesPage({ onNavigate }: { onNavigate: Nav }) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<string>("الكل");

  const filtered = useMemo(() => {
    const q = query.trim();
    return ALL_SERVICES.filter((s) => {
      const matchesTab = tab === "الكل" || s.tag === tab;
      const matchesQuery =
        !q || s.title.includes(q) || s.desc.includes(q) || s.tag.includes(q);
      return matchesTab && matchesQuery;
    });
  }, [query, tab]);

  return (
    <div className="services-page" dir="rtl">
      {/* Search + category chips */}
      <div className="services-page__controls">
        <form
          className="services-page__search"
          role="search"
          onSubmit={(e) => e.preventDefault()}
        >
          <div className="services-page__input-group">
            <span className="services-page__input-prepend">
              <SearchGlyph />
            </span>
            <input
              type="search"
              className="services-page__input"
              placeholder="بحث"
              aria-label="بحث في الخدمات"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </form>

        <div className="services-page__chips" role="tablist" aria-label="تصنيفات الخدمات">
          {SERVICE_CATEGORIES.map((cat) => (
            <button
              type="button"
              role="tab"
              key={cat}
              aria-selected={tab === cat}
              className={`services-chip${tab === cat ? " is-active" : ""}`}
              onClick={() => setTab(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <p className="services-page__count" aria-live="polite">
        {filtered.length} خدمة
      </p>

      {/* Cards grid */}
      {filtered.length > 0 ? (
        <div className="services-page__grid">
          {filtered.map((card) => (
            <article className="svc-card" key={card.title}>
              <div className="svc-card__top">
                <span className="svc-card__icon" aria-hidden="true">
                  <FileTextIcon />
                </span>
                <span className="svc-card__tag">
                  <span className="svc-card__tag-label">{card.tag}</span>
                </span>
              </div>
              <h3 className="svc-card__title">{card.title}</h3>
              <p className="svc-card__desc">{card.desc}</p>
              <div className="svc-card__entity">
                <img src="/assets/DGA_MOH_Entity-8c123b97.png" alt="" className="svc-card__entity-logo" />
                <span className="svc-card__entity-name">وزارة الصحة</span>
              </div>
              <div className="svc-card__actions">
                <button
                  type="button"
                  className="svc-card__btn svc-card__btn--ghost"
                  onClick={() => onNavigate("services")}
                >
                  <span className="svc-card__btn-label">شرح الخدمة</span>
                </button>
                <button
                  type="button"
                  className="svc-card__btn svc-card__btn--primary"
                  onClick={() => onNavigate(card.view)}
                >
                  <span className="svc-card__btn-label">إبدأ الخدمة</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="services-page__empty">
          <p>لا توجد خدمات مطابقة لبحثك</p>
        </div>
      )}
    </div>
  );
}
