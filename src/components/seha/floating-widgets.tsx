"use client";

import { useEffect, useRef } from "react";

/**
 * Floating widgets — exact port of the extracted page:
 *  #userwayAccessibilityIcon (fixed bottom-left, #005A9C circle)
 *  + .a11y-popover with two working options:
 *    تكبير حجم الخط (body.a11y-large-text → 112%)
 *    تباين ألوان عالٍ (body.a11y-high-contrast → contrast 1.25)
 * The popover state is lifted to SehaApp so the footer a11y button
 * can open it too — exactly like the reference wiring.
 */
export function FloatingWidgets({
  popoverOpen,
  onTogglePopover,
  largeText,
  onToggleLargeText,
  highContrast,
  onToggleContrast,
}: {
  popoverOpen: boolean;
  onTogglePopover: () => void;
  largeText: boolean;
  onToggleLargeText: () => void;
  highContrast: boolean;
  onToggleContrast: () => void;
}) {
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLDivElement | null>(null);

  // Close on Escape / outside click — senior stability hardening.
  useEffect(() => {
    if (!popoverOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onTogglePopover();
    };
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        onTogglePopover();
      }
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [popoverOpen, onTogglePopover]);

  return (
    <>
      {/* زر الإتاحة والوصول العائم */}
      <div
        id="userwayAccessibilityIcon"
        className="uai userway_dark"
        role="button"
        tabIndex={0}
        aria-label="خيارات الإتاحة والوصول"
        aria-expanded={popoverOpen}
        ref={buttonRef}
        onClick={onTogglePopover}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onTogglePopover();
          }
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="4.5" r="2" />
          <path d="M5 9.5h14" />
          <path d="M10 9.5v10" />
          <path d="M14 9.5v10" />
        </svg>
      </div>

      {/* قائمة خيارات الإتاحة المنبثقة */}
      <div className={`a11y-popover${popoverOpen ? " show" : ""}`} id="a11yPopover" ref={popoverRef} role="dialog" aria-label="أدوات الإتاحة والوصول">
        <h4>أدوات الإتاحة والوصول</h4>
        <button
          type="button"
          className={`a11y-option-btn${largeText ? " active" : ""}`}
          id="toggleLargeTextBtn"
          aria-pressed={largeText}
          onClick={onToggleLargeText}
        >
          <span>تكبير حجم الخط</span>
          <span>A+</span>
        </button>
        <button
          type="button"
          className={`a11y-option-btn${highContrast ? " active" : ""}`}
          id="toggleContrastBtn"
          aria-pressed={highContrast}
          onClick={onToggleContrast}
        >
          <span>تباين ألوان عالٍ</span>
          <span>◐</span>
        </button>
      </div>
    </>
  );
}
