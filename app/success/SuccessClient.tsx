"use client";

import { useState } from "react";

type CheckoutConfig = {
  claimUrl?: string;
};

async function resolveClaimUrl(): Promise<string | null> {
  const fromEnv = process.env.NEXT_PUBLIC_CLAIM_URL?.trim();
  if (fromEnv) return fromEnv;

  try {
    const res = await fetch("/checkout.json", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as CheckoutConfig;
    const url = data.claimUrl?.trim();
    if (!url || url.includes("PASTE_")) return null;
    return url;
  } catch {
    return null;
  }
}

export default function SuccessClient() {
  const [paymentId, setPaymentId] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");

  async function onClaim(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setDownloadUrl("");

    const claimEndpoint = await resolveClaimUrl();
    if (!claimEndpoint) {
      setError(
        "Не задан claimUrl в public/checkout.json (адрес backend …/api/claim)."
      );
      return;
    }

    if (!paymentId.trim() && !email.trim()) {
      setError(
        "Укажите ID платежа из чека ЮKassa или email, который вводили при оплате."
      );
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(claimEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: paymentId.trim() || undefined,
          email: email.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        downloadUrl?: string;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      if (!data.downloadUrl) {
        throw new Error("Сервер не вернул ссылку на скачивание.");
      }
      setDownloadUrl(data.downloadUrl);
      // Сразу начинаем скачивание после проверки оплаты
      window.location.assign(data.downloadUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось получить ссылку.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-milky">
      <div className="max-w-prose mx-auto px-4 py-12 md:py-16">
        <article className="text-lg leading-relaxed space-y-6 text-slate-dark">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight">
            Спасибо за покупку
          </h1>
          <p>
            Чтобы скачать Нейробук, подтвердите оплату: укажите{" "}
            <strong>ID платежа</strong> из письма/чека ЮKassa или{" "}
            <strong>email</strong>, который использовали при оплате.
          </p>

          <form
            onSubmit={onClaim}
            className="space-y-4 rounded-xl border border-accent/30 bg-white/60 p-4 md:p-5"
          >
            <label className="block text-sm">
              <span className="mb-1 block font-medium">
                ID платежа (предпочтительно)
              </span>
              <input
                value={paymentId}
                onChange={(e) => setPaymentId(e.target.value)}
                placeholder="например 2c5d6e7f-000f-5000-8000-..."
                className="w-full rounded-lg border border-slate-dark/15 bg-milky px-3 py-2 text-base outline-none focus:border-accent"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-medium">Email при оплате</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full rounded-lg border border-slate-dark/15 bg-milky px-3 py-2 text-base outline-none focus:border-accent"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="bg-accent text-white px-6 py-3 rounded-lg font-medium w-full md:w-auto hover:opacity-90 disabled:opacity-70"
            >
              {loading ? "Проверяем оплату..." : "Получить ссылку на скачивание"}
            </button>
          </form>

          {error && (
            <p className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-base text-red-800">
              {error}
            </p>
          )}

          {downloadUrl && (
            <div className="space-y-3 rounded-xl border border-accent/40 bg-white/70 p-4">
              <p>
                Оплата подтверждена. Ссылка действует 24 часа (до 3 скачиваний).
              </p>
              <a
                href={downloadUrl}
                className="bg-accent text-white px-6 py-3.5 rounded-lg font-medium inline-flex text-center hover:opacity-90"
              >
                Скачать Нейробук
              </a>
            </div>
          )}

          <p className="text-base opacity-80">
            Прямой публичный файл больше недоступен. Скачивание возможно только
            после проверки успешного платежа в ЮKassa.
          </p>
        </article>
      </div>
    </main>
  );
}
