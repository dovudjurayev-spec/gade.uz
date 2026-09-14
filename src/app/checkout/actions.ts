"use server";

import { redirect } from "next/navigation";
import { createOrder, type CreateOrderInput } from "@/services/orders/create-order";
import { signOrderNumber } from "@/lib/order-token";

export async function submitOrderAction(input: CreateOrderInput) {
  const result = await createOrder(input);
  if (!result.ok) {
    return result;
  }
  const token = signOrderNumber(result.orderNumber);
  const suffix = token ? `?t=${token}` : "";
  const isOnline = input.paymentMethod === "payme" || input.paymentMethod === "click";
  const target = isOnline ? "/payment/" : "/checkout/success/";
  redirect(`${target}${result.orderNumber}${suffix}`);
}
