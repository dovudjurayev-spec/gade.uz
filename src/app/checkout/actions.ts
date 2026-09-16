"use server";

import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { orders } from "@/db/schema";
import { createOrder, type CreateOrderInput } from "@/services/orders/create-order";
import { signOrderNumber } from "@/lib/order-token";
import { env } from "@/lib/env";
import { buildPaymeCheckoutUrl } from "@/services/payments/payme/checkout-url";
import { getCurrentCustomer } from "@/lib/customer-auth";

export type SubmitOrderResult =
  | { ok: false; error: string }
  | { ok: true; redirectUrl: string; orderNumber: string; orderToken: string };

export async function submitOrderAction(
  input: CreateOrderInput,
  options?: { returnMode?: "web" | "tma" },
): Promise<SubmitOrderResult | void> {
  const result = await createOrder(input);
  if (!result.ok) {
    return result;
  }
  const token = signOrderNumber(result.orderNumber);
  const suffix = token ? `?t=${token}` : "";

  if (input.paymentMethod === "payme" && env.PAYME_MERCHANT_ID) {
    // Payme использует returnUrl и для успеха, и для «Отмена». На десктопе
    // возвращаемся на веб-success, чтобы «Отмена» не уводила в Telegram-бот;
    // в TMA/мобиле — на deep-link мини-аппа, если он сконфигурирован.
    const webReturn = `${env.APP_URL}/checkout/success/${result.orderNumber}${suffix}`;
    const tmaReturn =
      env.TELEGRAM_TMA_BOT_USERNAME && env.TELEGRAM_TMA_APP_SHORT_NAME
        ? `https://t.me/${env.TELEGRAM_TMA_BOT_USERNAME}/${env.TELEGRAM_TMA_APP_SHORT_NAME}?startapp=${encodeURIComponent(
            `paid_${result.orderNumber}_${token}`,
          )}`
        : null;
    const returnUrl = options?.returnMode === "web" || !tmaReturn ? webReturn : tmaReturn;
    const url = buildPaymeCheckoutUrl({
      merchantId: env.PAYME_MERCHANT_ID,
      orderId: result.orderId,
      amountTiyin: result.totalTiyin,
      returnUrl,
    });
    return { ok: true, redirectUrl: url, orderNumber: result.orderNumber, orderToken: token };
  }

  redirect(`/checkout/success/${result.orderNumber}${suffix}`);
}

export type PayOrderResult =
  | { ok: false; error: string }
  | { ok: true; redirectUrl: string };

export async function payOrderAction(
  orderNumber: string,
  options?: { returnMode?: "web" | "tma" },
): Promise<PayOrderResult> {
  const customer = await getCurrentCustomer();
  if (!customer) return { ok: false, error: "Требуется вход" };
  const order = await db.query.orders.findFirst({
    where: and(eq(orders.number, orderNumber), eq(orders.customerId, customer.id)),
  });
  if (!order) return { ok: false, error: "Заказ не найден" };
  if (order.status !== "pending_payment") return { ok: false, error: "Заказ уже обработан" };
  if (order.paymentMethod !== "payme") return { ok: false, error: "Оплата недоступна" };
  if (!env.PAYME_MERCHANT_ID) return { ok: false, error: "Payme не настроен" };

  const token = signOrderNumber(order.number);
  const suffix = token ? `?t=${token}` : "";
  const webReturn = `${env.APP_URL}/checkout/success/${order.number}${suffix}`;
  const tmaReturn =
    env.TELEGRAM_TMA_BOT_USERNAME && env.TELEGRAM_TMA_APP_SHORT_NAME
      ? `https://t.me/${env.TELEGRAM_TMA_BOT_USERNAME}/${env.TELEGRAM_TMA_APP_SHORT_NAME}?startapp=${encodeURIComponent(
          `paid_${order.number}_${token}`,
        )}`
      : null;
  const returnUrl = options?.returnMode === "web" || !tmaReturn ? webReturn : tmaReturn;
  const url = buildPaymeCheckoutUrl({
    merchantId: env.PAYME_MERCHANT_ID,
    orderId: order.id,
    amountTiyin: order.totalTiyin,
    returnUrl,
  });
  return { ok: true, redirectUrl: url };
}
