"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import LegalModal from "./LegalModal";
import PrivacyPolicyContent from "./legal/PrivacyPolicyContent";
import OfferContent from "./legal/OfferContent";

type Doc = "privacy" | "offer" | null;

type LegalContextValue = {
  openPrivacy: () => void;
  openOffer: () => void;
};

const LegalContext = createContext<LegalContextValue | null>(null);

export function useLegal() {
  const ctx = useContext(LegalContext);
  if (!ctx) {
    throw new Error("useLegal must be used within LegalProvider");
  }
  return ctx;
}

export function LegalProvider({ children }: { children: React.ReactNode }) {
  const [doc, setDoc] = useState<Doc>(null);

  const openPrivacy = useCallback(() => setDoc("privacy"), []);
  const openOffer = useCallback(() => setDoc("offer"), []);
  const onClose = useCallback(() => setDoc(null), []);

  const value = useMemo(
    () => ({ openPrivacy, openOffer }),
    [openPrivacy, openOffer]
  );

  return (
    <LegalContext.Provider value={value}>
      {children}
      <LegalModal
        title={
          doc === "privacy"
            ? "Политика конфиденциальности"
            : "Публичная оферта"
        }
        open={doc !== null}
        onClose={onClose}
      >
        {doc === "privacy" ? <PrivacyPolicyContent /> : <OfferContent />}
      </LegalModal>
    </LegalContext.Provider>
  );
}

export function LegalFooter() {
  const { openPrivacy, openOffer } = useLegal();

  return (
    <footer className="border-t border-slate-dark/10 bg-milky px-4 py-6 text-center text-sm text-slate-dark">
      <div className="mx-auto flex max-w-prose flex-wrap items-center justify-center gap-x-4 gap-y-2">
        <button
          type="button"
          onClick={openPrivacy}
          className="underline underline-offset-2 opacity-80 hover:opacity-100"
        >
          Политика конфиденциальности
        </button>
        <button
          type="button"
          onClick={openOffer}
          className="underline underline-offset-2 opacity-80 hover:opacity-100"
        >
          Публичная оферта
        </button>
      </div>
      <p className="mt-3 opacity-60">
        Самозанятый Вязьмин А. В. ·{" "}
        <a
          href="mailto:alex.vyazmin@gmail.com"
          className="underline underline-offset-2"
        >
          alex.vyazmin@gmail.com
        </a>
      </p>
    </footer>
  );
}
