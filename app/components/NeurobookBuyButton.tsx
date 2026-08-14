"use client";

import { useState } from "react";

type CheckoutConfig = {
  createUrl?: string;
  claimUrl?: string;
  paymentUrl?: string;
};

async function loadCheckoutConfig(): Promise<CheckoutConfig> {
  try {
    const res = await fetch(`/checkout.json?t=${Date.now()}`, {
      cache: "no-store",
    });
    if (res.ok) {
      const data = (await res.json()) as CheckoutConfig;
      return {
        createUrl:
          data.createUrl?.trim() ||
          process.env.NEXT_PUBLIC_YOOKASSA_CREATE_URL?.trim(),
        claimUrl:
          data.claimUrl?.trim() || process.env.NEXT_PUBLIC_CLAIM_URL?.trim(),
        paymentUrl:
          data.paymentUrl?.trim() ||
          process.env.NEXT_PUBLIC_YOOKASSA_PAYMENT_URL?.trim(),
      };
    }
  } catch {
    // ignore
  }

  return {
    createUrl: process.env.NEXT_PUBLIC_YOOKASSA_CREATE_URL?.trim(),
    claimUrl: process.env.NEXT_PUBLIC_CLAIM_URL?.trim(),
    paymentUrl: process.env.NEXT_PUBLIC_YOOKASSA_PAYMENT_URL?.trim(),
  };
}

type Props = {
  disabled?: boolean;
  email?: string;
  marketingConsent?: boolean;
};

export default function NeurobookBuyButton({
  disabled = false,
  email = "",
  marketingConsent = false,
}: Props) {
  const [loading, setLoading] = useState(false);

  async function onBuy() {
    if (disabled || loading) return;

    setLoading(true);
    try {
      const cfg = await loadCheckoutConfig();
      const createUrl = cfg.createUrl?.trim();

      if (!createUrl || createUrl.includes("PASTE_")) {
        alert(
          "Не задан createUrl в public/checkout.json (адрес backend …/api/yookassa/create)."
        );
        return;
      }

      if (!email) {
        alert("Укажите email для получения Нейробука.");
        return;
      }

      const res = await fetch(createUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          marketingConsent,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        confirmation_url?: string;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      if (!data.confirmation_url) {
        throw new Error("Сервер не вернул ссылку на оплату.");
      }

      window.location.assign(data.confirmation_url);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Не удалось создать платёж.";
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
      className="w-full rounded-xl bg-accent px-6 py-4 text-center text-base font-semibold text-white shadow-[0_8px_20px_rgba(196,92,62,0.28)] transition duration-200 hover:scale-[1.015] hover:bg-[#b04e33] hover:shadow-[0_10px_24px_rgba(196,92,62,0.36)] active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:scale-100 disabled:hover:bg-accent disabled:hover:shadow-[0_8px_20px_rgba(196,92,62,0.28)]"
    >
      {loading ? "Создаём оплату..." : "Купить Нейробук • 490 ₽"}
    </button>
  );
}
