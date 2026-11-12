"use client";

import { useEffect, useState } from "react";
import { LoginView } from "./login-view";
import type { SehaView } from "./seha-types";

/**
 * Header — 1:1 port of the reference app-header:
 * logo asset + nav tabs (active = green fill + #54c08a underline bar)
 * + register/login actions, collapsing into a hamburger menu on narrow screens.
 */

/** Person icon — the exact inline SVG glyph used by the reference login button. */
function PersonIcon() {
  return (
    <svg
      width="20"
      height="22"
      viewBox="0 0 20 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9.75 0C6.8505 0 4.5 2.3505 4.5 5.25C4.5 8.14949 6.8505 10.5 9.75 10.5C12.6495 10.5 15 8.14949 15 5.25C15 2.3505 12.6495 0 9.75 0ZM6 5.25C6 3.17893 7.67893 1.5 9.75 1.5C11.8211 1.5 13.5 3.17893 13.5 5.25C13.5 7.32107 11.8211 9 9.75 9C7.67893 9 6 7.32107 6 5.25Z"
        fill="#161616"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M15.9788 13.8292C15.8162 13.7374 15.6726 13.6564 15.5563 13.5872C12.0023 11.4709 7.49809 11.4709 3.94404 13.5872C3.82773 13.6564 3.68405 13.7375 3.52139 13.8293C2.80857 14.2314 1.73106 14.8393 0.992896 15.5618C0.531228 16.0137 0.092574 16.6092 0.0128283 17.3388C-0.0719782 18.1146 0.266485 18.8427 0.945503 19.4896C2.11695 20.6056 3.52274 21.5 5.34104 21.5H14.1593C15.9776 21.5 17.3834 20.6056 18.5548 19.4896C19.2339 18.8427 19.5723 18.1146 19.4875 17.3388C19.4078 16.6092 18.9691 16.0137 18.5075 15.5618C17.7693 14.8393 16.6917 14.2313 15.9788 13.8292ZM4.71146 14.876C7.79264 13.0413 11.7077 13.0413 14.7889 14.876C14.9568 14.976 15.1407 15.0803 15.3334 15.1897C16.046 15.5939 16.8781 16.066 17.4582 15.6338C17.8183 15.9863 17.9718 16.2771 17.9964 16.5017C18.0159 16.6801 17.9708 16.9742 17.5202 17.4035C16.4843 18.3904 15.4318 19 14.1593 19H5.34104C4.0686 19 3.01602 18.3904 1.98017 17.4035C1.52954 16.9742 1.48445 16.6801 1.50395 16.5017C1.52851 16.2771 1.68202 15.9863 2.04214 15.6338C2.62223 15.066 3.45426 14.594 4.16686 14.1897C4.35953 14.0804 4.5436 13.976 4.71146 14.876Z"
        fill="#161616"
      />
    </svg>
  );
}

const NAV_ITEMS: { key: string; label: string; view?: SehaView }[] = [
  { key: "home", label: "الرئيسية" },
  { key: "services", label: "الخدمات" },
  { key: "seha-plus", label: "صحة بلس" },
  { key: "inquiries", label: "الاستعلامات", view: "inquiries" },
  { key: "faq", label: "الأسئلة الشائعة" },
  { key: "contact", label: "تواصل معنا" },
];

export function SehaHeader({
  view,
  onNavigate,
}: {
  view: SehaView;
  onNavigate: (view: SehaView) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const go = (next: SehaView) => {
    onNavigate(next);
    setMenuOpen(false);
  };

  return (
    <>
      <header className="app-header">
        <div className="nav-container">
          {/* Logo (start side = right in RTL) */}
          <a
            className="header-section header-section--logo"
            href="#/"
            onClick={(e) => {
              e.preventDefault();
              go("sl");
            }}
            aria-label="صحة — الرئيسية"
          >
            <img
              src="/assets/DGA_logo_Iocn-BgqIrqvL.svg"
              alt="صحة"
              className="logo"
              width={104}
              height={48}
            />
          </a>

          {/* Desktop nav tabs */}
          <nav
            className="header-section--tabs"
            aria-label="التنقل الرئيسي"
            aria-hidden={menuOpen}
          >
            {NAV_ITEMS.map((item) => {
              const active =
                item.view !== undefined &&
                (view === "inquiries" || view === "sl");
              return (
                <a
                  key={item.key}
                  href={item.view ? "#/inquiries" : "#/"}
                  className={`header-link${active ? " active" : ""}`}
                  aria-current={active ? "page" : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    if (item.view) go(item.view);
                  }}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>

          {/* Auth actions (end side = left in RTL) */}
          <div className="header-section--actions">
            <a
              href="#/account/signup"
              className="register-btn"
              onClick={(e) => {
                e.preventDefault();
                setLoginOpen(true);
              }}
            >
              إنشاء حساب
            </a>
            <button
              type="button"
              className="login-btn"
              onClick={() => setLoginOpen(true)}
            >
              <PersonIcon />
              تسجيل دخول
            </button>
          </div>
        </div>

        {/* Mobile hamburger (hidden ≥1400px, like the reference navbar-expand-xxl) */}
        <button
          type="button"
          className="menu-toggle"
          aria-label={menuOpen ? "إغلاق القائمة" : "فتح القائمة"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#161616"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            {menuOpen ? (
              <>
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </>
            ) : (
              <>
                <path d="M4 6h16" />
                <path d="M4 12h16" />
                <path d="M4 18h16" />
              </>
            )}
          </svg>
        </button>

        {/* Mobile collapsed menu */}
        {menuOpen && (
          <div className="mobile-menu" role="dialog" aria-label="قائمة التنقل">
            <nav aria-label="قائمة التنقل للجوال">
              {NAV_ITEMS.map((item) => {
                const active =
                  item.view !== undefined &&
                  (view === "inquiries" || view === "sl");
                return (
                  <a
                    key={item.key}
                    href={item.view ? "#/inquiries" : "#/"}
                    className={`header-link${active ? " active" : ""}`}
                    onClick={(e) => {
                      e.preventDefault();
                      if (item.view) go(item.view);
                      else setMenuOpen(false);
                    }}
                  >
                    {item.label}
                  </a>
                );
              })}
              <a
                href="#/account/login"
                className="header-link"
                onClick={(e) => {
                  e.preventDefault();
                  setMenuOpen(false);
                  setLoginOpen(true);
                }}
              >
                تسجيل دخول
              </a>
              <a
                href="#/account/signup"
                className="header-link"
                onClick={(e) => {
                  e.preventDefault();
                  setMenuOpen(false);
                  setLoginOpen(true);
                }}
              >
                إنشاء حساب
              </a>
            </nav>
          </div>
        )}
      </header>

      {loginOpen && (
        <LoginView
          onClose={() => setLoginOpen(false)}
          onHome={() => {
            setLoginOpen(false);
            go("sl");
          }}
        />
      )}
    </>
  );
}
