import { CheckoutForm } from "./checkout-form";

export const metadata = { title: "Оформление заказа" };

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 md:px-8 py-8">
      <h1 className="text-2xl md:text-3xl mb-6">Оформление заказа</h1>
      <CheckoutForm />
    </div>
  );
}
