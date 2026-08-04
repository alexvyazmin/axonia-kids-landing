"use client";

import { useEffect } from "react";

type LegalModalProps = {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

export default function LegalModal({
  title,
  open,
  onClose,
  children,
}: LegalModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-dark/50"
        aria-label="Закрыть"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col rounded-t-2xl bg-milky text-slate-dark shadow-lg sm:rounded-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-dark/10 px-5 py-4">
          <h2 id="legal-modal-title" className="text-xl font-semibold leading-snug">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg px-2 py-1 text-2xl leading-none opacity-70 hover:opacity-100"
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4 text-base leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  );
}
