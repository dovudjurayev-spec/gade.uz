import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { orders } from "@/db/schema";
import { formatPrice } from "@/lib/money";
import { formatPhoneUz } from "@/lib/phone";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { verifyOrderToken } from "@/lib/order-token";
import { ClearCart } from "../clear-cart";

export const dynamic = "force-dynamic";

type Params = Promise<{ number: string }>;
type Search = Promise<{ t?: string }>;

export default async function SuccessPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const { number } = await params;
  const { t } = await searchParams;
  const order = await db.query.orders.findFirst({
    where: eq(orders.number, number),
  });
  if (!order) notFound();

  const current = await getCurrentCustomer();
  const isOwner = current?.id === order.customerId;
  if (!isOwner && !verifyOrderToken(order.number, t ?? null)) {
    notFound();
  }
  const tokenSuffix = !isOwner && t ? `?t=${encodeURIComponent(t)}` : "";

  const requiresOnlinePayment =
    order.paymentMethod === "payme" || order.paymentMethod === "click";

  return (
    <div className="mx-auto max-w-2xl px-4 md:px-8 py-16 text-center">
      <ClearCart />
      <div className="text-6xl mb-4">✓</div>
      <h1 className="text-3xl md:text-4xl mb-3">Спасибо за заказ!</h1>
      <p className="text-neutral-600 mb-8">
        Номер вашего заказа: <span className="font-semibold">№{order.number}</span>
      </p>

      <div className="border p-6 text-left space-y-2 text-sm mb-8">
        <Row label="Имя" value={order.customerName} />
        <Row label="Телефон" value={formatPhoneUz(order.customerPhone)} />
        <Row label="Сумма" value={formatPrice(order.totalTiyin)} />
        <Row
          label="Оплата"
          value={
            {
              payme: "Payme (онлайн)",
              click: "Click (онлайн)",
              card_on_delivery: "Картой при получении",
              cash_on_delivery: "Наличными при получении",
            }[order.paymentMethod]
          }
        />
      </div>

      {requiresOnlinePayment && (
        <div className="border-2 border-brand-accent p-4 mb-8 text-sm">
          Заказ создан. Перейдите к оплате — после подтверждения мы начнём его собирать.
          <div className="mt-3">
            <Link
              href={`/payment/${order.number}${tokenSuffix}`}
              className="inline-block bg-brand text-white px-6 py-3 uppercase tracking-widest text-xs hover:bg-brand-accent"
            >
              Оплатить
            </Link>
          </div>
        </div>
      )}

      {!requiresOnlinePayment && (
        <p className="text-neutral-600 mb-8">
          Менеджер перезвонит вам в течение нескольких минут для подтверждения.
        </p>
      )}

      <div className="flex flex-col md:flex-row gap-3 justify-center">
        <a
          href="https://t.me/"
          className="inline-flex items-center justify-center border border-neutral-900 px-6 py-3 text-sm uppercase tracking-widest hover:bg-brand hover:text-white"
        >
          Написать в Telegram
        </a>
        <Link
          href="/catalog"
          className="inline-flex items-center justify-center border border-neutral-300 px-6 py-3 text-sm uppercase tracking-widest hover:border-neutral-900"
        >
          Продолжить покупки
        </Link>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-neutral-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
