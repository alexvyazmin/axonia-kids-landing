"use client";

import { useState } from "react";
import Image from "next/image";
import NeurobookBuyButton from "./NeurobookBuyButton";
import { useLegal } from "./LegalProvider";

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 12 12"
      className="h-3 w-3 text-white opacity-0 transition-opacity"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2 6.2 4.7 9 10 3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
      className="mt-10 rounded-2xl border border-sand/80 bg-milky p-5 shadow-[0_16px_40px_rgba(60,42,30,0.10)] md:p-8"
    >
      <div className="flex flex-col gap-8 md:flex-row md:items-center md:gap-10">
        <div className="mx-auto w-full max-w-[220px] shrink-0 md:mx-0 md:max-w-[240px]">
          <Image
            src="/Book_product_shot.png"
            alt="Нейробук Axonia Kids"
            width={720}
            height={960}
            className="h-auto w-full drop-shadow-[0_18px_28px_rgba(60,42,30,0.28)]"
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
              ★ Ранняя цена
            </span>
            <p className="text-base leading-snug text-slate-dark">
              Новый продукт — для первых{" "}
              <span className="font-semibold">100 покупателей</span> цена самая
              низкая:
            </p>
            <p className="text-4xl font-semibold leading-none tracking-tight text-accent">
              490&nbsp;₽
            </p>
            <p className="text-sm text-slate-dark/55">Далее будет повышение.</p>
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-dark">
                Email для получения Нейробука
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                autoComplete="email"
                className="w-full rounded-xl border border-slate-dark/12 bg-white px-4 py-3 text-base text-slate-dark outline-none transition placeholder:text-slate-dark/35 focus:border-accent focus:ring-2 focus:ring-accent/25"
              />
              <span className="mt-1.5 block text-xs leading-snug text-slate-dark/50">
                После оплаты отправим ссылку на скачивание на этот адрес.
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-3 text-xs leading-snug text-slate-dark/80">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={acceptedLegal}
                onChange={(e) => setAcceptedLegal(e.target.checked)}
                required
              />
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 border-accent/30 bg-white transition peer-checked:border-accent peer-checked:bg-accent peer-checked:[&_svg]:opacity-100 peer-focus-visible:ring-2 peer-focus-visible:ring-accent/40">
                <CheckIcon />
              </span>
              <span>
                Я согласен с{" "}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openPrivacy();
                  }}
                  className="font-medium text-accent underline underline-offset-2"
                >
                  Политикой конфиденциальности
                </button>{" "}
                и{" "}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openOffer();
                  }}
                  className="font-medium text-accent underline underline-offset-2"
                >
                  Договором оферты
                </button>
                .{" "}
                <span className="text-slate-dark/45">
                  (Обязательный для покупки)
                </span>
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-3 text-xs leading-snug text-slate-dark/80">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={acceptedMarketing}
                onChange={(e) => setAcceptedMarketing(e.target.checked)}
              />
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 border-accent/30 bg-white transition peer-checked:border-accent peer-checked:bg-accent peer-checked:[&_svg]:opacity-100 peer-focus-visible:ring-2 peer-focus-visible:ring-accent/40">
                <CheckIcon />
              </span>
              <span>
                Я согласен на получение рекламных и информационных рассылок.
              </span>
            </label>
          </div>

          <div className="space-y-2 pt-1">
            <NeurobookBuyButton
              disabled={!canPay}
              email={email.trim()}
              marketingConsent={acceptedMarketing}
            />
            {!canPay && (
              <p className="text-center text-xs text-slate-dark/50">
                Укажите email и отметьте обязательное согласие, чтобы перейти к
                оплате.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
