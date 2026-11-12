"use client";

import { useMemo, useState } from "react";
import type { SehaRoute } from "./seha-types";

/* ==================================================================
 * FAQ PAGE (#/faq) — search + category filter + accordion + pagination.
 * Filter categories measured from the reference: الكل، تواصل معنا،
 * المنظومة الصحية، شركاؤنا — 14 questions total.
 * ================================================================== */

type Nav = (route: SehaRoute) => void;

const FAQ_CATEGORIES = ["الكل", "تواصل معنا", "المنظومة الصحية", "شركاؤنا"] as const;

type FaqItem = { q: string; a: string; cat: string };

const FAQ_ITEMS: FaqItem[] = [
  {
    q: "كيف يمكن تحويل الرصيد من حساب إلى حساب أو من منشاة إلى أخرى",
    a: "يمكن للحساب/المنشأة تحويل الرصيد عن طريق خيار \"التحكم بالرصيد\" ومن ثم الضغط على خيار \"تحويل رصيد\" من أعلى الصفحة ويقوم بعدها المستخدم بإختيار المنشأة التي يرغب تحويل الرصيد من خلالها والمنشأة المحول لها الرصيد",
    cat: "تواصل معنا",
  },
  {
    q: "كيف يمكن تغيير مدير الحساب الطبي",
    a: "يجب ارسال طلب تغيير مدير حساب الطبي الى الدعم الفني عن طريق البريد الإلكتروني و إرسال نموذج التفويض (مطابق لنموذج المستعمل في تسجيل المنشات) و صورة من هوية مستخدم المدير الحساب الطبي",
    cat: "تواصل معنا",
  },
  {
    q: "كيف يمكن إضافة المنشاة الصحية",
    a: "يمكن لمدير الحساب من خلال أيقونة \"طلبات إضافة منشآت\" الوصول الى صفحة إضافة منشأة يقوم المستخدم بالضغط على خيار \"إضافة منشأة جديدة\" ويقوم بإتباع الخطوات اللازمة.",
    cat: "المنظومة الصحية",
  },
  {
    q: "كيف يمكن شراء باقة",
    a: "يمكن للحساب/المنشأة شراء باقة عن طريق خيار \"التحكم بالرصيد\" ومن ثم الضغط على خيار \"شراء باقة\" من أعلى الصفحة ويقوم بعدها المستخدم بإختيار المنشأة التي يرغب بشراء الباقة وتحديد الباقة المراد شراؤها، مع العلم بضرورة شحن الرصيد قبل شراء الباقة",
    cat: "تواصل معنا",
  },
  {
    q: "كيف يمكن تغيير دور مدير نظام المنشأة الصحية",
    a: "يجب على مدير الحساب التوجه الى \"إدارة المستخدمون\" و البحث عن المستخدم بدور \"مدير المنشاة الطبية\" و تعديل المستخدم و حذف الدور منه و من ثم إضافة مستخدم جديد او تعديل مستخدم سابق و إضافة دور \"مدير منشاة طبية\" للمستخدم",
    cat: "المنظومة الصحية",
  },
  {
    q: "ما هي منصة صحة",
    a: "منصة صحة هي منصة إلكترونية تهدف إلى تحقيق وتوفير نظام بيئي صحي في المملكة العربية السعودية، ويقدم العديد من الخدمات الصحية الموثوقة والسريعة تحت مظلة منظومة الصحة وقطاعاتها المتنوعة للمنشآت الطبية والأفراد.",
    cat: "المنظومة الصحية",
  },
  {
    q: "ما هي منصة صحتي",
    a: "صحتي هي منصة المواطن الأولى للأفراد في المملكة العربية السعودية. تتيح المنصة للمستخدم الوصول إلى معلوماته وعدد من الخدمات الصحية من الجهات المختلفة في القطاع الصحي.",
    cat: "المنظومة الصحية",
  },
  {
    q: "ما هي منصة أناة",
    a: "أناة هي منصة تقدم خدمات إلكترونية للممارسين الصحيين (المواطنين والمقيمين) وتسهل طرق التواصل فيما بينهم لتبادل الخبرات العلمية، كما تقوم بوصلهم بالمراجعين لرفع مستوى الخدمات الصحية المقدمة للمرضى.",
    cat: "المنظومة الصحية",
  },
  {
    q: "كيف أستفيد من خدمات الاستعلامات",
    a: "يمكنك الاستفادة من خدمات الاستعلامات من خلال صفحة الاستعلامات في منصة صحة، حيث تتوفر خدمات الاستعلام عن الإجازات المرضية والتقارير الطبية وشهادات فحص الزواج والمنشآت الصحية وغيرها.",
    cat: "المنظومة الصحية",
  },
  {
    q: "كيف يمكن التحقق من شهادة فحص الزواج",
    a: "من خلال صفحة الاستعلامات، اختر خدمة الاستعلام عن شهادات فحص الزواج ثم أدخل رمز الخدمة ورقم الهوية أو الإقامة للاطلاع على الشهادة والتحقق من صلاحيتها.",
    cat: "المنظومة الصحية",
  },
  {
    q: "من هم شركاء منصة صحة",
    a: "تضم منظومة صحة عدداً من الشركاء من القطاع الحكومي والخاص، من أبرزهم وزارة الصحة والجهات الحكومية المشاركة في المنظومة الصحية الرقمية بالمملكة العربية السعودية.",
    cat: "شركاؤنا",
  },
  {
    q: "كيف يمكنني أن أصبح شريكاً لمنصة صحة",
    a: "للرغبة في الشراكة مع منصة صحة، يمكنك التواصل معنا عبر صفحة تواصل معنا واختيار وسيلة التواصل المناسبة وسيقوم الفريق المختص بالرد على طلبك في أقرب وقت.",
    cat: "شركاؤنا",
  },
  {
    q: "ما هي أوقات العمل لدعم منصة صحة",
    a: "أوقات العمل: الأحد حتى الخميس من 8 صباحاً حتى 11 مساءً، ويمكنك التواصل عبر الرقم الموحد 920002005 أو البريد الإلكتروني support@seha.sa.",
    cat: "تواصل معنا",
  },
  {
    q: "كيف أتواصل مع الدعم الفني",
    a: "يمكنك التواصل مع الدعم الفني عن طريق الرقم الموحد 920002005 أو إرسال رسالة قصيرة على نفس الرقم أو عبر البريد الإلكتروني support@seha.sa، كما يمكنك استخدام نموذج التواصل في صفحة تواصل معنا.",
    cat: "تواصل معنا",
  },
];

const PAGE_SIZE = 5;

function SearchGlyph() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15.14" height="15.14" viewBox="0 0 15.136 15.136" aria-hidden="true">
      <path fill="#306db5" d="M18.49,17.7l-4.23-4.252a6.162,6.162,0,1,0-.812.812L17.7,18.49ZM4.484,9.526a5.042,5.042,0,1,1,5.042,5.042A5.042,5.042,0,0,1,4.484,9.526Z" transform="translate(-3.353 -3.353)" />
    </svg>
  );
}

export function FaqPage({ onNavigate }: { onNavigate: Nav }) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<string>("الكل");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim();
    return FAQ_ITEMS.filter((f) => {
      const matchesCat = cat === "الكل" || f.cat === cat;
      const matchesQuery = !q || f.q.includes(q) || f.a.includes(q);
      return matchesCat && matchesQuery;
    });
  }, [query, cat]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="faq-page" dir="rtl">
      {/* Controls: search + category chips */}
      <div className="faq-page__controls">
        <form className="faq-page__search" role="search" onSubmit={(e) => e.preventDefault()}>
          <div className="faq-page__input-group">
            <span className="faq-page__input-prepend">
              <SearchGlyph />
            </span>
            <input
              type="search"
              className="faq-page__input"
              placeholder="بحث"
              aria-label="بحث في الأسئلة الشائعة"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </form>

        <div className="faq-page__chips" role="tablist" aria-label="تصنيفات الأسئلة">
          {FAQ_CATEGORIES.map((c) => (
            <button
              type="button"
              role="tab"
              key={c}
              aria-selected={cat === c}
              className={`services-chip${cat === c ? " is-active" : ""}`}
              onClick={() => {
                setCat(c);
                setPage(1);
              }}
            >
              {c}
              {c === "الكل" && <span className="faq-chip__count">{FAQ_ITEMS.length}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Accordion */}
      <div className="questions-wrapper">
        {pageItems.length > 0 ? (
          <div className="home-faq-accordion accordion">
            {pageItems.map((item, i) => {
              const isOpen = open === i;
              return (
                <div className="accordion-item" key={item.q}>
                  <h2 className="accordion-header">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      className={`accordion-button${isOpen ? "" : " collapsed"}`}
                      onClick={() => setOpen(isOpen ? null : i)}
                    >
                      <span className="home-faq-question-text">{item.q}</span>
                      <span className={`accordion-chevron${isOpen ? " is-open" : ""}`} aria-hidden="true">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </span>
                    </button>
                  </h2>
                  <div className={`accordion-collapse${isOpen ? " show" : ""}`}>
                    <div className="accordion-body">{item.a}</div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="services-page__empty">
            <p>لا توجد أسئلة مطابقة لبحثك</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pageCount > 1 && (
        <nav className="faq-pagination" aria-label="صفحات الأسئلة">
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
            <button
              type="button"
              key={n}
              className={`faq-page-btn${n === safePage ? " is-active" : ""}`}
              aria-current={n === safePage ? "page" : undefined}
              onClick={() => {
                setPage(n);
                setOpen(null);
              }}
            >
              {n}
            </button>
          ))}
        </nav>
      )}

      {/* Suggestions card */}
      <div className="faq-suggestions">
        <div className="faq-suggestions__icon" aria-hidden="true">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            <path d="M8 10h.01M12 10h.01M16 10h.01" />
          </svg>
        </div>
        <div className="faq-suggestions__body">
          <h3>التعليقات والاقتراحات</h3>
          <p>لأي استفسارات أو ملاحظات، يرجى التواصل معنا وسنكون سعداء بمساعدتك.</p>
        </div>
        <button type="button" className="faq-suggestions__btn" onClick={() => onNavigate("contact")}>
          تواصل معنا
        </button>
      </div>
    </div>
  );
}
