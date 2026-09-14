"use server";

import { redirect } from "next/navigation";
import { createOrder, type CreateOrderInput } from "@/services/orders/create-order";
import { signOrderNumber } from "@/lib/order-token";
import { env } from "@/lib/env";
import { buildPaymeCheckoutUrl } from "@/services/payments/payme/checkout-url";

export type SubmitOrderResult =
  | { ok: false; error: string }
  | { ok: true; redirectUrl: string };

export async function submitOrderAction(input: CreateOrderInput): Promise<SubmitOrderResult | void> {
  const result = await createOrder(input);
  if (!result.ok) {
    return result;
  }
  const token = signOrderNumber(result.orderNumber);
  const suffix = token ? `?t=${token}` : "";

  if (input.paymentMethod === "payme" && env.PAYME_MERCHANT_ID) {
    const returnUrl = `${env.APP_URL}/checkout/success/${result.orderNumber}${suffix}`;
    const url = buildPaymeCheckoutUrl({
      merchantId: env.PAYME_MERCHANT_ID,
      orderId: result.orderId,
      amountTiyin: result.totalTiyin,
      returnUrl,
    });
    return { ok: true, redirectUrl: url };
  }

  redirect(`/checkout/success/${result.orderNumber}${suffix}`);
}
