import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { customerAddresses } from "@/db/schema";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { AddressForm } from "./address-form";
import { deleteAddressAction, setDefaultAddressAction } from "./actions";

export default async function AddressesPage() {
  const customer = (await getCurrentCustomer())!;
  const list = await db.query.customerAddresses.findMany({
    where: eq(customerAddresses.customerId, customer.id),
    orderBy: [desc(customerAddresses.isDefault), desc(customerAddresses.id)],
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-sans">Мои адреса</h1>

      {list.length > 0 && (
        <div className="space-y-3">
          {list.map((a) => (
            <div key={a.id} className="border p-4 flex items-start justify-between gap-4">
              <div className="text-sm">
                <div className="font-medium">
                  {a.label || "Адрес"} {a.isDefault && <span className="ml-2 text-xs text-neutral-500">по умолчанию</span>}
                </div>
                <div className="text-neutral-600 mt-1">
                  {a.city}{a.district ? `, ${a.district}` : ""}, {a.street}
                  {a.apartment ? `, кв./оф. ${a.apartment}` : ""}
                </div>
                {a.comment && <div className="text-xs text-neutral-500 mt-1">{a.comment}</div>}
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                {!a.isDefault && (
                  <form action={setDefaultAddressAction.bind(null, a.id)}>
                    <button className="text-xs underline">По умолчанию</button>
                  </form>
                )}
                <form action={deleteAddressAction.bind(null, a.id)}>
                  <button className="text-xs text-red-600 hover:underline">Удалить</button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddressForm />
    </div>
  );
}
