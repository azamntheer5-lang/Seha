"use client";

import { useState } from "react";

/* ==================================================================
 * CONTACT PAGE (#/ContactUs) — 1:1 rebuild of the reference layout:
 *   3 contact cards (رقم الجوال / رسالة قصيرة / البريد الإلكتروني)
 *   + social row + working hours + message form (اسم/بريد/موضوع/رسالة).
 * ================================================================== */

const SUBJECTS = [
  "استفسار عام",
  "دعم فني",
  "الاستعلامات",
  "التراخيص الصحية",
  "شكوى أو ملاحظة",
  "شراكة",
];

type FormState = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const EMPTY: FormState = { name: "", email: "", subject: "", message: "" };

export function ContactPage() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<FormErrors>({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const set = (key: keyof FormState) => (value: string) => {
    setForm((p) => ({ ...p, [key]: value }));
    if (errors[key]) setErrors((p) => ({ ...p, [key]: undefined }));
    if (sent) setSent(false);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;

    const next: FormErrors = {};
    if (!form.name.trim()) next.name = "يرجى إدخال الاسم";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      next.email = "يرجى إدخال بريد إلكتروني صحيح";
    if (!form.subject) next.subject = "يرجى اختيار الموضوع";
    if (form.message.trim().length < 5) next.message = "يرجى كتابة رسالتك";
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    setErrors({});
    setSending(true);
    // Local submission — the reference platform also ends with a success state.
    window.setTimeout(() => {
      setSending(false);
      setSent(true);
      setForm(EMPTY);
    }, 900);
  };

  return (
    <div className="contact-page" dir="rtl">
      {/* Contact channel cards */}
      <div className="contact-cards">
        <a href="tel:920002005" className="contact-card">
          <span className="contact-card__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </span>
          <div className="contact-card__body">
            <span className="contact-card__label">رقم الجوال</span>
            <span className="contact-card__value" dir="ltr">920002005</span>
          </div>
        </a>

        <a href="sms:920002005" className="contact-card">
          <span className="contact-card__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </span>
          <div className="contact-card__body">
            <span className="contact-card__label">رسالة قصيرة</span>
            <span className="contact-card__value" dir="ltr">920002005</span>
          </div>
        </a>

        <a href="mailto:support@seha.sa" className="contact-card">
          <span className="contact-card__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </span>
          <div className="contact-card__body">
            <span className="contact-card__label">البريد الإلكتروني</span>
            <span className="contact-card__value" dir="ltr">support@seha.sa</span>
          </div>
        </a>
      </div>

      {/* Social + hours row */}
      <div className="contact-meta">
        <div className="contact-meta__social">
          <span className="contact-meta__label">تابعنا على</span>
          <div className="contact-meta__buttons">
            <a
              className="footer-icon-btn"
              href="https://www.youtube.com"
              target="_blank"
              rel="noreferrer noopener"
              aria-label="يوتيوب"
              title="YouTube"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
            </a>
            <a
              className="footer-icon-btn"
              href="https://x.com"
              target="_blank"
              rel="noreferrer noopener"
              aria-label="منصة X"
              title="X (Twitter)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
          </div>
        </div>
        <div className="contact-meta__hours">
          <span className="contact-hours-text">
            أوقات العمل: الأحد حتى الخميس 8 ص - 11 م
          </span>
        </div>
      </div>

      {/* Message form */}
      <form className="contact-form" noValidate onSubmit={submit}>
        <h2 className="contact-form__title">كيف يمكننا مساعدتك؟</h2>

        <div className="contact-form__grid">
          <div className={`sl-field${errors.name ? " has-error" : ""}`}>
            <label htmlFor="contact-name">*الإسم</label>
            <input
              id="contact-name"
              className="sl-input"
              type="text"
              placeholder="أدخل اسمك الكامل"
              autoComplete="name"
              value={form.name}
              onChange={(e) => set("name")(e.target.value)}
              aria-invalid={errors.name ? true : undefined}
            />
            <span className="sl-field-error">{errors.name ?? ""}</span>
          </div>

          <div className={`sl-field${errors.email ? " has-error" : ""}`}>
            <label htmlFor="contact-email">*البريد الإلكتروني</label>
            <input
              id="contact-email"
              className="sl-input"
              type="email"
              placeholder="example@email.com"
              autoComplete="email"
              dir="ltr"
              value={form.email}
              onChange={(e) => set("email")(e.target.value)}
              aria-invalid={errors.email ? true : undefined}
            />
            <span className="sl-field-error">{errors.email ?? ""}</span>
          </div>

          <div className={`sl-field${errors.subject ? " has-error" : ""}`}>
            <label htmlFor="contact-subject">*الموضوع</label>
            <select
              id="contact-subject"
              className="sl-input contact-form__select"
              value={form.subject}
              onChange={(e) => set("subject")(e.target.value)}
              aria-invalid={errors.subject ? true : undefined}
            >
              <option value="">إختر</option>
              {SUBJECTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <span className="sl-field-error">{errors.subject ?? ""}</span>
          </div>

          <div className={`sl-field${errors.message ? " has-error" : ""}`}>
            <label htmlFor="contact-message">*الرسالة</label>
            <textarea
              id="contact-message"
              className="sl-input contact-form__textarea"
              placeholder="اكتب رسالتك هنا..."
              rows={5}
              value={form.message}
              onChange={(e) => set("message")(e.target.value)}
              aria-invalid={errors.message ? true : undefined}
            />
            <span className="sl-field-error">{errors.message ?? ""}</span>
          </div>
        </div>

        <div className="contact-form__footer">
          <button type="submit" className="contact-form__submit" disabled={sending}>
            {sending ? (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="fa-spin">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.6" />
                  <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
                </svg>
                <span>جارٍ الإرسال...</span>
              </>
            ) : (
              <span>إرسال</span>
            )}
          </button>

          {sent && (
            <p className="contact-form__success" role="status">
              تم إرسال رسالتك بنجاح، سيتم التواصل معك في أقرب وقت.
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
