"use client";

import { useState } from "react";
import NeurobookBuyButton from "./NeurobookBuyButton";
import { useLegal } from "./LegalProvider";

export default function PurchaseBlock() {
  const { openPrivacy, openOffer } = useLegal();
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [acceptedMarketing, setAcceptedMarketing] = useState(false);

  return (
    <div
      id="buy"
      className="mt-10 flex flex-col gap-4 rounded-xl border border-accent/30 bg-white/60 p-4 shadow-sm md:p-5"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-stretch">
        <NeurobookBuyButton
          disabled={!acceptedLegal}
          marketingConsent={acceptedMarketing}
        />
        <aside
          className="flex-1 text-base leading-snug"
          aria-label="Цена для первых покупателей"
        >
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">
            ★ Ранняя цена
          </p>
          <p className="mt-1">
            Новый продукт — для первых{" "}
            <span className="font-semibold">100 покупателей</span> цена самая
            низкая:{" "}
            <span className="font-semibold text-accent">490&nbsp;₽</span>
          </p>
          <p className="mt-1 text-sm opacity-80">Далее будет повышение.</p>
        </aside>
      </div>

      <div className="space-y-3 border-t border-slate-dark/10 pt-4 text-sm leading-snug">
        <label className="flex cursor-pointer items-start gap-2">
          <input
            type="checkbox"
            className="mt-1 accent-[#C45C3E]"
            checked={acceptedLegal}
            onChange={(e) => setAcceptedLegal(e.target.checked)}
            required
          />
          <span>
            Я согласен с{" "}
            <button
              type="button"
              onClick={openPrivacy}
              className="underline underline-offset-2 text-accent"
            >
              Политикой конфиденциальности
            </button>{" "}
            и{" "}
            <button
              type="button"
              onClick={openOffer}
              className="underline underline-offset-2 text-accent"
            >
              Договором оферты
            </button>
            .{" "}
            <span className="opacity-70">(Обязательный для покупки)</span>
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-2">
          <input
            type="checkbox"
            className="mt-1 accent-[#C45C3E]"
            checked={acceptedMarketing}
            onChange={(e) => setAcceptedMarketing(e.target.checked)}
          />
          <span>
            Я согласен на получение рекламных и информационных рассылок.
          </span>
        </label>

        {!acceptedLegal && (
          <p className="text-xs opacity-70">
            Чтобы перейти к оплате, отметьте обязательное согласие.
          </p>
        )}
      </div>
    </div>
  );
}
