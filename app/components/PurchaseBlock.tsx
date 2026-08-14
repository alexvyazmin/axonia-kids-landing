"use client";

import { useState } from "react";
import Image from "next/image";
import NeurobookBuyButton from "./NeurobookBuyButton";
import { useLegal } from "./LegalProvider";

export default function PurchaseBlock() {
  const { openPrivacy, openOffer } = useLegal();
  const [email, setEmail] = useState("");
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [acceptedMarketing, setAcceptedMarketing] = useState(false);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canPay = acceptedLegal && emailOk;

  return (
    <div
      id="buy"
      className="mt-10 flex flex-col gap-6 rounded-xl border border-accent/30 bg-white/60 p-4 shadow-sm md:flex-row md:items-center md:gap-8 md:p-6"
    >
      <div className="mx-auto w-full max-w-[220px] shrink-0 md:mx-0 md:max-w-[240px]">
        <Image
          src="/Book_product_shot.png"
          alt="Нейробук Axonia Kids"
          width={720}
          height={960}
          className="h-auto w-full drop-shadow-[0_18px_28px_rgba(60,42,30,0.28)]"
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-stretch">
          <NeurobookBuyButton
            disabled={!canPay}
            email={email.trim()}
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
          <label className="block">
            <span className="mb-1 block font-medium">
              Email для получения Нейробука
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              autoComplete="email"
              className="w-full rounded-lg border border-slate-dark/15 bg-milky px-3 py-2 text-base outline-none focus:border-accent"
            />
            <span className="mt-1 block text-xs opacity-70">
              После оплаты отправим ссылку на скачивание на этот адрес.
            </span>
          </label>

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

          {!canPay && (
            <p className="text-xs opacity-70">
              Укажите email и отметьте обязательное согласие, чтобы перейти к
              оплате.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
