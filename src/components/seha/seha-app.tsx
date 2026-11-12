"use client";

import { useCallback, useState } from "react";
import { SehaHeader } from "./seha-header";
import { SehaFooter } from "./seha-footer";
import { SickLeaveInquiry } from "./sick-leave-inquiry";
import { InquiriesIndex } from "./inquiries-index";
import { FloatingWidgets } from "./floating-widgets";
import type { SehaView } from "./seha-types";

/**
 * Application shell — single visible route ("/") hosting two client views:
 *  - "sl"        → sick leave enquiry (default, mirrors the linked page)
 *  - "inquiries" → inquiry services index
 * plus the breadcrumb row (inside the green band, like the reference),
 * header and footer.
 */
export function SehaApp() {
  const [view, setView] = useState<SehaView>("sl");

  const navigate = useCallback((next: SehaView) => {
    setView(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SehaHeader view={view} onNavigate={navigate} />

      {/* Breadcrumb row — green band, identical to the reference placement */}
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
                      navigate("sl");
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

      <main className="flex-1">
        {view === "sl" ? (
          <SickLeaveInquiry onBackToInquiries={() => navigate("inquiries")} />
        ) : (
          <InquiriesIndex onOpenSickLeave={() => navigate("sl")} />
        )}
      </main>

      <SehaFooter onNavigateInquiries={navigate} />

      <FloatingWidgets />
    </div>
  );
}
