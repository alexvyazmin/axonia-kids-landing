"use client";

import { useState } from "react";

type CheckoutConfig = {
  paymentUrl?: string;
  claimUrl?: string;
};

async function loadCheckoutConfig(): Promise<CheckoutConfig> {
  // checkout.json — источник правды (можно менять без пересборки env)
  try {
    const res = await fetch(`/checkout.json?t=${Date.now()}`, {
      cache: "no-store",
    });
    if (res.ok) {
      const data = (await res.json()) as CheckoutConfig;
      return {
        paymentUrl:
          data.paymentUrl?.trim() ||
          process.env.NEXT_PUBLIC_YOOKASSA_PAYMENT_URL?.trim(),
        claimUrl:
          data.claimUrl?.trim() ||
          process.env.NEXT_PUBLIC_CLAIM_URL?.trim(),
      };
    }
  } catch {
    // ignore
  }

  return {
    paymentUrl: process.env.NEXT_PUBLIC_YOOKASSA_PAYMENT_URL?.trim(),
    claimUrl: process.env.NEXT_PUBLIC_CLAIM_URL?.trim(),
  };
}

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
    if (disabled || loading) return;
    void marketingConsent;

    setLoading(true);
    try {
      const cfg = await loadCheckoutConfig();
      const paymentUrl = cfg.paymentUrl?.trim();
      if (!paymentUrl || paymentUrl.includes("PASTE_")) {
        alert("Ссылка на оплату не задана в public/checkout.json");
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
