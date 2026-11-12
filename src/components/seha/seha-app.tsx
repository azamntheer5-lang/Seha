"use client";

import { useCallback, useEffect, useState } from "react";
import { SehaHeader } from "./seha-header";
import { SehaFooter } from "./seha-footer";
import { SickLeaveInquiry } from "./sick-leave-inquiry";
import { InquiriesIndex } from "./inquiries-index";
import { FloatingWidgets } from "./floating-widgets";
import type { SehaView } from "./seha-types";

/**
 * Application shell — exact structure of the extracted page:
 *
 *   .app-header (fixed, 94px)
 *   .hero-banner-wrapper            ← green #F5FBF7 band
 *     .page-content-breadcrumb-row  ← breadcrumb (max-width 1140px)
 *     .sl-inquiry__hero             ← h1 + description (max-width 693px)
 *   main.sl-inquiry-main            ← white, form card centered
 *   .footer-container               ← #F3F4F6 footer
 *   #userwayAccessibilityIcon       ← floating a11y widget
 *
 * Two client views: "sl" (sick-leave enquiry, default) and
 * "inquiries" (services index). Accessibility toggles apply the exact
 * body classes from the reference (a11y-large-text / a11y-high-contrast).
 */
export function SehaApp() {
  const [view, setView] = useState<SehaView>("sl");
  const [activeTab, setActiveTab] = useState("inquiries");
  const [a11yOpen, setA11yOpen] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [highContrast, setHighContrast] = useState(false);

  // Apply the exact reference body classes for accessibility options.
  useEffect(() => {
    document.body.classList.toggle("a11y-large-text", largeText);
    document.body.classList.toggle("a11y-high-contrast", highContrast);
    return () => {
      document.body.classList.remove("a11y-large-text", "a11y-high-contrast");
    };
  }, [largeText, highContrast]);

  const navigate = useCallback((next: SehaView) => {
    setView(next);
    setActiveTab("inquiries");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const goHome = useCallback(() => {
    navigate("sl");
  }, [navigate]);

  return (
    <div className="flex min-h-[calc(100vh-var(--app-header-height))] flex-col bg-white">
      <SehaHeader
        activeTab={activeTab}
        onTabClick={setActiveTab}
        onOpenInquiries={() => navigate("inquiries")}
        onHome={goHome}
      />

      {/* ==================== شريط المسار والترويسة (Hero Banner) ==================== */}
      <div className="hero-banner-wrapper">
        <div className="page-content-breadcrumb-row">
          <div className="page-content-breadcrumb-row__inner">
            <div className="warp-breadcrumb" data-testid="breadcrumb">
              <nav aria-label="breadcrumb">
                <ol className="breadcrumb">
                  <li className="breadcrumb-item">
                    <a
                      href="#/"
                      onClick={(e) => {
                        e.preventDefault();
                        goHome();
                      }}
                    >
                      الرئيسية
                    </a>
                  </li>
                  {view === "sl" ? (
                    <>
                      <li className="breadcrumb-item">
                        <a
                          href="#/inquiries"
                          onClick={(e) => {
                            e.preventDefault();
                            navigate("inquiries");
                          }}
                        >
                          الاستعلامات
                        </a>
                      </li>
                      <li className="breadcrumb-item active" aria-current="page">
                        الإجازات المرضية
                      </li>
                    </>
                  ) : (
                    <li className="breadcrumb-item active" aria-current="page">
                      الاستعلامات
                    </li>
                  )}
                </ol>
              </nav>
            </div>
          </div>
        </div>

        <div className="sl-inquiry" dir="rtl">
          <section className="sl-inquiry__hero">
            <div className="sl-inquiry__hero-inner">
              {view === "sl" ? (
                <>
                  <h1>الإجازات المرضية</h1>
                  <p>
                    خدمة الاستعلام عن الإجازات المرضية تتيح لك الاستعلام عن حالة طلبك
                    للإجازة ويمكنك طباعتها عن طريق تطبيق صحتي
                  </p>
                </>
              ) : (
                <>
                  <h1>الاستعلامات</h1>
                  <p>اختر الخدمة التي تريد الاستعلام عنها.</p>
                </>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* ==================== بطاقة نموذج الاستعلام / بطاقات الخدمات ==================== */}
      <main className="sl-inquiry-main flex-1">
        {view === "sl" ? (
          <SickLeaveInquiry />
        ) : (
          <InquiriesIndex onOpenSickLeave={() => navigate("sl")} />
        )}
      </main>

      <SehaFooter
        onOpenInquiries={() => navigate("inquiries")}
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
