"use client";

/**
 * Footer — exact 1:1 port of the extracted markup:
 *  4 columns (عن صحة / الخدمات والمعلومات / تواصل معنا / تابعنا على + أدوات الإتاحة)
 *  + bottom bar with text partner badges, legal lines and policy links.
 */

/** Feather-style icons — the exact inline SVGs from the extracted page. */

function PhoneIcon() {
  return (
    <svg className="contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg className="contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg className="contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function AccessibilityIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="4" r="2" />
      <path d="M4 9h16" />
      <path d="M10 9v11" />
      <path d="M14 9v11" />
    </svg>
  );
}

import { routeToHash } from "./seha-types";
import type { SehaRoute } from "./seha-types";

/** In-app router link (exact reference hrefs preserved). */
function RLink({
  route,
  onNavigate,
  children,
}: {
  route: SehaRoute;
  onNavigate: (route: SehaRoute) => void;
  children: React.ReactNode;
}) {
  return (
    <a
      href={routeToHash(route)}
      onClick={(e) => {
        e.preventDefault();
        onNavigate(route);
      }}
    >
      {children}
    </a>
  );
}

/** Footer links — every entry navigates the hash router (nothing is dead). */
export function SehaFooter({
  onNavigate,
  onOpenA11y,
}: {
  onNavigate: (route: SehaRoute) => void;
  onOpenA11y: () => void;
}) {
  return (
    <footer dir="rtl" className="footer-container container-fluid">
      <div className="footer">
        <div className="footer-columns">
          {/* العمود الأول: عن صحة */}
          <div className="about-seha section">
            <h3 className="heading">عن صحة</h3>
            <ul className="links-wrapper">
              <li>
                <RLink route="home" onNavigate={onNavigate}>عن صحة</RLink>
              </li>
              <li>
                <RLink route="home" onNavigate={onNavigate}>المنظومة الصحية</RLink>
              </li>
              <li>
                <RLink route="home" onNavigate={onNavigate}>شركاؤنا</RLink>
              </li>
            </ul>
          </div>

          {/* العمود الثاني: الخدمات والمعلومات */}
          <div className="footer-services section">
            <h3 className="heading">الخدمات و المعلومات</h3>
            <ul className="links-wrapper footer-services__list">
              <li>
                <RLink route="services" onNavigate={onNavigate}>الخدمات</RLink>
              </li>
              <li>
                <RLink route="seha-plus" onNavigate={onNavigate}>صحة بلس</RLink>
              </li>
              <li>
                <RLink route="inquiries" onNavigate={onNavigate}>الاستعلامات</RLink>
              </li>
              <li>
                <RLink route="faq" onNavigate={onNavigate}>الأسئلة الشائعة</RLink>
              </li>
              <li>
                <RLink route="home" onNavigate={onNavigate}>الأثر البيئي</RLink>
              </li>
            </ul>
          </div>

          {/* العمود الثالث: تواصل معنا */}
          <div className="footer-contact section">
            <h3 className="heading">تواصل معنا</h3>
            <ul className="contact-list">
              <li>
                <a href="tel:920002005" aria-label="اتصال">
                  <PhoneIcon />
                  <span dir="ltr">920002005</span>
                </a>
              </li>
              <li>
                <a href="mailto:support@seha.sa" aria-label="البريد الإلكتروني">
                  <MailIcon />
                  <span>support@seha.sa</span>
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/920002005"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="واتساب"
                >
                  <WhatsAppIcon />
                  <span dir="ltr">920002005</span>
                </a>
              </li>
              <li>
                <ClockIcon />
                <span>أوقات العمل: الأحد حتى الخميس 8 ص - 11 م</span>
              </li>
            </ul>
          </div>

          {/* العمود الرابع: تابعنا على + أدوات الإتاحة */}
          <div className="footer-social-access section">
            <h3 className="heading">تابعنا على</h3>
            <div className="social-buttons-row">
              <button
                type="button"
                className="footer-icon-btn"
                aria-label="يوتيوب"
                title="YouTube"
                onClick={() => window.open("https://www.youtube.com", "_blank", "noopener")}
              >
                <YouTubeIcon />
              </button>
              <button
                type="button"
                className="footer-icon-btn"
                aria-label="منصة X"
                title="X (Twitter)"
                onClick={() => window.open("https://x.com", "_blank", "noopener")}
              >
                <XIcon />
              </button>
            </div>

            <h3 className="heading">أدوات الإتاحة والوصول</h3>
            <div className="social-buttons-row" style={{ marginBottom: 0 }}>
              <button
                type="button"
                className="footer-icon-btn"
                aria-label="أدوات الإتاحة"
                title="تفعيل خيارات الإتاحة"
                onClick={onOpenA11y}
              >
                <AccessibilityIcon />
              </button>
            </div>
          </div>
        </div>

        {/* الشريط الختامي للفوتر */}
        <div className="footer-bottom">
          <div className="partner-logos">
            <div className="partner-badge">رؤية 2030</div>
            <div className="partner-badge">عام الذكاء الاصطناعي 2026</div>
            <div className="partner-badge">وزارة الصحة</div>
            <div className="partner-badge">لين (Lean)</div>
          </div>

          <div className="footer-legal">
            <p>منصة صحة معتمدة من قبل وزارة الصحة © 2026</p>
            <p>بدعم وتطوير لين لخدمات الأعمال</p>
            <div className="policy-links">
              <RLink route="home" onNavigate={onNavigate}>دليل الاستخدام</RLink>
              <RLink route="home" onNavigate={onNavigate}>الشروط والأحكام</RLink>
              <RLink route="home" onNavigate={onNavigate}>سياسة الخصوصية</RLink>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
