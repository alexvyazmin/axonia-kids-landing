"use client";

import { useState } from "react";

type Props = {
  disabled?: boolean;
  marketingConsent?: boolean;
};

async function resolvePaymentUrl(): Promise<string | null> {
  // 1) Build-time env (only if set during `npm run build`)
  const fromEnv = process.env.NEXT_PUBLIC_YOOKASSA_PAYMENT_URL?.trim();
  if (fromEnv) return fromEnv;

  // 2) Runtime config for static hosting (works without rebuild env)
  try {
    const res = await fetch("/checkout.json", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { paymentUrl?: string };
    const url = data.paymentUrl?.trim();
    if (!url || url.includes("PASTE_YOOKASSA")) return null;
    return url;
  } catch {
    return null;
  }
}

export default function NeurobookBuyButton({
  disabled = false,
  marketingConsent = false,
}: Props) {
  const [loading, setLoading] = useState(false);

  async function onBuy() {
    if (disabled || loading) return;
    void marketingConsent;

    setLoading(true);
    try {
      const paymentUrl = await resolvePaymentUrl();
      if (!paymentUrl) {
        alert(
          "Ссылка на оплату не задана. Укажите её в файле public/checkout.json (поле paymentUrl) и задеплойте сайт."
        );
        return;
      }
      window.location.assign(paymentUrl);
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
      <span>{loading ? "Переходим к оплате..." : "Купить Нейробук"}</span>
      <span className="text-sm font-normal opacity-90">490&nbsp;₽</span>
    </button>
  );
}
