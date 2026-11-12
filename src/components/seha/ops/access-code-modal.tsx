"use client";

/**
 * AccessCodeModal — the secret gate to the issuing portal.
 * Opens when the operator clicks the site logo; asks for the access code
 * (verified server-side, brute-force limited). On success the operator is
 * taken to the hidden #/ops route.
 */

import { useEffect, useRef, useState } from "react";

export function AccessCodeModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  /** Called with the verified code when access is granted. */
  onSuccess: (code: string) => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state each time the modal opens.
  useEffect(() => {
    if (open) {
      setCode("");
      setError("");
      setLoading(false);
      const t = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Escape closes.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, loading, onClose]);

  if (!open) return null;

  const fail = (message: string) => {
    setError(message);
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (loading) return;
    const trimmed = code.trim();
    if (!trimmed) {
      fail("الرجاء إدخال الرمز");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ops/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed }),
      });
      if (res.ok) {
        onSuccess(trimmed);
        return;
      }
      const body = await res.json().catch(() => null);
      fail(body?.message ?? "الرمز غير صحيح");
    } catch {
      fail("تعذّر الاتصال، حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="ops-access-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="رمز الدخول"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <form
        className={`ops-access-card${shake ? " shake" : ""}`}
        onSubmit={submit}
        dir="rtl"
      >
        <button
          type="button"
          className="ops-access-close"
          aria-label="إغلاق"
          onClick={() => !loading && onClose()}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="ops-access-icon" aria-hidden="true">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        <h2 className="ops-access-title">منطقة مصرّح لهم فقط</h2>
        <p className="ops-access-subtitle">أدخل رمز الدخول للوصول إلى بوابة إصدار الإجازات المرضية</p>

        <input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          autoComplete="off"
          className="ops-access-input"
          placeholder="• • • • • • • •"
          value={code}
          maxLength={12}
          dir="ltr"
          aria-label="رمز الدخول"
          onChange={(e) => {
            setCode(e.target.value);
            if (error) setError("");
          }}
          disabled={loading}
        />

        {error && (
          <p className="ops-access-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="ops-access-submit" disabled={loading}>
          {loading ? (
            <>
              <span className="ops-spinner" aria-hidden="true" />
              جارٍ التحقق…
            </>
          ) : (
            "دخول"
          )}
        </button>
      </form>

      <style>{`
        .ops-access-backdrop {
          position: fixed; inset: 0; z-index: 3000;
          background: rgba(1, 2, 56, 0.55);
          backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
          animation: opsFadeIn 0.18s ease-out;
        }
        .ops-access-card {
          position: relative;
          width: 100%; max-width: 400px;
          background: #fff; border-radius: 16px;
          padding: 36px 32px 30px;
          text-align: center;
          box-shadow: 0 24px 64px rgba(1, 2, 56, 0.28);
          font-family: var(--font-plex-arabic), "IBM Plex Sans Arabic", "Cairo", sans-serif;
          animation: opsPop 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .ops-access-card.shake { animation: opsShake 0.45s ease; }

        .ops-access-close {
          position: absolute; top: 14px; left: 14px;
          width: 32px; height: 32px; border-radius: 50%;
          border: none; background: #f3f4f6; color: #6b7280;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: background 0.15s, color 0.15s;
        }
        .ops-access-close:hover { background: #e5e7eb; color: #374151; }

        .ops-access-icon {
          width: 58px; height: 58px; margin: 0 auto 16px;
          border-radius: 50%;
          background: linear-gradient(135deg, #1b8354, #23a06a);
          color: #fff; display: flex; align-items: center; justify-content: center;
          box-shadow: 0 8px 20px rgba(27, 131, 84, 0.35);
        }

        .ops-access-title {
          margin: 0 0 6px; font-size: 20px; font-weight: 700; color: #101828;
        }
        .ops-access-subtitle {
          margin: 0 0 22px; font-size: 13.5px; color: #667085; line-height: 1.7;
        }

        .ops-access-input {
          width: 100%; box-sizing: border-box;
          padding: 13px 16px; font-size: 18px; letter-spacing: 6px;
          text-align: center; direction: ltr;
          border: 1.5px solid #9da4ae; border-radius: 10px;
          background: #fff; color: #101828; outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
          font-family: inherit;
        }
        .ops-access-input:focus {
          border-color: #1b8354;
          box-shadow: 0 0 0 3px rgba(27, 131, 84, 0.15);
        }
        .ops-access-input:disabled { opacity: 0.65; }

        .ops-access-error {
          margin: 10px 2px 0; font-size: 13px; color: #d92d20; font-weight: 600;
        }

        .ops-access-submit {
          width: 100%; margin-top: 18px;
          padding: 13px 16px; border: none; border-radius: 10px;
          background: #1b8354; color: #fff; font-size: 15.5px; font-weight: 700;
          font-family: inherit; cursor: pointer;
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          transition: background 0.15s, transform 0.1s;
        }
        .ops-access-submit:hover:not(:disabled) { background: #177046; }
        .ops-access-submit:active:not(:disabled) { transform: scale(0.985); }
        .ops-access-submit:disabled { opacity: 0.7; cursor: not-allowed; }

        .ops-spinner {
          width: 16px; height: 16px; border-radius: 50%;
          border: 2px solid rgba(255, 255, 255, 0.4); border-top-color: #fff;
          animation: opsSpin 0.7s linear infinite; display: inline-block;
        }

        @keyframes opsSpin { to { transform: rotate(360deg); } }
        @keyframes opsFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes opsPop {
          from { opacity: 0; transform: translateY(14px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes opsShake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-9px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}
