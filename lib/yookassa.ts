import { randomUUID } from "crypto";

const YOOKASSA_API_BASE = "https://api.yookassa.ru/v3";

function getAuthHeader() {
  const shopId = process.env.YOOKASSA_SHOP_ID;
  const secretKey = process.env.YOOKASSA_SECRET_KEY;

  if (!shopId || !secretKey) {
    throw new Error("YOOKASSA_SHOP_ID / YOOKASSA_SECRET_KEY не заданы в env.");
  }

  const token = Buffer.from(`${shopId}:${secretKey}`).toString("base64");
  return `Basic ${token}`;
}

export async function yooKassaRequest(
  path: string,
  options: {
    method?: string;
    body?: Record<string, unknown>;
    headers?: Record<string, string>;
  } = {}
) {
  const { method = "GET", body, headers = {} } = options;

  const res = await fetch(`${YOOKASSA_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: getAuthHeader(),
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    json = undefined;
  }

  if (!res.ok) {
    const details = json as { description?: string; message?: string } | undefined;
    const msg =
      details?.description || details?.message || text || `HTTP ${res.status}`;
    const error = new Error(msg) as Error & { statusCode?: number };
    error.statusCode = res.status;
    throw error;
  }

  return json;
}

export async function createRedirectPayment(input: {
  amountValue: string;
  currency: string;
  description: string;
  returnUrl: string;
  metadata?: Record<string, string>;
}) {
  return yooKassaRequest("/payments", {
    method: "POST",
    headers: { "Idempotence-Key": randomUUID() },
    body: {
      amount: {
        value: input.amountValue,
        currency: input.currency,
      },
      capture: true,
      confirmation: {
        type: "redirect",
        return_url: input.returnUrl,
      },
      description: input.description,
      metadata: input.metadata ?? {},
    },
  });
}
