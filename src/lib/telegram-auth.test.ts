import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { validateInitData } from "./telegram-auth";

const __dirname = dirname(fileURLToPath(import.meta.url));

const BOT_TOKEN = "1234567890:AAA_test_token_do_not_use_in_production";

// Собирает валидный initData от заданного набора полей.
// signHash === false — вернёт initData без hash (для теста "no hash").
function buildInitData(
  fields: Record<string, string>,
  botToken: string,
  opts: { includeHash?: boolean; overrideHash?: string } = {},
): string {
  const includeHash = opts.includeHash ?? true;

  const pairs = Object.entries(fields)
    .map(([k, v]) => `${k}=${v}`)
    .sort();
  const dataCheckString = pairs.join("\n");
  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const hash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(fields)) params.set(k, v);
  if (includeHash) params.set("hash", opts.overrideHash ?? hash);
  return params.toString();
}

function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

function validUser(): string {
  return JSON.stringify({
    id: 42,
    first_name: "Дилшод",
    last_name: "Каримов",
    username: "dilshod",
    language_code: "ru",
  });
}

test("валидный initData принимается", () => {
  const initData = buildInitData(
    { auth_date: String(nowSec()), query_id: "q1", user: validUser() },
    BOT_TOKEN,
  );
  const r = validateInitData(initData, BOT_TOKEN, 3600);
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.user.id, 42);
    assert.equal(r.user.first_name, "Дилшод");
    assert.equal(r.user.username, "dilshod");
  }
});

test("подделанный hash отклоняется", () => {
  const initData = buildInitData(
    { auth_date: String(nowSec()), user: validUser() },
    BOT_TOKEN,
    { overrideHash: "0".repeat(64) },
  );
  const r = validateInitData(initData, BOT_TOKEN, 3600);
  assert.deepEqual(r, { ok: false, reason: "bad_hash" });
});

test("изменённый user при правильном старом hash отклоняется", () => {
  const authDate = String(nowSec());
  const original = buildInitData({ auth_date: authDate, user: validUser() }, BOT_TOKEN);
  const originalHash = new URLSearchParams(original).get("hash")!;
  // Заменяем user, но оставляем старый hash — подпись перестаёт совпадать.
  const tampered = new URLSearchParams();
  tampered.set("auth_date", authDate);
  tampered.set("user", JSON.stringify({ id: 999, first_name: "Attacker" }));
  tampered.set("hash", originalHash);
  const r = validateInitData(tampered.toString(), BOT_TOKEN, 3600);
  assert.deepEqual(r, { ok: false, reason: "bad_hash" });
});

test("auth_date старше maxAgeSec отклоняется", () => {
  const twoHoursAgo = nowSec() - 2 * 3600;
  const initData = buildInitData(
    { auth_date: String(twoHoursAgo), user: validUser() },
    BOT_TOKEN,
  );
  const r = validateInitData(initData, BOT_TOKEN, 3600);
  assert.deepEqual(r, { ok: false, reason: "expired" });
});

test("отсутствующий hash отклоняется", () => {
  const initData = buildInitData(
    { auth_date: String(nowSec()), user: validUser() },
    BOT_TOKEN,
    { includeHash: false },
  );
  const r = validateInitData(initData, BOT_TOKEN, 3600);
  assert.deepEqual(r, { ok: false, reason: "bad_hash" });
});

test("отсутствующий user отклоняется", () => {
  const initData = buildInitData({ auth_date: String(nowSec()) }, BOT_TOKEN);
  const r = validateInitData(initData, BOT_TOKEN, 3600);
  assert.deepEqual(r, { ok: false, reason: "no_user" });
});

test("пустая строка отклоняется", () => {
  const r = validateInitData("", BOT_TOKEN, 3600);
  assert.deepEqual(r, { ok: false, reason: "bad_format" });
});

test("другой bot token отклоняется", () => {
  const initData = buildInitData(
    { auth_date: String(nowSec()), user: validUser() },
    BOT_TOKEN,
  );
  const r = validateInitData(initData, "9999999:OTHER_TOKEN", 3600);
  assert.deepEqual(r, { ok: false, reason: "bad_hash" });
});

test("поле signature не влияет на подпись", () => {
  // signature — новое поле third-party auth, оно должно исключаться из data_check_string
  // на равне с hash. Собираем валидный initData без signature, потом добавляем signature —
  // подпись должна оставаться валидной.
  const initData = buildInitData(
    { auth_date: String(nowSec()), user: validUser() },
    BOT_TOKEN,
  );
  const params = new URLSearchParams(initData);
  params.set("signature", "irrelevant");
  const r = validateInitData(params.toString(), BOT_TOKEN, 3600);
  assert.equal(r.ok, true);
});

test("сравнение хэшей выполняется через timingSafeEqual, не ===", () => {
  // ESM-байндинги readonly, monkey-patch недоступен, поэтому проверяем статически:
  // исходник модуля должен вызывать timingSafeEqual и не должен использовать
  // прямое сравнение hash-строк через === / !==.
  const src = readFileSync(join(__dirname, "telegram-auth.ts"), "utf8");
  assert.ok(/timingSafeEqual\s*\(/.test(src), "должен вызываться timingSafeEqual(...)");
  assert.ok(
    !/hash\s*(===|!==)\s*/.test(src) && !/computedHex\s*(===|!==)/.test(src),
    "нельзя сравнивать hash напрямую через === / !==",
  );
});
