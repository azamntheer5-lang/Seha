"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SehaRoute } from "./seha-types";

/* ==================================================================
 * HOME PAGE — full 1:1 rebuild of the reference platform landing:
 *   1. Hero slider      (7 slides · autoplay · dots · animated SVG logo)
 *   2. الخدمات          (category tabs + horizontally scrolled cards)
 *   3. المنظومة الصحية  (3 ecosystem cards)
 *   4. شركاء صحة        (partner logo carousel)
 *   5. كيف يمكننا مساعدتك (FAQ accordion preview)
 * All sections animate in on scroll (IntersectionObserver reveal).
 * ================================================================== */

type Nav = (route: SehaRoute) => void;

/* ------------------------------------------------------------------
 * Shared: scroll-reveal hook (adds .revealed when section enters view)
 * ----------------------------------------------------------------- */
function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);
  return ref;
}

/* ==================================================================
 * 1. HERO SLIDER
 *    3 photo slides (baked campaign images) + 4 text/CTA slides.
 *    Exact text-slide palette measured from the reference:
 *      bg #0E1B33 · title #FFFFFF · subtitle #D7E3F5 · desc #D3D5DA
 * ================================================================== */

type TextSlide = {
  kind: "text";
  service: string;
  title: string;
  desc: string;
  cta: SehaRoute;
};

type PhotoSlide = {
  kind: "photo";
  src: string;
  alt: string;
};

const HERO_SLIDES: (TextSlide | PhotoSlide)[] = [
  { kind: "photo", src: "/assets/home/slide-platform.png", alt: "منصة صحية رقمية تقدم حلول صحية متكاملة" },
  { kind: "photo", src: "/assets/home/slide-services.png", alt: "أبرز خدماتنا" },
  {
    kind: "text",
    service: "خدمة",
    title: "ترخيص الترميز الطبي الأسترالي",
    desc: "الآن يمكنك إصدار ترخيص الترميز الطبي الأسترالي \"ICD-10 AM/ACHI\" الترميز الطبي هو آلية تحويل الأسماء أو المصطلحات الطبية للأمراض إلى رموز سواء كانت مكونة من أرقام أو حروف لتمكين القطاع الصحي وقطاع التأمين من: تسهيل وتسريع الإجراءات، المساهمة في رفع مستوى جودة البرامج الخاصة بسلامة المرضى، تحسين الرعاية الصحية وفعاليتها.",
    cta: "services",
  },
  {
    kind: "text",
    service: "خدمة",
    title: "الشهادات الصحية",
    desc: "هي إحدى خدمات التقارير الطبية وتتمثل في الربط الإلكتروني لنتائج الفحص الطبي بحيث يتسنى للمستفيد إجراء الفحص في المنشآت الصحية المرخصة وإرسال نتيجة الفحص إلكترونيا للجهة المسؤولة بما يمكن من الإصدار الإلكتروني للشهادات الصحية.",
    cta: "inquiries",
  },
  {
    kind: "text",
    service: "خدمة",
    title: "الإجازة المرضية",
    desc: "هي خدمة تتيح للمنشآت الصحية تسجيل الإجازات المرضية والتحقق من صحة بيانات المرضى، الأطباء، والمنشآت الصحية وموثوقية مصدرها المعتمد، وتتيح للأفراد إمكانية الوصول الى الإجازات المرضية إلكترونيا.",
    cta: "sl",
  },
  {
    kind: "text",
    service: "خدمة",
    title: "الوصفة الإلكترونية",
    desc: "خدمة تتيح إمكانية صرف الوصفات الطبية إلكترونيا للصيدليات المسجلة في منصة صحة حيث توفر الخدمة إمكانية متابعة عدد الوصفات المصروفة من المنشأة. جميع الوصفات المصدرة إلكترونيا موثوقة المصدر مع إمكانية التواصل مع الطبيب المصدر للوصفة الطبية الإلكترونية.",
    cta: "services",
  },
  { kind: "photo", src: "/assets/home/slide-plus.png", alt: "استكشف اشتراك بلس" },
];

const AUTOPLAY_MS = 6000;

function HeroSlider({ onNavigate }: { onNavigate: Nav }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const count = HERO_SLIDES.length;

  const go = useCallback(
    (next: number) => {
      setIndex(((next % count) + count) % count);
      // Restart the autoplay countdown after any manual interaction —
      // identical to Swiper's `autoplay.disableOnInteraction: false` reset.
      setResetKey((k) => k + 1);
    },
    [count]
  );

  // Autoplay — paused on hover/focus; timer restarts on manual navigation.
  useEffect(() => {
    if (paused) return;
    const t = window.setInterval(() => {
      setIndex((i) => (i + 1) % count);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(t);
  }, [paused, count, resetKey]);

  // Keyboard arrows for a11y.
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") go(index + 1);
    if (e.key === "ArrowRight") go(index - 1);
  };

  return (
    <section
      className="home-hero"
      aria-label="الخدمات المميزة"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      tabIndex={-1}
      onKeyDown={onKey}
    >
      <div className="home-hero__viewport">
        <div
          className="home-hero__track"
          style={{ transform: `translateX(${index * 100}%)` }}
          aria-live="off"
        >
          {HERO_SLIDES.map((slide, i) => (
            <div
              className={`home-hero__slide home-hero__slide--${slide.kind}${i === index ? " is-active" : ""}`}
              key={i}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} من ${count}`}
              aria-hidden={i !== index}
            >
              {slide.kind === "photo" ? (
                <div className="home-hero__photo">
                  <img src={slide.src} alt={slide.alt} draggable={false} />
                </div>
              ) : (
                <>
                  {/* Animated platform logo watermark — the exact SVGator asset */}
                  <object
                    type="image/svg+xml"
                    data="/assets/seha-logo-animation.svg"
                    className="home-hero__logo-anim"
                    aria-hidden="true"
                    tabIndex={-1}
                  />
                  <div className="home-hero__content">
                    <h1 className="home-hero__service">{slide.service}</h1>
                    <h3 className="home-hero__title">{slide.title}</h3>
                    <p className="home-hero__desc">{slide.desc}</p>
                    <div className="home-hero__cta">
                      <button
                        type="button"
                        className="home-hero__cta-btn"
                        onClick={() => onNavigate(slide.cta)}
                      >
                        <span>الدخول للخدمة</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Prev / Next arrows (desktop) */}
        <button
          type="button"
          className="home-hero__nav home-hero__nav--prev"
          aria-label="الشريحة السابقة"
          onClick={() => go(index - 1)}
        >
          <svg width="8" height="14" viewBox="0 0 7.5 13.5" fill="none" aria-hidden="true">
            <path d="M0.21967 0.21967C-0.0732232 0.512563 -0.0732232 0.987437 0.21967 1.28033L5.68934 6.75L0.21967 12.2197C-0.0732232 12.5126 -0.0732232 12.9874 0.21967 13.2803C0.512563 13.5732 0.987437 13.5732 1.28033 13.2803L7.28033 7.28033C7.57322 6.98744 7.57322 6.51256 7.28033 6.21967L1.28033 0.21967C0.987437 -0.0732233 0.512563 -0.0732233 0.21967 0.21967Z" fill="currentColor" />
          </svg>
        </button>
        <button
          type="button"
          className="home-hero__nav home-hero__nav--next"
          aria-label="الشريحة التالية"
          onClick={() => go(index + 1)}
        >
          <svg width="8" height="14" viewBox="0 0 7.5 13.5" fill="none" aria-hidden="true">
            <path d="M7.28033 0.21967C7.57322 0.512563 7.57322 0.987437 7.28033 1.28033L1.81066 6.75L7.28033 12.2197C7.57322 12.5126 7.57322 12.9874 7.28033 13.2803C6.98744 13.5732 6.51256 13.5732 6.21967 13.2803L0.21967 7.28033C-0.0732233 6.98744 -0.0732233 6.51256 0.21967 6.21967L6.21967 0.21967C6.51256 -0.0732233 6.98744 -0.0732233 7.28033 0.21967Z" fill="currentColor" />
          </svg>
        </button>
      </div>

      {/* Dots — active dot in platform green #1B8354 (exact reference) */}
      <div className="home-hero__dots" role="tablist" aria-label="شرائح الخدمات">
        {HERO_SLIDES.map((_, i) => (
          <button
            type="button"
            key={i}
            role="tab"
            aria-selected={i === index}
            aria-label={`الشريحة ${i + 1}`}
            className={`home-hero__dot${i === index ? " is-active" : ""}`}
            onClick={() => go(i)}
          />
        ))}
      </div>

      {/* Animated scroll cue */}
      <div className="home-hero__scroll-cue" aria-hidden="true">
        <svg width="22" height="34" viewBox="0 0 22 34" fill="none">
          <rect x="1" y="1" width="20" height="32" rx="10" stroke="#1B8354" strokeWidth="2" />
          <circle className="scroll-cue-dot" cx="11" cy="10" r="3" fill="#1B8354" />
        </svg>
      </div>
    </section>
  );
}

/* ==================================================================
 * 2. SERVICES — tabs + horizontally scrolled svc-cards (9 cards)
 * ================================================================== */

const SERVICE_CATEGORIES = [
  "الكل",
  "التراخيص الصحية",
  "التقارير والشهادات الصحية",
  "قياس الالتزام",
  "البلاغات الصحية",
  "الصحة العامة والوقاية",
  "أخرى",
] as const;

type ServiceCard = {
  title: string;
  desc: string;
  tag: string;
  view: SehaRoute;
};

const SERVICE_CARDS: ServiceCard[] = [
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
];

/** Document icon — the ant-design file-text glyph used by every reference card. */
function FileTextIcon() {
  return (
    <svg viewBox="64 64 896 896" focusable="false" width="1em" height="1em" fill="currentColor" aria-hidden="true">
      <path d="M854.6 288.6L639.4 73.4c-6-6-14.1-9.4-22.6-9.4H192c-17.7 0-32 14.3-32 32v832c0 17.7 14.3 32 32 32h640c17.7 0 32-14.3 32-32V311.3c0-8.5-3.4-16.7-9.4-22.7zM790.2 326H602V137.8L790.2 326zm1.8 562H232V136h302v216a42 42 0 0042 42h216v494zM504 618H320c-4.4 0-8 3.6-8 8v48c0 4.4 3.6 8 8 8h184c4.4 0 8-3.6 8-8v-48c0-4.4-3.6-8-8-8zM312 490v48c0 4.4 3.6 8 8 8h384c4.4 0 8-3.6 8-8v-48c0-4.4-3.6-8-8-8H320c-4.4 0-8 3.6-8 8z"></path>
    </svg>
  );
}

function ServiceCardView({ card, onNavigate }: { card: ServiceCard; onNavigate: Nav }) {
  return (
    <article className="svc-card">
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
  );
}

function ServicesSection({ onNavigate }: { onNavigate: Nav }) {
  const [tab, setTab] = useState<string>("الكل");
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const reveal = useReveal<HTMLDivElement>();

  const filtered =
    tab === "الكل" ? SERVICE_CARDS : SERVICE_CARDS.filter((c) => c.tag === tab);

  const scrollBy = (dir: 1 | -1) => {
    scrollerRef.current?.scrollBy({ left: dir * -360, behavior: "smooth" });
  };

  return (
    <section className="home-services" dir="rtl" aria-labelledby="home-services-title" ref={reveal}>
      <div className="home-services__inner">
        <div className="home-services__header">
          <div>
            <h2 id="home-services-title" className="home-services__title">الخدمات</h2>
            <p className="home-services__subtitle">الخدمات الأكثر استخداما</p>
          </div>
          <button
            type="button"
            className="home-services__all"
            onClick={() => onNavigate("services")}
          >
            <span className="home-services__all-label">عرض كل الخدمات</span>
          </button>
        </div>

        <div className="home-services__body">
          <aside className="home-services__menu" role="tablist" aria-label="الخدمات">
            {SERVICE_CATEGORIES.map((cat) => (
              <button
                type="button"
                role="tab"
                key={cat}
                aria-selected={tab === cat}
                className={`home-services__tab${tab === cat ? " is-active" : ""}`}
                onClick={() => setTab(cat)}
              >
                <span className="home-services__tab-label">{cat}</span>
              </button>
            ))}
          </aside>

          <div className="home-services__cards-wrap">
            <button
              type="button"
              className="cards-nav cards-nav--prev"
              aria-label="الخدمات السابقة"
              onClick={() => scrollBy(-1)}
            >
              <svg width="8" height="14" viewBox="0 0 7.5 13.5" fill="none" aria-hidden="true">
                <path d="M0.21967 0.21967C-0.0732232 0.512563 -0.0732232 0.987437 0.21967 1.28033L5.68934 6.75L0.21967 12.2197C-0.0732232 12.5126 -0.0732232 12.9874 0.21967 13.2803C0.512563 13.5732 0.987437 13.5732 1.28033 13.2803L7.28033 7.28033C7.57322 6.98744 7.57322 6.51256 7.28033 6.21967L1.28033 0.21967C0.987437 -0.0732233 0.512563 -0.0732233 0.21967 0.21967Z" fill="currentColor" />
              </svg>
            </button>

            <div className="home-services__cards" ref={scrollerRef}>
              {filtered.map((card) => (
                <div className="home-services__slide" key={card.title}>
                  <ServiceCardView card={card} onNavigate={onNavigate} />
                </div>
              ))}
            </div>

            <button
              type="button"
              className="cards-nav cards-nav--next"
              aria-label="الخدمات التالية"
              onClick={() => scrollBy(1)}
            >
              <svg width="8" height="14" viewBox="0 0 7.5 13.5" fill="none" aria-hidden="true">
                <path d="M7.28033 0.21967C7.57322 0.512563 7.57322 0.987437 7.28033 1.28033L1.81066 6.75L7.28033 12.2197C7.57322 12.5126 7.57322 12.9874 7.28033 13.2803C6.98744 13.5732 6.51256 13.5732 6.21967 13.2803L0.21967 7.28033C-0.0732233 6.98744 -0.0732233 6.51256 0.21967 6.21967L6.21967 0.21967C6.51256 -0.0732233 6.98744 -0.0732233 7.28033 0.21967Z" fill="currentColor" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ==================================================================
 * 3. ECOSYSTEM — المنظومة الصحية (3 platform cards on a pill panel)
 * ================================================================== */

type EchoCard = {
  logo: string;
  logoAlt: string;
  title: string;
  image: string;
  imageAlt: string;
  desc: string;
  stores: { label: string; href: string; icon: "apple" | "google" | "globe" }[];
};

const ECOSYSTEM_CARDS: EchoCard[] = [
  {
    logo: "/assets/DGA_Sehity_icon-CALFs9RR.svg",
    logoAlt: "منصة صحتي",
    title: "منصة صحتي",
    image: "/assets/DGA_SehityImage-BCvVtLhQ.svg",
    imageAlt: "تطبيق صحتي",
    desc: " صحتي هي منصة المواطن الأولى للأفراد في المملكة العربية السعودية. تتيح المنصة للمستخدم الوصول إلى معلوماته وعدد من الخدمات الصحية من الجهات المختلفة في القطاع الصحي ",
    stores: [
      { label: "منصة صحتي - App Store", href: "https://apps.apple.com/sa/app/%D8%B5%D8%AD%D8%AA%D9%8A-sehhaty/id1459266578", icon: "apple" },
      { label: "منصة صحتي - Google Play", href: "https://play.google.com/store/apps/details?id=com.lean.sehhaty", icon: "google" },
    ],
  },
  {
    logo: "/assets/seha-dBev2RMA.svg",
    logoAlt: "منصة صحة",
    title: "منصة صحة",
    image: "/assets/DGA_SehaImage-D1BlXisf.svg",
    imageAlt: "منصة صحة",
    desc: "منصة صحة هي منصة إلكترونية تهدف إلى تحقيق وتوفير نظام بيئي صحي في المملكة العربية السعودية، ويقدم العديد من الخدمات الصحية الموثوقة والسريعة تحت مظلة منظومة الصحة وقطاعاتها المتنوعة للمنشآت الطبية والأفراد",
    stores: [{ label: "منصة صحة - Website", href: "https://www.seha.sa", icon: "globe" }],
  },
  {
    logo: "/assets/anat-2X1lpwbp.svg",
    logoAlt: "منصة أناة",
    title: "منصة أناة",
    image: "/assets/DGA_SehaAnat_Image-BAOH6tns.svg",
    imageAlt: "منصة أناة",
    desc: "أناة هي منصة تقدم خدمات إلكترونية للممارسين الصحيين (المواطنين والمقيمين) وتسهل طرق التواصل فيما بينهم لتبادل الخبرات العلمية، كما تقوم بوصلهم بالمراجعين لرفع مستوى الخدمات الصحية المقدمة للمرضى",
    stores: [
      { label: "منصة أناة - App Store", href: "https://apps.apple.com/sa", icon: "apple" },
      { label: "منصة أناة - Google Play", href: "https://play.google.com", icon: "google" },
    ],
  },
];

function AppleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16.8" height="20" viewBox="0 0 16.807 20" aria-hidden="true">
      <path fill="#2969b6" d="M14.334,12.819a4.168,4.168,0,0,1,2.233-3.786,4.8,4.8,0,0,0-3.782-1.992c-1.585-.125-3.318.924-3.952.924-.67,0-2.206-.88-3.412-.88-2.492.04-5.14,1.987-5.14,5.947a11.133,11.133,0,0,0,.643,3.626c.572,1.638,2.634,5.658,4.787,5.59,1.125-.027,1.92-.8,3.385-.8,1.42,0,2.157.8,3.412.8,2.17-.031,4.036-3.684,4.581-5.327a4.427,4.427,0,0,1-2.755-4.1ZM11.806,5.488A4.206,4.206,0,0,0,12.878,2.25,4.732,4.732,0,0,0,9.846,3.808,4.272,4.272,0,0,0,8.7,7.019a3.75,3.75,0,0,0,3.1-1.532Z" transform="translate(-0.281 -2.25)" />
    </svg>
  );
}

function GooglePlayIcon() {
  return (
    <svg width="18" height="22" viewBox="0 0 18 22" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M7 21L7 18.75L11 18.75V21C11 21.5523 11.4477 22 12 22C12.5523 22 13 21.5523 13 21V18.715C13.0852 18.7077 13.1672 18.699 13.2459 18.6884C13.7375 18.6223 14.2088 18.4732 14.591 18.091C14.9732 17.7087 15.1223 17.2375 15.1884 16.7458C15.2501 16.2871 15.25 15.7143 15.25 15.0494L15.25 10.75C15.25 10.2786 15.25 10.0429 15.1036 9.89645C14.9571 9.75 14.7214 9.75 14.25 9.75L3.75001 9.75C3.2786 9.75 3.0429 9.75 2.89645 9.89645C2.75001 10.0429 2.75001 10.2786 2.75001 10.75L2.75 15.0494C2.74997 15.7142 2.74994 16.2871 2.81161 16.7458C2.87771 17.2375 3.02685 17.7087 3.40906 18.091C3.79128 18.4732 4.26254 18.6223 4.75417 18.6884C4.84289 18.7003 4.93534 18.7097 5.03085 18.717M1 1.91379L10.5065 8.75011C11.0737 9.17372 11.0737 9.82637 10.5065 10.25L1 17.0863C1 18.7318 1 19.5545 1.38473 19.9398C1.57494 20.1303 1.83249 20.225 2.22224 20.2724C2.61199 20.25 3.13332 20.25 4.17432 20.25C5.24999 20.25 5.78783 20.25 6.25 20.1271L17 1.91379C17 1.91379 15.0474 1 12 1C8.95263 1 8.64568 1.91379 8 1.91379" stroke="#2969b6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M11 1C9.55913 1 8.14129 1.42787 6.93853 2.23014C5.73577 3.03241 4.80243 4.17229 4.25839 5.50189C3.71434 6.83148 3.58442 8.29132 3.88486 9.69527C4.1853 11.0992 4.90277 12.3839 5.9467 13.3889C6.99063 14.394 8.31285 15.0859 9.74967 15.3747C11.1865 15.6635 12.6748 15.5361 14.0401 15.0085C15.4054 14.4809 16.5868 13.5772 17.4324 12.414C18.278 11.2508 18.75 9.88107 18.75 8.47727C18.7485 7.54534 18.56 6.62263 18.195 5.76283C17.83 4.90303 17.2958 4.12292 16.6226 3.46762C15.9494 2.81231 15.1505 2.29466 14.2716 1.94414C13.3926 1.59361 12.4507 1.41714 11.5 1.42432" stroke="#2969b6" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M18.75 8.47727C17.2994 9.74258 12.25 10.6602 3.73611 9.47205M2.5 6.06932C6.22222 6.75107 14.3556 7.1318 18.75 6.06932M11.5889 1.44318C9.9 3.77841 8.45556 11.342 10.3889 15.2301M13.5278 1.82102C15.4722 5.27159 14.8611 11.8864 11.7 15.0216" stroke="#2969b6" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function EcosystemSection() {
  const reveal = useReveal<HTMLDivElement>();
  return (
    <section className="home-page__section home-eco" id="home-ecosystem" aria-labelledby="home-ecosystem-title">
      <div className="seha-eco-container text-center" dir="rtl" ref={reveal}>
        <div className="seha-eco-panel">
          {/* Pill-shaped panel background (exact reference SVG shape) */}
          <img
            src="data:image/svg+xml,%3csvg%20id='Group_4283'%20data-name='Group%204283'%20xmlns='http://www.w3.org/2000/svg'%20width='1539'%20height='650'%20viewBox='0%200%201539%20650'%3e%3cpath%20id='Path_8196'%20data-name='Path%208196'%20d='M1179.5,0h-887C130.957,0,0,136.643,0,305.2S130.957,610.4,292.5,610.4h887c161.543,0,292.5-136.643,292.5-305.2S1341.043,0,1179.5,0Z'%20transform='translate(67%2039.6)'%20fill='%23fafcfe'/%3e%3cg%20id='Rectangle_9409'%20data-name='Rectangle%209409'%20fill='none'%20stroke='%23439ba3'%20stroke-width='1'%20opacity='0.1'%3e%3crect%20width='1472'%20height='610.6'%20rx='305.3'%20stroke='none'/%3e%3crect%20x='0.5'%20y='0.5'%20width='1471'%20height='609.6'%20rx='304.8'%20fill='none'/%3e%3c/g%3e%3c/svg%3e"
            alt=""
            aria-hidden="true"
            className="seha-eco-panel__shape"
          />
          <div className="seha-eco-header">
            <h1 id="home-ecosystem-title" className="heading">المنظومة الصحيّة</h1>
            <p className="seha-eco-subtitle">منصات المنظومة الصحية الرقمية</p>
          </div>

          <div className="seha-eco-cards">
            {ECOSYSTEM_CARDS.map((card) => (
              <div className="echo-card" key={card.title}>
                <img src={card.logo} alt={card.logoAlt} className="echo-card__logo" />
                <div className="echo-card__content">
                  <h1 className="echo-card__title">{card.title}</h1>
                  <img src={card.image} alt={card.imageAlt} aria-hidden="true" className="echo-card__image" />
                  <p className="echo-card__desc">{card.desc}</p>
                  <div className="echo-card__icons echo-card__stores">
                    {card.stores.map((store) => (
                      <a
                        key={store.label}
                        href={store.href}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="echo-card__icon-btn"
                        aria-label={store.label}
                      >
                        <span className="echo-card__icon-leading">
                          {store.icon === "apple" ? <AppleIcon /> : store.icon === "google" ? <GooglePlayIcon /> : <GlobeIcon />}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ==================================================================
 * 4. PARTNERS — شركاء صحة (logo carousel with nav arrows)
 * ================================================================== */

const PARTNER_LOGOS = [
  { src: "/assets/partners/moh.svg", alt: "وزارة الصحة" },
  { src: "/assets/partners/p4.svg", alt: "الشريك 4" },
  { src: "/assets/partners/mot.svg", alt: "وزارة النقل" },
  { src: "/assets/partners/p2.svg", alt: "الشريك 2" },
  { src: "/assets/partners/p5.svg", alt: "الشريك 5" },
  { src: "/assets/partners/p6.svg", alt: "الشريك 6" },
  { src: "/assets/partners/p7.svg", alt: "الشريك 7" },
  { src: "/assets/partners/p8.svg", alt: "الشريك 8" },
  { src: "/assets/partners/p9.svg", alt: "الشريك 9" },
  { src: "/assets/partners/p10.svg", alt: "الشريك 10" },
];

function PartnersSection() {
  const reveal = useReveal<HTMLDivElement>();
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const scrollBy = (dir: 1 | -1) => {
    scrollerRef.current?.scrollBy({ left: dir * -360, behavior: "smooth" });
  };

  return (
    <section className="home-page__section home-page__section--partners" id="home-partners" aria-labelledby="home-partners-title">
      <div className="partner-container text-center" dir="rtl" ref={reveal}>
        <div className="partner-panel">
          <img
            src="data:image/svg+xml,%3csvg%20id='Group_4283'%20data-name='Group%204283'%20xmlns='http://www.w3.org/2000/svg'%20width='1539'%20height='650'%20viewBox='0%200%201539%20650'%3e%3cpath%20id='Path_8196'%20data-name='Path%208196'%20d='M1179.5,0h-887C130.957,0,0,136.643,0,305.2S130.957,610.4,292.5,610.4h887c161.543,0,292.5-136.643,292.5-305.2S1341.043,0,1179.5,0Z'%20transform='translate(67%2039.6)'%20fill='%23fafcfe'/%3e%3cg%20id='Rectangle_9409'%20data-name='Rectangle%209409'%20fill='none'%20stroke='%23439ba3'%20stroke-width='1'%20opacity='0.1'%3e%3crect%20width='1472'%20height='610.6'%20rx='305.3'%20stroke='none'/%3e%3crect%20x='0.5'%20y='0.5'%20width='1471'%20height='609.6'%20rx='304.8'%20fill='none'/%3e%3c/g%3e%3c/svg%3e"
            alt=""
            aria-hidden="true"
            className="partner-panel__shape"
          />
          <div className="partner-header">
            <h1 id="home-partners-title" className="heading">شركاء صحة</h1>
            <p className="partner-subtitle">الجهات الشريكة في المنظومة الصحية</p>
          </div>

          <div className="partner-carousel">
            <button type="button" className="partner-nav partner-nav--prev" aria-label="شركاء صحة" onClick={() => scrollBy(-1)}>
              <svg width="8" height="14" viewBox="0 0 7.5 13.5" fill="none" aria-hidden="true">
                <path d="M0.21967 0.21967C-0.0732232 0.512563 -0.0732232 0.987437 0.21967 1.28033L5.68934 6.75L0.21967 12.2197C-0.0732232 12.5126 -0.0732232 12.9874 0.21967 13.2803C0.512563 13.5732 0.987437 13.5732 1.28033 13.2803L7.28033 7.28033C7.57322 6.98744 7.57322 6.51256 7.28033 6.21967L1.28033 0.21967C0.987437 -0.0732233 0.512563 -0.0732233 0.21967 0.21967Z" fill="currentColor" />
              </svg>
            </button>

            <div className="partner-track" ref={scrollerRef}>
              {PARTNER_LOGOS.map((p, i) => (
                <div className="partner-slide" key={i}>
                  <div className="partner-card">
                      <img src={p.src} alt={p.alt} loading="lazy" />
                  </div>
                </div>
              ))}
            </div>

            <button type="button" className="partner-nav partner-nav--next" aria-label="شركاء صحة" onClick={() => scrollBy(1)}>
              <svg width="8" height="14" viewBox="0 0 7.5 13.5" fill="none" aria-hidden="true">
                <path d="M7.28033 0.21967C7.57322 0.512563 7.57322 0.987437 7.28033 1.28033L1.81066 6.75L7.28033 12.2197C7.57322 12.5126 7.57322 12.9874 7.28033 13.2803C6.98744 13.5732 6.51256 13.5732 6.21967 13.2803L0.21967 7.28033C-0.0732233 6.98744 -0.0732233 6.51256 0.21967 6.21967L6.21967 0.21967C6.51256 -0.0732233 6.98744 -0.0732233 7.28033 0.21967Z" fill="currentColor" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ==================================================================
 * 5. FAQ — كيف يمكننا مساعدتك (accordion preview, 5 items)
 * ================================================================== */

const HOME_FAQS: { q: string; a: string }[] = [
  {
    q: "كيف يمكن تحويل الرصيد من حساب إلى حساب أو من منشاة إلى أخرى",
    a: "يمكن للحساب/المنشأة تحويل الرصيد عن طريق خيار \"التحكم بالرصيد\" ومن ثم الضغط على خيار \"تحويل رصيد\" من أعلى الصفحة ويقوم بعدها المستخدم بإختيار المنشأة التي يرغب تحويل الرصيد من خلالها والمنشأة المحول لها الرصيد",
  },
  {
    q: "كيف يمكن تغيير مدير الحساب الطبي",
    a: "يجب ارسال طلب تغيير مدير حساب الطبي الى الدعم الفني عن طريق البريد الإلكتروني و إرسال نموذج التفويض (مطابق لنموذج المستعمل في تسجيل المنشات) و صورة من هوية مستخدم المدير الحساب الطبي",
  },
  {
    q: "كيف يمكن إضافة المنشاة الصحية",
    a: "يمكن لمدير الحساب من خلال أيقونة \"طلبات إضافة منشآت\" الوصول الى صفحة إضافة منشأة يقوم المستخدم بالضغط على خيار \"إضافة منشأة جديدة\" ويقوم بإتباع الخطوات اللازمة.",
  },
  {
    q: "كيف يمكن شراء باقة",
    a: "يمكن للحساب/المنشأة شراء باقة عن طريق خيار \"التحكم بالرصيد\" ومن ثم الضغط على خيار \"شراء باقة\" من أعلى الصفحة ويقوم بعدها المستخدم بإختيار المنشأة التي يرغب بشراء الباقة وتحديد الباقة المراد شراؤها، مع العلم بضرورة شحن الرصيد قبل شراء الباقة",
  },
  {
    q: "كيف يمكن تغيير دور مدير نظام المنشأة الصحية",
    a: "يجب على مدير الحساب التوجه الى \"إدارة المستخدمون\" و البحث عن المستخدم بدور \"مدير المنشاة الطبية\" و تعديل المستخدم و حذف الدور منه و من ثم إضافة مستخدم جديد او تعديل مستخدم سابق و إضافة دور \"مدير منشاة طبية\" للمستخدم",
  },
];

function FaqSection({ onNavigate }: { onNavigate: Nav }) {
  const [open, setOpen] = useState<number | null>(null);
  const reveal = useReveal<HTMLDivElement>();

  return (
    <section className="home-page__section home-page__section--faq" aria-labelledby="home-faq-title">
      <div className="faq-section-container" dir="rtl" ref={reveal}>
        <div className="faq-header">
          <div>
            <h1 id="home-faq-title" className="heading">كيف يمكننا مساعدتك</h1>
            <p className="sub-heading">الأسئلة الأكثر شيوعا</p>
          </div>
          <button type="button" className="faq-view-all" onClick={() => onNavigate("faq")}>
            عرض الكل
          </button>
        </div>

        <div className="questions-wrapper questions-wrapper--single">
          <div className="wrapper">
            <div className="home-faq-accordion accordion">
              {HOME_FAQS.map((item, i) => {
                const isOpen = open === i;
                return (
                  <div className="accordion-item" key={i}>
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
          </div>
        </div>
      </div>
    </section>
  );
}

/* ==================================================================
 * Scroll-to-top floating button (visible after scrolling down)
 * ================================================================== */
function ScrollTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 500);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      className={`scroll-top-btn${visible ? " show" : ""}`}
      aria-label="العودة إلى الأعلى"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="18 15 12 9 6 15" />
      </svg>
    </button>
  );
}

/* ==================================================================
 * HOME PAGE composition
 * ================================================================== */
export function HomePage({ onNavigate }: { onNavigate: Nav }) {
  return (
    <main className="home-page">
      <HeroSlider onNavigate={onNavigate} />
      <ServicesSection onNavigate={onNavigate} />
      <EcosystemSection />
      <PartnersSection />
      <FaqSection onNavigate={onNavigate} />
      <ScrollTopButton />
    </main>
  );
}
