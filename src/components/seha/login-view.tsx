"use client";

import { useEffect, useState } from "react";
import { Lock, ArrowLeft, UserPlus, KeyRound } from "lucide-react";

/**
 * Login view — replica of the reference #/account/login page:
 * green split layout, promo panel with carousel on one side,
 * white card with Nafath login on the other.
 */
const SLIDES = [
  {
    title: "منصة صحة",
    subtitle: "تكامل وموثوقية",
    text: "مصدر موحد لخدمات التقارير الطبية من خلال التكامل بين القطاعات الصحية والهيئات المعنية.",
  },
  {
    title: "منصة صحة",
    subtitle: "سهولة وسرعة",
    text: "استعلم عن تقاريرك الطبية وإجازاتك المرضية بضغطة زر، في أي وقت ومن أي مكان.",
  },
  {
    title: "منصة صحة",
    subtitle: "أمان وخصوصية",
    text: "بياناتك محمية وفق أعلى معايير الأمن السيبراني المعتمدة من الهيئة السعودية للبيانات والذكاء الاصطناعي.",
  },
];

export function LoginView({
  onClose,
  onHome,
}: {
  onClose: () => void;
  onHome: () => void;
}) {
  const [slide, setSlide] = useState(0);

  // Keyboard: Esc closes the login view.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const current = SLIDES[slide];

  return (
    <div
      className="login-page fixed inset-0 z-[10000]"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label="تسجيل الدخول"
    >
      {/* Promo panel */}
      <section className="login-hero">
        <button
          type="button"
          className="login-hero__back"
          onClick={onHome}
          aria-label="رجوع للصفحة الرئيسية"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          رجوع للصفحة الرئيسية
        </button>

        <h1 className="login-hero__title">{current.title}</h1>
        <p className="login-hero__subtitle">{current.subtitle}</p>
        <p className="login-hero__text">{current.text}</p>

        <div className="login-hero__dots" role="tablist" aria-label="شرائح التعريف">
          {SLIDES.map((s, i) => (
            <button
              key={s.subtitle}
              type="button"
              role="tab"
              aria-selected={i === slide}
              aria-label={`شريحة ${i + 1}`}
              className={`login-hero__dot${i === slide ? " login-hero__dot--active" : ""}`}
              onClick={() => setSlide(i)}
            />
          ))}
        </div>
      </section>

      {/* Login card */}
      <section className="login-form">
        <div className="login-card">
          <span className="login-card__badge" aria-hidden="true">
            <Lock size={26} />
          </span>
          <h2>تسجيل الدخول</h2>
          <button
            type="button"
            className="login-card__btn"
            onClick={() => {
              // Nafath is national authentication — unavailable in this demo.
              window.alert(
                "تسجيل الدخول عبر نفاذ غير متاح في هذه النسخة التجريبية."
              );
            }}
          >
            تسجيل الدخول باستخدام نفاذ
          </button>
        </div>

        <div className="login-links">
          <button type="button" onClick={() => window.alert("قسم إنشاء حساب قيد التجهيز.")}>
            <UserPlus size={16} aria-hidden="true" />
            ليس لديك حساب؟ إنشاء حساب
          </button>
          <button
            type="button"
            onClick={() => window.alert("تفعيل المستخدم المسجّل سابقاً قيد التجهيز.")}
          >
            <KeyRound size={16} aria-hidden="true" />
            تفعيل مستخدم مسجّل سابقاً
          </button>
        </div>
      </section>
    </div>
  );
}
