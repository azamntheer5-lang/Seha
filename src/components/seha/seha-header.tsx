"use client";

import { useEffect, useState } from "react";
import { LoginView } from "./login-view";
import { routeToHash } from "./seha-types";
import type { SehaRoute } from "./seha-types";

/**
 * Header — exact 1:1 port of the extracted Sehaty markup:
 *  - fixed .app-header (94px, white, border-bottom #F0F2F5)
 *  - .header-inner (max-width 1280px): logo (right) / desktop nav (≥992px) / hamburger (left)
 *  - slide-out .navbar-collapse-drawer (left, 320px) with login button,
 *    nav links and a register link — identical to the extracted page.
 * Every nav link now navigates the hash router (all buttons work).
 */

/** Brand logo — the exact inline SVG from the extracted page (صحة / Seha By Lean). */
function BrandLogo() {
  return (
    <svg
      width="120"
      height="46"
      viewBox="0 0 150 54"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="منصة صحة"
    >
      <path d="M128 12L142 26L128 40L114 26L128 12Z" fill="#0EA5E9" fillOpacity="0.85" />
      <path d="M118 16L130 28L118 40L106 28L118 16Z" fill="#1E3A8A" fillOpacity="0.9" />
      <text x="52" y="31" fill="#1E293B" fontFamily="Cairo, sans-serif" fontWeight="700" fontSize="24">
        صحة
      </text>
      <text x="48" y="45" fill="#64748B" fontFamily="Cairo, sans-serif" fontWeight="600" fontSize="10">
        Seha By Lean
      </text>
    </svg>
  );
}

const NAV_ITEMS: { key: string; label: string; route: SehaRoute }[] = [
  { key: "home", label: "الرئيسية", route: "home" },
  { key: "services", label: "الخدمات", route: "services" },
  { key: "seha-plus", label: "صحة بلس", route: "seha-plus" },
  { key: "inquiries", label: "الاستعلامات", route: "inquiries" },
  { key: "faq", label: "الأسئلة الشائعة", route: "faq" },
  { key: "contact", label: "تواصل معنا", route: "contact" },
];

export function SehaHeader({
  activeTab,
  onNavigate,
}: {
  /** currently highlighted nav key (e.g. "inquiries") */
  activeTab: string;
  /** navigate the hash router to a route */
  onNavigate: (route: SehaRoute) => void;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  // Close the drawer on Escape — senior a11y hardening.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  /** Shared click behavior for desktop + drawer links. */
  const handleNav = (item: (typeof NAV_ITEMS)[number]) => {
    onNavigate(item.route);
    setDrawerOpen(false);
  };

  const openLogin = () => {
    setDrawerOpen(false);
    setLoginOpen(true);
  };

  return (
    <>
      {/* ==================== الشريط العلوي (Header) ==================== */}
      <header className="app-header">
        <div className="header-inner">
          {/* الشعار جهة اليمين */}
          <a
            className="navbar-brand"
            href={routeToHash("home")}
            title="منصة صحة"
            onClick={(e) => {
              e.preventDefault();
              onNavigate("home");
            }}
          >
            <div className="logo-svg">
              <BrandLogo />
            </div>
          </a>

          {/* روابط التنقل لسطح المكتب */}
          <nav className="desktop-nav" aria-label="التنقل الرئيسي">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.key}
                className={`nav-link${activeTab === item.key ? " active" : ""}`}
                href={routeToHash(item.route)}
                aria-current={activeTab === item.key ? "page" : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  handleNav(item);
                }}
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* أزرار اليسار: زر الهامبرغر */}
          <div className="header-actions">
            <button
              type="button"
              className="hamburger-btn"
              id="openDrawerBtn"
              aria-label="فتح القائمة الجانبية"
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen(true)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" aria-hidden="true">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* ==================== القائمة الجانبية المنبثقة (Drawer) ==================== */}
      <div
        className={`drawer-backdrop${drawerOpen ? " show" : ""}`}
        id="drawerBackdrop"
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />
      <aside
        className={`navbar-collapse-drawer${drawerOpen ? " show" : ""}`}
        id="sideDrawer"
        aria-label="القائمة الجانبية"
        aria-hidden={!drawerOpen}
      >
        <div>
          <div className="drawer-top-bar">
            {/* زر تسجيل دخول أعلى يمين القائمة */}
            <button type="button" className="login-drawer-btn" onClick={openLogin}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>تسجيل دخول</span>
            </button>

            {/* زر إغلاق القائمة (X) أعلى يسار القائمة */}
            <button
              type="button"
              className="close-drawer-btn"
              aria-label="إغلاق القائمة"
              onClick={() => setDrawerOpen(false)}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* روابط القائمة الجانبية */}
          <div className="header-section header-section--tabs navbar-nav">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.key}
                className={`link nav-link${activeTab === item.key ? " active" : ""}`}
                href={routeToHash(item.route)}
                onClick={(e) => {
                  e.preventDefault();
                  handleNav(item);
                }}
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>

        <div className="drawer-footer-auth">
          <a
            href={routeToHash("home")}
            className="create-account-link"
            onClick={(e) => {
              e.preventDefault();
              openLogin();
            }}
          >
            إنشاء حساب جديد
          </a>
        </div>
      </aside>

      {loginOpen && (
        <LoginView
          onClose={() => setLoginOpen(false)}
          onHome={() => {
            setLoginOpen(false);
            onNavigate("home");
          }}
        />
      )}
    </>
  );
}
