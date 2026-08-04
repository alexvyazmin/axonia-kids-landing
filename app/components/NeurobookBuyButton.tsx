"use client";

type Props = {
  disabled?: boolean;
  marketingConsent?: boolean;
};

/**
 * Static-friendly checkout:
 * - Prefer a Payment Link from YooKassa cabinet (NEXT_PUBLIC_YOOKASSA_PAYMENT_URL)
 * - Optional: separate backend create endpoint (NEXT_PUBLIC_YOOKASSA_CREATE_URL)
 */
export default function NeurobookBuyButton({
  disabled = false,
  marketingConsent = false,
}: Props) {
  const paymentUrl = process.env.NEXT_PUBLIC_YOOKASSA_PAYMENT_URL;
  const createUrl = process.env.NEXT_PUBLIC_YOOKASSA_CREATE_URL;

  async function onBuy() {
    if (disabled) return;

    // 1) Payment Link — no backend needed (best for static hosting)
    if (paymentUrl) {
      // marketingConsent can be stored later via analytics/cookie if needed
      void marketingConsent;
      window.location.href = paymentUrl;
      return;
    }

    // 2) Optional separate backend (server/index.js or another host)
    if (!createUrl) {
      alert(
        "Оплата не настроена: задайте NEXT_PUBLIC_YOOKASSA_PAYMENT_URL (ссылка из кабинета ЮKassa) при сборке сайта."
      );
      return;
    }

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

      const data = (await res.json().catch(() => ({}))) as {
        confirmation_url?: string;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      if (!data.confirmation_url) {
        throw new Error("Нет confirmation_url в ответе сервера.");
      }

      window.location.href = data.confirmation_url;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Ошибка при создании платежа.";
      alert(msg);
    }
  }

  return (
    <button
      type="button"
      onClick={onBuy}
      disabled={disabled}
      className="bg-accent text-white px-6 py-3.5 rounded-lg font-medium w-full md:w-auto text-center inline-flex flex-col items-center justify-center shrink-0 hover:opacity-90 transition-opacity disabled:opacity-70 disabled:cursor-not-allowed"
    >
      <span>Купить Нейробук</span>
      <span className="text-sm font-normal opacity-90">490&nbsp;₽</span>
    </button>
  );
}
