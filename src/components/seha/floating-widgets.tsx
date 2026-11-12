"use client";

import { useState } from "react";

/**
 * Floating widgets — replicas of the reference page:
 *  1. UserWay-style accessibility button (blue circle, bottom-left).
 *  2. AI assistant launcher pill (pinwheel + chat bubble, bottom-right)
 *     with the "اسأل مساعد صحة" label.
 */

/** Accessibility person glyph (UserWay style). */
function AccessibilityGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="4.5" r="2.2" fill="currentColor" stroke="none" />
      <path d="M4 8.5c2.7.9 5.4 1.4 8 1.4s5.3-.5 8-1.4" />
      <path d="M12 9.9v5" />
      <path d="M12 14.9 8.5 21" />
      <path d="M12 14.9 15.5 21" />
    </svg>
  );
}

/** Chat bubble with dots — the reference assistant glyph. */
function ChatDotsGlyph() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      <circle cx="8.5" cy="11.5" r="0.5" fill="currentColor" />
      <circle cx="12" cy="11.5" r="0.5" fill="currentColor" />
      <circle cx="15.5" cy="11.5" r="0.5" fill="currentColor" />
    </svg>
  );
}

/** Pinwheel/fan glyph for the assistant badge. */
function PinwheelGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 12c0-4 1.6-6.5 4-7.5 2.6-1.1 5.5.4 6 3.2.4 2.4-1.2 4.3-3.6 4.6-2.5.3-4.9-.5-6.4-.3Z"
        fill="rgba(255,255,255,0.95)"
      />
      <path
        d="M12 12c-4 0-6.5-1.6-7.5-4-1.1-2.6.4-5.5 3.2-6 2.4-.4 4.3 1.2 4.6 3.6.3 2.5-.5 4.9.9 6.4Z"
        fill="rgba(255,255,255,0.8)"
      />
      <path
        d="M12 12c0 4-1.6 6.5-4 7.5-2.6 1.1-5.5-.4-6-3.2-.4-2.4 1.2-4.3 3.6-4.6 2.5-.3 4.9.5 6.4-.9Z"
        fill="rgba(255,255,255,0.65)"
      />
      <path
        d="M12 12c4 0 6.5 1.6 7.5 4 1.1 2.6-.4 5.5-3.2 6-2.4.4-4.3-1.2-4.6-3.6-.3-2.5.5-4.9-.9-6.4Z"
        fill="rgba(255,255,255,0.5)"
      />
    </svg>
  );
}

export function FloatingWidgets() {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <>
      {/* Accessibility widget (UserWay-style) */}
      <button
        type="button"
        className="uw-widget"
        aria-label="قائمة الوصول"
        onClick={() =>
          window.alert("أدوات الوصول قيد التجهيز في هذه النسخة التجريبية.")
        }
      >
        <AccessibilityGlyph />
      </button>

      {/* AI assistant launcher */}
      <div className="assistant-widget">
        {chatOpen && (
          <div
            className="assistant-widget__pill"
            style={{ padding: "10px 14px", gap: 10 }}
            role="status"
          >
            <span style={{ fontSize: 13, color: "#384250" }}>
              مساعد صحة الذكي قيد التجهيز
            </span>
          </div>
        )}
        <div className="assistant-widget__pill">
          <button
            type="button"
            className="assistant-widget__chat"
            aria-label="اسأل مساعد صحة"
            aria-expanded={chatOpen}
            onClick={() => setChatOpen((v) => !v)}
          >
            <ChatDotsGlyph />
          </button>
          <span className="assistant-widget__pinwheel" aria-hidden="true">
            <PinwheelGlyph />
          </span>
        </div>
        <span className="assistant-widget__label">
          Powered by{" "}
          <a href="#" onClick={(e) => e.preventDefault()}>
            ElevenLabs Agents
          </a>
        </span>
      </div>
    </>
  );
}

