import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { orders } from "@/db/schema";
import { env } from "@/lib/env";
import { buildPaymeCheckoutUrl } from "@/services/payments/payme/checkout-url";
import { buildClickCheckoutUrl } from "@/services/payments/click/handler";
import { formatPrice } from "@/lib/money";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Params = Promise<{ number: string }>;

export default async function PaymentPage({ params }: { params: Params }) {
  const { number } = await params;
  const order = await db.query.orders.findFirst({ where: eq(orders.number, number) });
  if (!order) notFound();

  const returnUrl = `${env.APP_URL}/checkout/success/${order.number}`;

  if (order.status === "paid") {
    redirect(`/checkout/success/${order.number}`);
  }

  if (order.paymentMethod === "payme" && env.PAYME_MERCHANT_ID) {
    const url = buildPaymeCheckoutUrl({
      merchantId: env.PAYME_MERCHANT_ID,
      orderId: order.id,
      amountTiyin: order.totalTiyin,
      returnUrl,
    });
    redirect(url);
  }

  if (order.paymentMethod === "click" && env.CLICK_MERCHANT_ID && env.CLICK_SERVICE_ID) {
    const url = buildClickCheckoutUrl({
      merchantId: env.CLICK_MERCHANT_ID,
      serviceId: env.CLICK_SERVICE_ID,
      amountSum: order.totalTiyin / 100,
      orderNumber: order.number,
      returnUrl,
    });
    redirect(url);
  }

  // Fallback: провайдер не настроен
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-2xl mb-4">Оплата временно недоступна</h1>
      <p className="text-neutral-600 mb-6">
        Заказ №{order.number} на сумму {formatPrice(order.totalTiyin)} сохранён. Менеджер свяжется с вами.
      </p>
      <Link href={`/checkout/success/${order.number}`} className="underline">
        Вернуться к заказу
      </Link>
    </div>
  );
}
