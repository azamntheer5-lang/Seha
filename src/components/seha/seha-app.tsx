"use client";

import { useCallback, useEffect, useState } from "react";
import { SehaHeader } from "./seha-header";
import { SehaFooter } from "./seha-footer";
import { SickLeaveInquiry } from "./sick-leave-inquiry";
import { InquiriesIndex } from "./inquiries-index";
import { HomePage } from "./home-page";
import { ServicesPage } from "./services-page";
import { SehaPlusPage } from "./seha-plus-page";
import { FaqPage } from "./faq-page";
import { ContactPage } from "./contact-page";
import { FloatingWidgets } from "./floating-widgets";
import { hashToRoute, routeToHash, routeToTab } from "./seha-types";
import type { SehaRoute } from "./seha-types";

/**
 * Application shell — hash-routed SPA identical to the reference platform:
 *
 *   #/                     → home (animated slider, services, ecosystem…)
 *   #/cms/services         → services index
 *   #/seha-plus            → Seha Plus landing
 *   #/inquiries            → inquiries index
 *   #/inquiries/slenquiry  → sick-leave enquiry (default on first load)
 *   #/faq                  → FAQ
 *   #/ContactUs            → contact
 *
 * The sick-leave page keeps the exact extracted structure:
 *   .hero-banner-wrapper (breadcrumb + h1) → main.sl-inquiry-main → footer.
 * Every other route renders its own hero band + content + shared footer.
 */
export function SehaApp() {
  // First paint: no hash yet → the sick-leave enquiry (page centerpiece).
  const [route, setRoute] = useState<SehaRoute>("sl");
  const [a11yOpen, setA11yOpen] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [highContrast, setHighContrast] = useState(false);

  // ---- Hash router (identical mental model to the reference React SPA) ----
  useEffect(() => {
    const apply = (scroll: boolean) => {
      const next: SehaRoute = window.location.hash
        ? hashToRoute(window.location.hash)
        : "sl";
      setRoute((prev) => (prev === next ? prev : next));
      if (scroll) window.scrollTo({ top: 0, behavior: "auto" });
    };
    const onHashChange = () => apply(true);
    window.addEventListener("hashchange", onHashChange);
    // Initial deep-link sync — deferred a tick so the state update never
    // cascades synchronously inside the effect body.
    const t = window.setTimeout(() => apply(false), 0);
    return () => {
      window.removeEventListener("hashchange", onHashChange);
      window.clearTimeout(t);
    };
  }, []);

  /** Navigate to a route — sets the hash; the hashchange listener syncs state. */
  const navigate = useCallback((next: SehaRoute) => {
    const target = routeToHash(next);
    if (window.location.hash === target) {
      setRoute(next); // same hash → still re-render + scroll
      window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }
    window.location.hash = target;
  }, []);

  // Apply the exact reference body classes for accessibility options.
  useEffect(() => {
    document.body.classList.toggle("a11y-large-text", largeText);
    document.body.classList.toggle("a11y-high-contrast", highContrast);
    return () => {
      document.body.classList.remove("a11y-large-text", "a11y-high-contrast");
    };
  }, [largeText, highContrast]);

  const activeTab = routeToTab(route);
  const isHome = route === "home";
  const isSickLeave = route === "sl";

  // ---- Hero band copy per route (breadcrumb + h1 + description) ----------
  const hero = (() => {
    switch (route) {
      case "services":
        return {
          crumbs: [
            { label: "الرئيسية", route: "home" as SehaRoute },
            { label: "الخدمات", route: null },
          ],
          title: "الخدمات",
          desc: "تصفح جميع الخدمات الصحية الإلكترونية المقدمة من منصة صحة والجهات الشريكة في المنظومة الصحية.",
        };
      case "seha-plus":
        return {
          crumbs: [
            { label: "الرئيسية", route: "home" as SehaRoute },
            { label: "صحة بلس", route: null },
          ],
          title: "صحة بلس",
          desc: "يجمع صحة بلس المؤشرات التشغيلية والسريرية والمالية في لوحة تنفيذية واحدة، تمنح القيادات الصحية رؤية لحظية تدعم اتخاذ القرار، وتحسين الأداء، والاستفادة المثلى من الموارد.",
        };
      case "inquiries":
        return {
          crumbs: [
            { label: "الرئيسية", route: "home" as SehaRoute },
            { label: "الاستعلامات", route: null },
          ],
          title: "الاستعلامات",
          desc: "اختر الخدمة التي تريد الاستعلام عنها.",
        };
      case "sl":
        return {
          crumbs: [
            { label: "الرئيسية", route: "home" as SehaRoute },
            { label: "الاستعلامات", route: "inquiries" as SehaRoute },
            { label: "الإجازات المرضية", route: null },
          ],
          title: "الإجازات المرضية",
          desc: "خدمة الاستعلام عن الإجازات المرضية تتيح لك الاستعلام عن حالة طلبك للإجازة ويمكنك طباعتها عن طريق تطبيق صحتي",
        };
      case "faq":
        return {
          crumbs: [
            { label: "الرئيسية", route: "home" as SehaRoute },
            { label: "الأسئلة الشائعة", route: null },
          ],
          title: "الأسئلة الشائعة",
          desc: "اعثر على إجابات للأسئلة الشائعة حول منتجاتنا، خدماتنا، وسياساتنا.",
        };
      case "contact":
        return {
          crumbs: [
            { label: "الرئيسية", route: "home" as SehaRoute },
            { label: "تواصل معنا", route: null },
          ],
          title: "تواصل معنا",
          desc: "نسعد بتواصلك معنا، اختر وسيلة التواصل المناسبة أو أرسل لنا رسالتك وسنقوم بالرد في أقرب وقت.",
        };
      default:
        return null;
    }
  })();

  return (
    <div className="app-shell">
      <SehaHeader activeTab={activeTab} onNavigate={navigate} />

      {/* ============ مسار التنقل + ترويسة الصفحة (كل الصفحات عدا الرئيسية) ============ */}
      {hero && (
        <div className="hero-banner-wrapper">
          <div className="page-content-breadcrumb-row">
            <div className="page-content-breadcrumb-row__inner">
              <div className="warp-breadcrumb" data-testid="breadcrumb">
                <nav aria-label="breadcrumb">
                  <ol className="breadcrumb">
                    {hero.crumbs.map((c, i) =>
                      c.route ? (
                        <li className="breadcrumb-item" key={i}>
                          <a
                            href={routeToHash(c.route)}
                            onClick={(e) => {
                              e.preventDefault();
                              navigate(c.route!);
                            }}
                          >
                            {c.label}
                          </a>
                        </li>
                      ) : (
                        <li
                          className="breadcrumb-item active"
                          aria-current="page"
                          key={i}
                        >
                          {c.label}
                        </li>
                      )
                    )}
                  </ol>
                </nav>
              </div>
            </div>
          </div>

          <div className="sl-inquiry" dir="rtl">
            <section className="sl-inquiry__hero">
              <div className="sl-inquiry__hero-inner">
                <h1>{hero.title}</h1>
                <p>{hero.desc}</p>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* ============ المحتوى الرئيسي حسب المسار ============ */}
      {isHome ? (
        <HomePage onNavigate={navigate} />
      ) : route === "services" ? (
        <main className="sl-inquiry-main page-main">
          <ServicesPage onNavigate={navigate} />
        </main>
      ) : route === "seha-plus" ? (
        <SehaPlusPage onNavigate={navigate} />
      ) : route === "faq" ? (
        <main className="sl-inquiry-main page-main">
          <FaqPage onNavigate={navigate} />
        </main>
      ) : route === "contact" ? (
        <main className="sl-inquiry-main page-main">
          <ContactPage />
        </main>
      ) : isSickLeave ? (
        <main className="sl-inquiry-main">
          <SickLeaveInquiry />
        </main>
      ) : (
        <main className="sl-inquiry-main page-main">
          <InquiriesIndex onOpenSickLeave={() => navigate("sl")} />
        </main>
      )}

      <SehaFooter
        onNavigate={navigate}
        onOpenA11y={() => setA11yOpen((v) => !v)}
      />

      <FloatingWidgets
        popoverOpen={a11yOpen}
        onTogglePopover={() => setA11yOpen((v) => !v)}
        largeText={largeText}
        onToggleLargeText={() => setLargeText((v) => !v)}
        highContrast={highContrast}
        onToggleContrast={() => setHighContrast((v) => !v)}
      />
    </div>
  );
}
