"use server";

import { redirect } from "next/navigation";
import { createOrder, type CreateOrderInput } from "@/services/orders/create-order";

export async function submitOrderAction(input: CreateOrderInput) {
  const result = await createOrder(input);
  if (!result.ok) {
    return result;
  }
  // Клиент подхватит redirect и очистит корзину
  redirect(`/checkout/success/${result.orderNumber}`);
}
