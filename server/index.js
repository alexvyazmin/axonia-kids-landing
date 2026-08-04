const http = require("http");
const { URL } = require("url");
const crypto = require("crypto");

const PORT = process.env.PORT || 3001;

const YOOKASSA_SHOP_ID = process.env.YOOKASSA_SHOP_ID;
const YOOKASSA_SECRET_KEY = process.env.YOOKASSA_SECRET_KEY;

const YOOKASSA_API_BASE = "https://api.yookassa.ru/v3";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": process.env.CORS_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function getAuthHeader() {
  if (!YOOKASSA_SHOP_ID || !YOOKASSA_SECRET_KEY) {
    throw new Error("YOOKASSA_SHOP_ID / YOOKASSA_SECRET_KEY не заданы в env.");
  }
  const token = Buffer.from(`${YOOKASSA_SHOP_ID}:${YOOKASSA_SECRET_KEY}`).toString(
    "base64"
  );
  return `Basic ${token}`;
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk.toString("utf8");
    });
    req.on("end", () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        reject(e);
      }
    });
  });
}

function sendJson(res, status, obj) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    ...corsHeaders(),
  });
  res.end(JSON.stringify(obj));
}

function safeJson(res, status, obj) {
  try {
    sendJson(res, status, obj);
  } catch {
    res.writeHead(status, corsHeaders());
    res.end();
  }
}

function normalizeReturnUrl(input) {
  // В Yookassa return_url должен быть абсолютным URL с протоколом и доменом.
  if (!input || typeof input !== "string") return undefined;
  if (!input.startsWith("http://") && !input.startsWith("https://")) return undefined;
  return input;
}

async function yooKassaRequest(path, { method = "GET", body, headers = {} }) {
  const authHeader = getAuthHeader();

  const res = await fetch(`${YOOKASSA_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: authHeader,
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    json = undefined;
  }

  if (!res.ok) {
    const msg = (json && (json.message || json.error)) || text || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.statusCode = res.status;
    err.details = json;
    throw err;
  }

  return json;
}

async function createRedirectPayment({ amountValue, currency, description, returnUrl, metadata }) {
  const idempotenceKey = crypto.randomUUID();

  const paymentData = {
    amount: {
      value: String(amountValue),
      currency,
    },
    capture: true,
    confirmation: {
      type: "redirect",
      return_url: returnUrl,
    },
    description,
    metadata: metadata || {},
  };

  // Minimal payload per YooKassa v3 payments redirect flow:
  // amount + capture + confirmation(redirect/return_url) + (optional) description/metadata.
  return yooKassaRequest("/payments", {
    method: "POST",
    body: paymentData,
    headers: { "Idempotence-Key": idempotenceKey },
  });
}

function getClientIP(req) {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf) {
    // Usually: "ip1, ip2, ..."
    return xf.split(",")[0].trim();
  }
  const xReal = req.headers["x-real-ip"];
  if (typeof xReal === "string" && xReal) return xReal;
  return req.socket?.remoteAddress;
}

// YooKassa may send from multiple IPs (see docs). We keep it optional
// because proxies/CDNs may change observable IPs.
//
// Default: SKIP IP check (more reliable on managed hosting).
// Set YOOKASSA_SKIP_IP_CHECK=0 to enable strict verification.
const SKIP_IP_CHECK = process.env.YOOKASSA_SKIP_IP_CHECK !== "0";

function ipStartsWithPrefix(ip, prefix) {
  if (!ip) return false;
  return ip.toLowerCase().startsWith(prefix.toLowerCase());
}

function ipInCidrV4(ip, cidr) {
  // Very small IPv4 CIDR helper: x.x.x.x/N
  const [rangeIp, bitsStr] = cidr.split("/");
  const bits = Number(bitsStr);
  if (!rangeIp || !Number.isFinite(bits)) return false;

  const ipParts = ip.split(".").map((x) => Number(x));
  const rangeParts = rangeIp.split(".").map((x) => Number(x));
  if (ipParts.length !== 4 || rangeParts.length !== 4) return false;

  const ipNum =
    (ipParts[0] << 24) + (ipParts[1] << 16) + (ipParts[2] << 8) + ipParts[3];
  const rangeNum =
    (rangeParts[0] << 24) +
    (rangeParts[1] << 16) +
    (rangeParts[2] << 8) +
    rangeParts[3];

  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipNum >>> 0 & mask) === (rangeNum >>> 0 & mask);
}

function isAllowedYooKassaIP(ip) {
  if (!ip) return false;

  // IPv4 allowlist (from YooKassa docs)
  if (
    ipInCidrV4(ip, "185.71.76.0/27") ||
    ipInCidrV4(ip, "185.71.77.0/27") ||
    ipInCidrV4(ip, "77.75.153.0/25") ||
    ipInCidrV4(ip, "77.75.154.128/25") ||
    ip === "77.75.156.11" ||
    ip === "77.75.156.35"
  ) {
    return true;
  }

  // IPv6 allowlist prefix
  if (ipStartsWithPrefix(ip, "2a02:5180:")) return true; // /32

  return false;
}

async function handleCreate(req, res) {
  const body = await readJson(req);
  const amountValue = body?.amountValue ?? body?.amount ?? "490.00";
  const currency = body?.currency ?? "RUB";
  const description = body?.description ?? "Нейробук Axonia Kids";
  const returnUrl = normalizeReturnUrl(body?.returnUrl);
  const metadata = body?.metadata ?? {};

  if (!returnUrl) {
    return safeJson(res, 400, { error: "returnUrl должен быть абсолютным https://..." });
  }

  const payment = await createRedirectPayment({
    amountValue: Number(amountValue).toFixed(2),
    currency,
    description,
    returnUrl,
    metadata,
  });

  return safeJson(res, 200, {
    payment_id: payment.id,
    status: payment.status,
    confirmation_url: payment?.confirmation?.confirmation_url,
  });
}

async function handleWebhook(req, res) {
  // IMPORTANT: for webhook authenticity checks you typically need raw body.
  // Here мы делаем безопасную проверку через статус платежа у YooKassa.
  const body = await readJson(req);

  if (!body?.event || !body?.object?.id) {
    return safeJson(res, 400, { error: "Неверный формат webhook" });
  }

  const event = body.event;
  const paymentId = body.object.id;

  if (!SKIP_IP_CHECK) {
    const clientIP = getClientIP(req);
    if (!isAllowedYooKassaIP(clientIP)) {
      return safeJson(res, 403, { error: "Webhook: IP не из разрешённого диапазона" });
    }
  }

  // Verify current payment status (prevents spoofed events)
  const payment = await yooKassaRequest(`/payments/${paymentId}`, { method: "GET" });

  // payment.status is like: succeeded / canceled / waiting_for_capture etc.
  if (event === "payment.succeeded" && payment?.status === "succeeded") {
    // TODO: выдача файла/доступа (пока логируем).
    // order_id можно положить в metadata.order_id при создании платежа.
    console.log("YooKassa: payment.succeeded", {
      paymentId,
      order_id: payment?.metadata?.order_id ?? payment?.metadata?.product,
    });
  }

  // YooKassa требует HTTP 200, иначе будет повторная отправка до 24 часов.
  return safeJson(res, 200, { ok: true });
}

const server = http.createServer(async (req, res) => {
  try {
    const parsed = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const pathname = parsed.pathname;

    if (req.method === "OPTIONS") {
      res.writeHead(204, corsHeaders());
      res.end();
      return;
    }

    if (req.method === "POST" && pathname === "/api/yookassa/create") {
      await handleCreate(req, res);
      return;
    }

    if (req.method === "POST" && pathname === "/api/yookassa/webhook") {
      await handleWebhook(req, res);
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not Found");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = e && e.statusCode ? e.statusCode : 500;
    console.error("Server error:", e);
    safeJson(res, status, { error: msg });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`YooKassa backend listening on http://0.0.0.0:${PORT}`);
});

