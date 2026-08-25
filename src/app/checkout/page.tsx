import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { customerAddresses } from "@/db/schema";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { formatPhoneUz } from "@/lib/phone";
import { loadDeliveryTariff } from "@/lib/delivery-server";
import { CheckoutForm } from "./checkout-form";

export const metadata = { title: "Оформление заказа" };
export const dynamic = "force-dynamic";

function formatAddress(a: {
  city: string;
  district: string | null;
  street: string;
  apartment: string | null;
}): string {
  return [a.city, a.district, a.street, a.apartment ? `кв. ${a.apartment}` : null]
    .filter(Boolean)
    .join(", ");
}

export default async function CheckoutPage() {
  const customer = await getCurrentCustomer();

  let addresses: { id: number; label: string; value: string; isDefault: boolean }[] = [];
  if (customer) {
    const rows = await db.query.customerAddresses.findMany({
      where: eq(customerAddresses.customerId, customer.id),
      orderBy: [desc(customerAddresses.isDefault), desc(customerAddresses.id)],
    });
    addresses = rows.map((a) => ({
      id: a.id,
      label: a.label?.trim() || (a.isDefault ? "Основной адрес" : "Адрес"),
      value: formatAddress(a),
      isDefault: a.isDefault,
    }));
  }

  const initialAddress = addresses.find((a) => a.isDefault)?.value ?? addresses[0]?.value ?? "";
  const tariff = await loadDeliveryTariff();

  return (
    <div className="mx-auto max-w-5xl px-4 md:px-8 py-8">
      <h1 className="text-2xl md:text-3xl mb-6">Оформление заказа</h1>
      <CheckoutForm
        initialName={customer?.name ?? ""}
        initialPhone={customer?.phone ? formatPhoneUz(customer.phone) : ""}
        initialAddress={initialAddress}
        savedAddresses={addresses}
        tariff={tariff}
      />
    </div>
  );
}
