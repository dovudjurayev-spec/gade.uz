import { desc, eq } from "drizzle-orm";
import { MapPin, Star, Trash2, Check } from "lucide-react";
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
    <div className="space-y-10">
      <div>
        <div className="text-[11px] uppercase tracking-[0.3em] text-neutral-500 mb-3">
          Профиль · Адреса
        </div>
        <h1 className="text-3xl md:text-4xl font-light tracking-tight text-neutral-900">
          Мои адреса
        </h1>
        <p className="text-sm text-neutral-600 mt-3 max-w-2xl leading-relaxed">
          Сохранённые адреса подставятся автоматически при оформлении заказа — не придётся заполнять форму каждый раз. Отметьте точку на карте, чтобы курьер приехал точно к нужному подъезду.
        </p>
      </div>

      {list.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-[0.25em] text-neutral-500 mb-3">
            Сохранённые адреса
          </div>
          <div className="divide-y divide-neutral-200 border border-neutral-200">
            {list.map((a) => (
              <div key={a.id} className="flex items-start gap-4 p-5 group">
                <div className="shrink-0 h-10 w-10 grid place-items-center rounded-md bg-neutral-900 text-white">
                  <MapPin className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="text-sm font-medium text-neutral-900">
                      {a.label || "Адрес"}
                    </div>
                    {a.isDefault && (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-neutral-900 border border-neutral-900 px-2 py-0.5">
                        <Check className="h-3 w-3" strokeWidth={2} />
                        По умолчанию
                      </span>
                    )}
                    {a.lat != null && a.lng != null && (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-neutral-500 border border-neutral-200 px-2 py-0.5">
                        <MapPin className="h-3 w-3" strokeWidth={1.5} />
                        На карте
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-neutral-700 mt-1.5">
                    {a.city}{a.district ? `, ${a.district}` : ""}, {a.street}
                    {a.apartment ? `, кв./оф. ${a.apartment}` : ""}
                  </div>
                  {a.comment && (
                    <div className="text-xs text-neutral-500 mt-1.5 leading-relaxed">
                      {a.comment}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0 -mr-2">
                  {!a.isDefault && (
                    <form action={setDefaultAddressAction.bind(null, a.id)}>
                      <button
                        type="submit"
                        title="Сделать основным"
                        className="inline-flex items-center gap-1.5 h-9 px-3 text-[11px] uppercase tracking-widest text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
                      >
                        <Star className="h-3.5 w-3.5" strokeWidth={1.5} />
                        Основной
                      </button>
                    </form>
                  )}
                  <form action={deleteAddressAction.bind(null, a.id)}>
                    <button
                      type="submit"
                      title="Удалить"
                      className="inline-flex items-center justify-center h-9 w-9 text-neutral-500 hover:text-red-600 hover:bg-neutral-100 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <AddressForm />
    </div>
  );
}
