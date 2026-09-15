import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { orders } from "@/db/schema";
import { env } from "@/lib/env";
import { buildPaymeCheckoutUrl } from "@/services/payments/payme/checkout-url";
import { buildClickCheckoutUrl } from "@/services/payments/click/handler";
import { formatPrice } from "@/lib/money";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { signOrderNumber, verifyOrderToken } from "@/lib/order-token";
import Link from "next/link";
import { RedirectToPayment } from "./redirect-client";

export const dynamic = "force-dynamic";

type Params = Promise<{ number: string }>;
type Search = Promise<{ t?: string }>;

export default async function PaymentPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const { number } = await params;
  const { t } = await searchParams;
  const order = await db.query.orders.findFirst({ where: eq(orders.number, number) });
  if (!order) notFound();

  const current = await getCurrentCustomer();
  const isOwner = current?.id === order.customerId;
  if (!isOwner && !verifyOrderToken(order.number, t ?? null)) {
    notFound();
  }
  // Токен подписи вставляем всегда, даже владельцу: возврат из Payme может
  // происходить в отдельном in-app браузере Telegram (при tg.openLink) или
  // из внешнего браузера, где кука customerAuth недоступна.
  const orderToken = signOrderNumber(order.number);
  const successToken = `?t=${encodeURIComponent(orderToken)}`;
  // Если настроен deep-link мини-аппа — возврат после оплаты уводит юзера обратно
  // в мини-апп через t.me/<bot>/<app>?startapp=..., иначе на веб success page.
  const returnUrl =
    env.TELEGRAM_TMA_BOT_USERNAME && env.TELEGRAM_TMA_APP_SHORT_NAME
      ? `https://t.me/${env.TELEGRAM_TMA_BOT_USERNAME}/${env.TELEGRAM_TMA_APP_SHORT_NAME}?startapp=${encodeURIComponent(
          `paid_${order.number}_${orderToken}`,
        )}`
      : `${env.APP_URL}/checkout/success/${order.number}${successToken}`;

  if (order.status === "paid") {
    redirect(`/checkout/success/${order.number}${successToken}`);
  }

  if (order.paymentMethod === "payme" && env.PAYME_MERCHANT_ID) {
    const url = buildPaymeCheckoutUrl({
      merchantId: env.PAYME_MERCHANT_ID,
      orderId: order.id,
      amountTiyin: order.totalTiyin,
      returnUrl,
    });
    return <RedirectToPayment url={url} />;
  }

  if (order.paymentMethod === "click" && env.CLICK_MERCHANT_ID && env.CLICK_SERVICE_ID) {
    const url = buildClickCheckoutUrl({
      merchantId: env.CLICK_MERCHANT_ID,
      serviceId: env.CLICK_SERVICE_ID,
      amountSum: order.totalTiyin / 100,
      orderNumber: order.number,
      returnUrl,
    });
    return <RedirectToPayment url={url} />;
  }

  // Fallback: провайдер не настроен
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-2xl mb-4">Оплата временно недоступна</h1>
      <p className="text-neutral-600 mb-6">
        Заказ №{order.number} на сумму {formatPrice(order.totalTiyin)} сохранён. Менеджер свяжется с вами.
      </p>
      <Link href={`/checkout/success/${order.number}${successToken}`} className="underline">
        Вернуться к заказу
      </Link>
    </div>
  );
}
