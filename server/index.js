const http = require("http");
const { URL } = require("url");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3001;
const HOST = "0.0.0.0";

const YOOKASSA_SHOP_ID = process.env.YOOKASSA_SHOP_ID;
const YOOKASSA_SECRET_KEY = process.env.YOOKASSA_SECRET_KEY;
const YOOKASSA_API_BASE = "https://api.yookassa.ru/v3";

const CORS_ORIGIN = process.env.CORS_ORIGIN || "https://kids.axonia.ru";
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`).replace(
  /\/$/,
  ""
);

const PDF_PATH = path.join(__dirname, "private", "neurobook.pdf");
const DATA_DIR = path.join(__dirname, "data");
const PAYMENTS_FILE = path.join(DATA_DIR, "payments.json");
const TOKENS_FILE = path.join(DATA_DIR, "tokens.json");

const TOKEN_TTL_MS = 1000 * 60 * 60 * 24; // 24h
const MAX_DOWNLOADS_PER_TOKEN = 3;

function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(PAYMENTS_FILE)) fs.writeFileSync(PAYMENTS_FILE, "[]");
  if (!fs.existsSync(TOKENS_FILE)) fs.writeFileSync(TOKENS_FILE, "[]");
}

function readStore(file) {
  ensureDataFiles();
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return [];
  }
}

function writeStore(file, data) {
  ensureDataFiles();
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": CORS_ORIGIN,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function getAuthHeader() {
  if (!YOOKASSA_SHOP_ID || !YOOKASSA_SECRET_KEY) {
    throw new Error("YOOKASSA_SHOP_ID / YOOKASSA_SECRET_KEY не заданы в env.");
  }
  return (
    "Basic " +
    Buffer.from(`${YOOKASSA_SHOP_ID}:${YOOKASSA_SECRET_KEY}`).toString("base64")
  );
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

async function yooKassaRequest(apiPath, { method = "GET", body, headers = {} } = {}) {
  const res = await fetch(`${YOOKASSA_API_BASE}${apiPath}`, {
    method,
    headers: {
      Authorization: getAuthHeader(),
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
    const msg =
      (json && (json.description || json.message)) || text || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.statusCode = res.status;
    throw err;
  }
  return json;
}

function upsertPayment(record) {
  const list = readStore(PAYMENTS_FILE);
  const idx = list.findIndex((p) => p.id === record.id);
  if (idx >= 0) list[idx] = { ...list[idx], ...record };
  else list.push(record);
  writeStore(PAYMENTS_FILE, list);
  return record;
}

function createDownloadToken(paymentId) {
  const tokens = readStore(TOKENS_FILE);
  const token = crypto.randomBytes(24).toString("hex");
  const now = Date.now();
  tokens.push({
    token,
    paymentId,
    createdAt: now,
    expiresAt: now + TOKEN_TTL_MS,
    downloads: 0,
  });
  writeStore(TOKENS_FILE, tokens);
  return token;
}

function extractEmail(payment) {
  return (
    payment?.receipt?.customer?.email ||
    payment?.metadata?.email ||
    payment?.metadata?.customer_email ||
    null
  );
}

async function handleWebhook(req, res) {
  const body = await readJson(req);
  if (!body?.event || !body?.object?.id) {
    return sendJson(res, 400, { error: "Неверный формат webhook" });
  }

  const paymentId = body.object.id;
  // Verify against YooKassa API (anti-spoof)
  const payment = await yooKassaRequest(`/payments/${paymentId}`);

  upsertPayment({
    id: payment.id,
    status: payment.status,
    amount: payment.amount,
    email: extractEmail(payment),
    paid: payment.paid === true,
    updatedAt: Date.now(),
  });

  if (body.event === "payment.succeeded" && payment.status === "succeeded") {
    console.log("payment.succeeded", payment.id, extractEmail(payment));
  }

  return sendJson(res, 200, { ok: true });
}

async function handleClaim(req, res) {
  const body = await readJson(req);
  const paymentId = (body.paymentId || body.payment_id || "").trim();
  const email = (body.email || "").trim().toLowerCase();

  if (!paymentId && !email) {
    return sendJson(res, 400, {
      error: "Укажите ID платежа из чека ЮKassa или email, указанный при оплате.",
    });
  }

  let payment;

  if (paymentId) {
    payment = await yooKassaRequest(`/payments/${paymentId}`);
  } else {
    // Lookup recent local succeeded payments by email (filled via webhook)
    const list = readStore(PAYMENTS_FILE)
      .filter((p) => p.status === "succeeded" && p.email)
      .filter((p) => String(p.email).toLowerCase() === email)
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    if (!list.length) {
      return sendJson(res, 404, {
        error:
          "Оплата с таким email не найдена. Укажите ID платежа из письма/чека ЮKassa или подождите 1–2 минуты после оплаты.",
      });
    }

    payment = await yooKassaRequest(`/payments/${list[0].id}`);
  }

  if (payment.status !== "succeeded" || payment.paid !== true) {
    return sendJson(res, 402, {
      error: "Платёж ещё не завершён или не успешен.",
      status: payment.status,
    });
  }

  // Optional: only allow expected product amount
  const value = payment?.amount?.value;
  if (value && Number(value) < 490) {
    return sendJson(res, 403, { error: "Сумма платежа не соответствует товару." });
  }

  upsertPayment({
    id: payment.id,
    status: payment.status,
    amount: payment.amount,
    email: extractEmail(payment) || email || null,
    paid: true,
    updatedAt: Date.now(),
  });

  const token = createDownloadToken(payment.id);
  return sendJson(res, 200, {
    downloadUrl: `${PUBLIC_BASE_URL}/api/download?token=${token}`,
    expiresInHours: 24,
    maxDownloads: MAX_DOWNLOADS_PER_TOKEN,
  });
}

function handleDownload(req, res, parsed) {
  const token = parsed.searchParams.get("token");
  if (!token) {
    return sendJson(res, 400, { error: "Нет token" });
  }

  const tokens = readStore(TOKENS_FILE);
  const idx = tokens.findIndex((t) => t.token === token);
  if (idx < 0) {
    return sendJson(res, 403, { error: "Ссылка недействительна." });
  }

  const item = tokens[idx];
  if (Date.now() > item.expiresAt) {
    return sendJson(res, 403, { error: "Срок действия ссылки истёк." });
  }
  if (item.downloads >= MAX_DOWNLOADS_PER_TOKEN) {
    return sendJson(res, 403, { error: "Лимит скачиваний по ссылке исчерпан." });
  }

  if (!fs.existsSync(PDF_PATH)) {
    return sendJson(res, 500, { error: "Файл товара не найден на сервере." });
  }

  item.downloads += 1;
  tokens[idx] = item;
  writeStore(TOKENS_FILE, tokens);

  const stat = fs.statSync(PDF_PATH);
  res.writeHead(200, {
    "Content-Type": "application/pdf",
    "Content-Length": stat.size,
    "Content-Disposition":
      'attachment; filename="Neurobook-Axonia-Kids.pdf"; filename*=UTF-8\'\'%D0%9D%D0%B5%D0%B9%D1%80%D0%BE%D0%B1%D1%83%D0%BA-Axonia-Kids.pdf',
    "Cache-Control": "no-store",
    ...corsHeaders(),
  });
  fs.createReadStream(PDF_PATH).pipe(res);
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

    if (req.method === "GET" && pathname === "/health") {
      return sendJson(res, 200, {
        ok: true,
        pdf: fs.existsSync(PDF_PATH),
      });
    }

    if (req.method === "POST" && pathname === "/api/yookassa/webhook") {
      await handleWebhook(req, res);
      return;
    }

    if (req.method === "POST" && pathname === "/api/claim") {
      await handleClaim(req, res);
      return;
    }

    if (req.method === "GET" && pathname === "/api/download") {
      handleDownload(req, res, parsed);
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8", ...corsHeaders() });
    res.end("Not Found");
  } catch (e) {
    console.error(e);
    const status = e.statusCode || 500;
    sendJson(res, status, { error: e.message || "Server error" });
  }
});

ensureDataFiles();
server.listen(PORT, HOST, () => {
  console.log(`Download backend on http://${HOST}:${PORT}`);
  console.log(`PDF present: ${fs.existsSync(PDF_PATH)}`);
});
