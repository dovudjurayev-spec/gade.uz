import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { orders, paymentTransactions } from "@/db/schema";
import { env } from "@/lib/env";

// Click Merchant API. Amount передаётся в СУМАХ (десятичное), заказы у нас в тийинах.
// Prepare (action=0): проверить и вернуть merchant_prepare_id.
// Complete (action=1): подтвердить, что оплата прошла.

export const ClickError = {
  Success: 0,
  SignCheckFailed: -1,
  IncorrectAmount: -2,
  ActionNotFound: -3,
  AlreadyPaid: -4,
  UserNotFound: -5,
  TransactionNotFound: -6,
  FailedToUpdateUser: -7,
  ErrorInRequest: -8,
  TransactionCancelled: -9,
} as const;

export type ClickCallback = {
  click_trans_id: string;
  service_id: string;
  merchant_trans_id: string; // наш order_id или order.number
  merchant_prepare_id?: string;
  amount: string; // в сумах
  action: string; // "0" prepare, "1" complete
  error: string;
  error_note?: string;
  sign_time: string;
  sign_string: string;
};

function calcSign(cb: ClickCallback, action: "0" | "1"): string {
  const parts =
    action === "0"
      ? [cb.click_trans_id, cb.service_id, env.CLICK_SECRET_KEY, cb.merchant_trans_id, cb.amount, cb.action, cb.sign_time]
      : [cb.click_trans_id, cb.service_id, env.CLICK_SECRET_KEY, cb.merchant_trans_id, cb.merchant_prepare_id ?? "", cb.amount, cb.action, cb.sign_time];
  return crypto.createHash("md5").update(parts.join("")).digest("hex");
}

type Response = {
  click_trans_id: string;
  merchant_trans_id: string;
  merchant_prepare_id?: string;
  merchant_confirm_id?: string;
  error: number;
  error_note: string;
};

function baseResponse(cb: ClickCallback, error: number, note: string): Response {
  return {
    click_trans_id: cb.click_trans_id,
    merchant_trans_id: cb.merchant_trans_id,
    error,
    error_note: note,
  };
}

export async function handleClickCallback(cb: ClickCallback): Promise<Response> {
  if (!env.CLICK_SECRET_KEY || !env.CLICK_SERVICE_ID) {
    return baseResponse(cb, ClickError.SignCheckFailed, "Merchant not configured");
  }
  if (cb.service_id !== env.CLICK_SERVICE_ID) {
    return baseResponse(cb, ClickError.SignCheckFailed, "Invalid service_id");
  }

  const expected = calcSign(cb, cb.action as "0" | "1");
  if (expected !== cb.sign_string) {
    return baseResponse(cb, ClickError.SignCheckFailed, "SIGN CHECK FAILED");
  }

  // merchant_trans_id — номер заказа (YY-NNNNNN)
  const order = await db.query.orders.findFirst({
    where: eq(orders.number, cb.merchant_trans_id),
  });
  if (!order) return baseResponse(cb, ClickError.UserNotFound, "Order not found");

  // Клик возвращает сумму в сумах; в БД — в тийинах
  const amountTiyin = Math.round(parseFloat(cb.amount) * 100);
  if (amountTiyin !== order.totalTiyin) {
    return baseResponse(cb, ClickError.IncorrectAmount, "Incorrect amount");
  }

  const providerTxId = cb.click_trans_id;

  if (cb.action === "0") {
    // Prepare
    if (order.status === "paid") {
      return baseResponse(cb, ClickError.AlreadyPaid, "Already paid");
    }

    let tx = await db.query.paymentTransactions.findFirst({
      where: and(
        eq(paymentTransactions.provider, "click"),
        eq(paymentTransactions.providerTxId, providerTxId),
      ),
    });

    if (!tx) {
      const [inserted] = await db
        .insert(paymentTransactions)
        .values({
          orderId: order.id,
          provider: "click",
          providerTxId,
          amountTiyin,
          status: "created",
          rawPayload: { prepare: cb },
        })
        .returning();
      tx = inserted!;
    }

    return {
      ...baseResponse(cb, ClickError.Success, "Success"),
      merchant_prepare_id: String(tx.id),
    };
  }

  if (cb.action === "1") {
    // Complete
    const tx = await db.query.paymentTransactions.findFirst({
      where: and(
        eq(paymentTransactions.provider, "click"),
        eq(paymentTransactions.providerTxId, providerTxId),
      ),
    });
    if (!tx) return baseResponse(cb, ClickError.TransactionNotFound, "Transaction not found");
    if (String(tx.id) !== cb.merchant_prepare_id) {
      return baseResponse(cb, ClickError.TransactionNotFound, "Prepare id mismatch");
    }

    // Если Click передал ошибку в error != 0 — отменяем
    const clickError = Number(cb.error);
    if (clickError < 0) {
      await db.transaction(async (t) => {
        await t
          .update(paymentTransactions)
          .set({ status: "cancelled", rawPayload: { ...(tx.rawPayload as object ?? {}), complete: cb } })
          .where(eq(paymentTransactions.id, tx.id));
        await t.update(orders).set({ status: "cancelled" }).where(eq(orders.id, order.id));
      });
      return {
        ...baseResponse(cb, ClickError.TransactionCancelled, "Cancelled by user"),
        merchant_confirm_id: String(tx.id),
      };
    }

    if (tx.status === "paid") {
      return {
        ...baseResponse(cb, ClickError.Success, "Already confirmed"),
        merchant_confirm_id: String(tx.id),
      };
    }
    if (tx.status !== "created") {
      return baseResponse(cb, ClickError.TransactionCancelled, "Transaction is cancelled");
    }

    await db.transaction(async (t) => {
      await t
        .update(paymentTransactions)
        .set({ status: "paid", rawPayload: { ...(tx.rawPayload as object ?? {}), complete: cb } })
        .where(eq(paymentTransactions.id, tx.id));
      await t.update(orders).set({ status: "paid" }).where(eq(orders.id, order.id));
    });

    return {
      ...baseResponse(cb, ClickError.Success, "Success"),
      merchant_confirm_id: String(tx.id),
    };
  }

  return baseResponse(cb, ClickError.ActionNotFound, "Unknown action");
}

// URL для редиректа пользователя на Click checkout
export function buildClickCheckoutUrl(params: {
  merchantId: string;
  serviceId: string;
  amountSum: number;
  orderNumber: string;
  returnUrl: string;
}): string {
  const url = new URL("https://my.click.uz/services/pay");
  url.searchParams.set("service_id", params.serviceId);
  url.searchParams.set("merchant_id", params.merchantId);
  url.searchParams.set("amount", params.amountSum.toFixed(2));
  url.searchParams.set("transaction_param", params.orderNumber);
  url.searchParams.set("return_url", params.returnUrl);
  return url.toString();
}
