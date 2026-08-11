export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending_payment: "Ожидает оплаты",
  confirmed: "Подтверждён",
  paid: "Оплачен",
  processing: "В работе",
  shipped: "Отправлен",
  delivered: "Доставлен",
  cancelled: "Отменён",
  refunded: "Возвращён",
};

export const ORDER_STATUS_TONE: Record<string, string> = {
  pending_payment: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  processing: "bg-indigo-100 text-indigo-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-neutral-200 text-neutral-800",
  cancelled: "bg-red-100 text-red-800",
  refunded: "bg-neutral-200 text-neutral-800",
};

export const PAYMENT_LABEL: Record<string, string> = {
  payme: "Payme",
  click: "Click",
  card_on_delivery: "Картой при получении",
  cash_on_delivery: "Наличными при получении",
};

export const DELIVERY_LABEL: Record<string, string> = {
  courier_tashkent: "Курьер по Ташкенту",
  region_shipping: "В регион",
  pickup: "Самовывоз",
};
