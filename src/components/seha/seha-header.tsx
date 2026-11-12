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

/**
 * Brand logo — 1:1 recreation of the uploaded "Seha by Lean" mark
 * (pixel-measured from the reference image):
 *  - Text stack (left): صحة (Cairo 700) / Seha (Cairo 700) / By Lean (Cairo 600)
 *    in dark navy #010238, all left-aligned.
 *  - Checkmark icon (right): 14 horizontal rounded pill bars in #8CC8EC,
 *    coordinates extracted per-bar from the reference image
 *    (right arm descending + short left arm + tapering vertex base).
 * Order preserved exactly as the reference: icon at the far right of the group.
 */
const LOGO_FONT = "var(--font-cairo), 'Cairo', 'IBM Plex Sans Arabic', sans-serif";

/** [x, y, width] of each pill bar (height 12.8, rx 6.4) in the 556×264 viewBox. */
const CHECKMARK_BARS: [number, number, number][] = [
  // الذراع اليمنى الطويلة — تنزل من أعلى اليمين نحو القاع
  [483, 0, 66],
  [468, 24.7, 88],
  [454, 49.4, 87],
  [439, 74.1, 88],
  [425, 98.8, 87],
  [410, 123.5, 88],
  [396, 148.2, 87],
  // الذراع اليسرى القصيرة
  [290, 98.8, 40],
  [271, 123.5, 82],
  [280, 148.2, 87],
  // قاعدة علامة الصح — أطول شريط ثم تتقلص نحو الأسفل
  [294, 172.9, 175],
  [309, 197.6, 145],
  [323, 222.3, 117],
  [338, 247, 87],
];

function BrandLogo() {
  return (
    <svg
      width="118"
      height="56"
      viewBox="0 0 556 264"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="صحة - Seha by Lean"
    >
      {/* كتلة النصوص (يسار الشعار): صحة / Seha / By Lean */}
      <text
        x="0"
        y="79"
        fill="#010238"
        fontSize="113"
        fontWeight="700"
        style={{ fontFamily: LOGO_FONT, direction: "ltr", unicodeBidi: "isolate" }}
      >
        صحة
      </text>
      <text
        x="0"
        y="192"
        fill="#010238"
        fontSize="113"
        fontWeight="700"
        style={{ fontFamily: LOGO_FONT, direction: "ltr" }}
      >
        Seha
      </text>
      <text
        x="0"
        y="252"
        fill="#010238"
        fontSize="44"
        fontWeight="600"
        textLength="167"
        lengthAdjust="spacingAndGlyphs"
        style={{ fontFamily: LOGO_FONT, direction: "ltr" }}
      >
        By Lean
      </text>

      {/* أيقونة علامة الصح (يمين الشعار): أشرطة أفقية مدوّرة */}
      <g fill="#8CC8EC" aria-hidden="true">
        {CHECKMARK_BARS.map(([x, y, w]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width={w} height="12.8" rx="6.4" />
        ))}
      </g>
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
