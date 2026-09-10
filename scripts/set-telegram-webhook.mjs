#!/usr/bin/env node
/**
 * Скрипт для регистрации Telegram Webhook.
 *
 * Использование:
 *   node scripts/set-telegram-webhook.mjs
 *
 * Переменные окружения (или .env):
 *   TELEGRAM_BOT_TOKEN  — токен бота от @BotFather
 *   WEBHOOK_URL         — публичный URL воркера (по умолчанию из wrangler.toml)
 *
 * Примеры:
 *   TELEGRAM_BOT_TOKEN=123:ABC node scripts/set-telegram-webhook.mjs
 *   TELEGRAM_BOT_TOKEN=123:ABC WEBHOOK_URL=https://my-worker.workers.dev node scripts/set-telegram-webhook.mjs
 */

import { readFileSync } from "fs";
import { resolve } from "path";

// Пробуем загрузить .env вручную (без dotenv)
try {
  const envFile = readFileSync(resolve(process.cwd(), ".env"), "utf-8");
  for (const line of envFile.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  }
} catch {
  // .env не найден — это нормально
}

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_URL =
  process.env.WEBHOOK_URL ||
  "https://x-manager.igris-volium.workers.dev/api/telegram/webhook";

if (!BOT_TOKEN) {
  console.error("❌ Не задан TELEGRAM_BOT_TOKEN");
  console.error("   Установи переменную окружения или добавь в .env");
  console.error("   Пример: TELEGRAM_BOT_TOKEN=123:ABC node scripts/set-telegram-webhook.mjs");
  process.exit(1);
}

async function apiCall(method, body = {}) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await resp.json();
  if (!data.ok) {
    throw new Error(`Telegram API ${method} error: ${JSON.stringify(data)}`);
  }
  return data;
}

async function main() {
  console.log("🤖 X-Manager Telegram Bot — Setup Webhook");
  console.log("─".repeat(50));

  // 1. Проверяем бота
  const me = await apiCall("getMe");
  console.log(`✅ Бот найден: @${me.result.username} (${me.result.first_name})`);

  // 2. Устанавливаем webhook
  console.log(`\n🔗 Устанавливаем webhook на:`);
  console.log(`   ${WEBHOOK_URL}`);

  await apiCall("setWebhook", {
    url: WEBHOOK_URL,
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: true,
  });
  console.log("✅ Webhook установлен!");

  // 3. Регистрируем команды
  await apiCall("setMyCommands", {
    commands: [
      { command: "start", description: "Приветствие и список команд" },
      { command: "model", description: "Выбрать AI-модель" },
      { command: "newchat", description: "Начать новый чат" },
      { command: "post", description: "Создать пост (тема через пробел)" },
      { command: "find", description: "Найти пост (запрос через пробел)" },
    ],
  });
  console.log("✅ Команды зарегистрированы!");

  // 4. Проверяем webhook info
  const webhookInfo = await apiCall("getWebhookInfo");
  console.log("\n📊 Информация о webhook:");
  console.log(`   URL:            ${webhookInfo.result.url}`);
  console.log(`   Pending updates: ${webhookInfo.result.pending_update_count}`);
  console.log(`   Last error:     ${webhookInfo.result.last_error_message || "нет"}`);

  console.log("\n🚀 Готово! Бот запущен. Открой Telegram и напиши /start");
  console.log(`   https://t.me/${me.result.username}`);
}

main().catch((err) => {
  console.error("❌ Ошибка:", err.message);
  process.exit(1);
});
