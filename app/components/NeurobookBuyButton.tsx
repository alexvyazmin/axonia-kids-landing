"use client";

import { useState } from "react";

type Props = {
  disabled?: boolean;
  marketingConsent?: boolean;
};

export default function NeurobookBuyButton({
  disabled = false,
  marketingConsent = false,
}: Props) {
  const [loading, setLoading] = useState(false);

  async function onBuy() {
    if (disabled) return;

    const createUrl = process.env.NEXT_PUBLIC_YOOKASSA_CREATE_URL;
    if (!createUrl) {
      alert("Не настроена переменная NEXT_PUBLIC_YOOKASSA_CREATE_URL.");
      return;
    }

    setLoading(true);
    try {
      const successUrl = `${window.location.origin}/success`;

      const res = await fetch(createUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountValue: "490.00",
          currency: "RUB",
          description: "Нейробук Axonia Kids",
          returnUrl: successUrl,
          metadata: {
            product: "neurobook_early_490",
            marketing_consent: marketingConsent ? "1" : "0",
          },
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `HTTP ${res.status}`);
      }

      const data = (await res.json()) as {
        confirmation_url?: string;
      };

      if (!data.confirmation_url) {
        throw new Error("Нет confirmation_url в ответе сервера.");
      }

      window.location.href = data.confirmation_url;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Ошибка при создании платежа.";
      alert(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onBuy}
      disabled={disabled || loading}
      className="bg-accent text-white px-6 py-3.5 rounded-lg font-medium w-full md:w-auto text-center inline-flex flex-col items-center justify-center shrink-0 hover:opacity-90 transition-opacity disabled:opacity-70 disabled:cursor-not-allowed"
    >
      <span>{loading ? "Создаём оплату..." : "Купить Нейробук"}</span>
      <span className="text-sm font-normal opacity-90">490&nbsp;₽</span>
    </button>
  );
}
