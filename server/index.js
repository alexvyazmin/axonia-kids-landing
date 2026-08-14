const http = require("http");
const { URL } = require("url");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const os = require("os");
const nodemailer = require("nodemailer");

// ---- Diagnostics: env keys at startup (no values) ----
const envKeys = Object.keys(process.env);
console.log("[env] process.env keys:", envKeys);
if (!envKeys.includes("SMTP_PASS")) {
  console.error(
    "КРИТИЧЕСКАЯ ОШИБКА: SMTP_PASS не найден в окружении при старте!"
  );
}

// Timeweb / Docker обычно прокидывают PORT=3000
const PORT = Number(process.env.PORT) || 3000;
const HOST = "0.0.0.0";

const YOOKASSA_SHOP_ID = process.env.YOOKASSA_SHOP_ID;
const YOOKASSA_SECRET_KEY = process.env.YOOKASSA_SECRET_KEY;
const YOOKASSA_API_BASE = "https://api.yookassa.ru/v3";

const CORS_ORIGIN = process.env.CORS_ORIGIN || "https://kids.axonia.ru";
const PUBLIC_BASE_URL = (
  process.env.PUBLIC_BASE_URL || `http://127.0.0.1:${PORT}`
).replace(/\/$/, "");

// SMTP for sending email with the download link
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || "465");
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || "hello@axonia.ru";
const EMAIL_SUBJECT = process.env.EMAIL_SUBJECT || "Ваш Нейробук Axonia Kids";

const PAYMENT_AMOUNT = Number(process.env.PAYMENT_AMOUNT || "490").toFixed(2);
const RETURN_URL =
  process.env.RETURN_URL || "https://kids.axonia.ru/success/";
// Если в ЮKassa включены чеки — поставьте INCLUDE_RECEIPT=1
const INCLUDE_RECEIPT = process.env.INCLUDE_RECEIPT === "1";

const PDF_PATH = path.join(__dirname, "private", "neurobook.pdf");

// В контейнере запись в репозиторий может быть запрещена — используем /tmp
const DATA_DIR =
  process.env.DATA_DIR || path.join(os.tmpdir(), "axonia-kids-data");
const PAYMENTS_FILE = path.join(DATA_DIR, "payments.json");
const TOKENS_FILE = path.join(DATA_DIR, "tokens.json");

const TOKEN_TTL_MS = 1000 * 60 * 60 * 24;
const MAX_DOWNLOADS_PER_TOKEN = 3;

/** @type {{ payments: any[], tokens: any[] }} */
const memory = { payments: [], tokens: [] };
let useMemoryOnly = false;

function ensureDataFiles() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(PAYMENTS_FILE)) fs.writeFileSync(PAYMENTS_FILE, "[]");
    if (!fs.existsSync(TOKENS_FILE)) fs.writeFileSync(TOKENS_FILE, "[]");
    useMemoryOnly = false;
  } catch (e) {
    console.warn("Writable data dir unavailable, using memory store:", e.message);
    useMemoryOnly = true;
  }
}

function readStore(file) {
  if (useMemoryOnly) {
    return file === PAYMENTS_FILE ? memory.payments : memory.tokens;
  }
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return [];
  }
}

function writeStore(file, data) {
  if (useMemoryOnly) {
    if (file === PAYMENTS_FILE) memory.payments = data;
    else memory.tokens = data;
    return;
  }
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

async function sendEmail(to, subject, text) {
  if (!to) {
    throw new Error("Email получателя пустой");
  }
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error(
      "SMTP не настроен: задайте SMTP_HOST, SMTP_USER, SMTP_PASS (и SMTP_PORT, EMAIL_FROM)"
    );
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: EMAIL_FROM,
    to,
    subject,
    text,
  });
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

function healthPayload() {
  return {
    ok: true,
    pdf: fs.existsSync(PDF_PATH),
    port: PORT,
    memoryStore: useMemoryOnly,
  };
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
    payment?.payer?.email ||
    payment?.metadata?.email ||
    payment?.metadata?.customer_email ||
    null
  );
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function handleCreatePayment(req, res) {
  const body = await readJson(req);
  const email = String(body.email || "")
    .trim()
    .toLowerCase();
  const marketingConsent = body.marketingConsent === true || body.marketingConsent === "1";

  if (!isValidEmail(email)) {
    return sendJson(res, 400, { error: "Укажите корректный email." });
  }

  const amountValue = PAYMENT_AMOUNT;

  const paymentBody = {
    amount: {
      value: amountValue,
      currency: "RUB",
    },
    capture: true,
    confirmation: {
      type: "redirect",
      return_url: RETURN_URL,
    },
    description: "Нейробук Axonia Kids",
    metadata: {
      email,
      product: "neurobook",
      marketing_consent: marketingConsent ? "1" : "0",
    },
  };

  if (INCLUDE_RECEIPT) {
    paymentBody.receipt = {
      customer: { email },
      items: [
        {
          description: "Нейробук Axonia Kids",
          quantity: "1.00",
          amount: {
            value: amountValue,
            currency: "RUB",
          },
          vat_code: 1,
          payment_mode: "full_payment",
          payment_subject: "intellectual_activity",
        },
      ],
    };
  }

  const payment = await yooKassaRequest("/payments", {
    method: "POST",
    headers: { "Idempotence-Key": crypto.randomUUID() },
    body: paymentBody,
  });

  const confirmationUrl = payment?.confirmation?.confirmation_url;
  if (!confirmationUrl) {
    return sendJson(res, 502, { error: "ЮKassa не вернула confirmation_url" });
  }

  upsertPayment({
    id: payment.id,
    status: payment.status,
    amount: payment.amount,
    email,
    paid: false,
    updatedAt: Date.now(),
  });

  return sendJson(res, 200, {
    payment_id: payment.id,
    confirmation_url: confirmationUrl,
  });
}

async function handleWebhook(req, res) {
  const body = await readJson(req);
  if (!body?.event || !body?.object?.id) {
    return sendJson(res, 400, { error: "Неверный формат webhook" });
  }

  const paymentId = body.object.id;
  const payment = await yooKassaRequest(`/payments/${paymentId}`);
  const existingBefore = readStore(PAYMENTS_FILE).find((p) => p.id === payment.id);

  const email =
    extractEmail(payment) ||
    extractEmail(body.object) ||
    existingBefore?.email ||
    null;

  upsertPayment({
    id: payment.id,
    status: payment.status,
    amount: payment.amount,
    ...(email ? { email } : {}),
    paid: payment.paid === true,
    updatedAt: Date.now(),
  });

  if (body.event === "payment.succeeded" && payment.status === "succeeded") {
    if (!email) {
      console.log("payment.succeeded no email found", payment.id, {
        receiptEmail: payment?.receipt?.customer?.email,
        payerEmail: payment?.payer?.email,
        webhookReceiptEmail: body?.object?.receipt?.customer?.email,
        webhookPayerEmail: body?.object?.payer?.email,
        metadataEmail: payment?.metadata?.email,
        storedEmail: existingBefore?.email || null,
      });
    }

    if (email) {
      const existing = readStore(PAYMENTS_FILE).find((p) => p.id === payment.id);
      const alreadySent = Boolean(existing?.emailSentAt);

      if (alreadySent) {
        console.log("payment.succeeded email already sent", payment.id, email);
        return sendJson(res, 200, { ok: true });
      }

      const token = createDownloadToken(payment.id);
      const downloadUrl = `${PUBLIC_BASE_URL}/api/download?token=${token}`;

      const text = [
        `Здравствуйте!`,
        ``,
        `Оплата подтверждена.`,
        `Ваш Нейробук готов к скачиванию.`,
        ``,
        `Ссылка для скачивания (действует 24 часа):`,
        `${downloadUrl}`,
        ``,
        `Если ссылка не открывается — напишите в поддержку.`,
      ].join("\n");

      try {
        await sendEmail(email, EMAIL_SUBJECT, text);
        upsertPayment({
          id: payment.id,
          email,
          emailSentAt: Date.now(),
        });
        console.log("payment.succeeded + email sent", payment.id, email);
      } catch (e) {
        console.error("payment.succeeded email send failed", payment.id, {
          to: email,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
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

  // Для теста сейчас 1 ₽. После проверки верните "490".
  const minAmount = Number(process.env.MIN_PAYMENT_AMOUNT || process.env.PAYMENT_AMOUNT || "490");
  const value = payment?.amount?.value;
  if (value && Number(value) < minAmount) {
    return sendJson(res, 403, {
      error: `Сумма платежа меньше ${minAmount} ₽.`,
    });
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
    const parsed = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const pathname = parsed.pathname;

    if (req.method === "OPTIONS") {
      res.writeHead(204, corsHeaders());
      res.end();
      return;
    }

    // Timeweb healthcheck часто бьёт в "/" — обязательно 200
    if (
      req.method === "GET" &&
      (pathname === "/" || pathname === "/health" || pathname === "/healthz")
    ) {
      return sendJson(res, 200, healthPayload());
    }

    if (req.method === "POST" && pathname === "/api/yookassa/create") {
      await handleCreatePayment(req, res);
      return;
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

    res.writeHead(404, {
      "Content-Type": "text/plain; charset=utf-8",
      ...corsHeaders(),
    });
    res.end("Not Found");
  } catch (e) {
    console.error(e);
    const status = e.statusCode || 500;
    sendJson(res, status, { error: e.message || "Server error" });
  }
});

process.on("uncaughtException", (err) => {
  console.error("uncaughtException", err);
});
process.on("unhandledRejection", (err) => {
  console.error("unhandledRejection", err);
});

ensureDataFiles();

server.listen(PORT, HOST, () => {
  console.log(`Download backend listening on http://${HOST}:${PORT}`);
  console.log(`PDF present: ${fs.existsSync(PDF_PATH)} path=${PDF_PATH}`);
  console.log(`DATA_DIR=${DATA_DIR} memoryOnly=${useMemoryOnly}`);
});
