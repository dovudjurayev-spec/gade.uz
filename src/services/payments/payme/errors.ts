// Стандартные коды ошибок Payme Merchant API
export const PaymeError = {
  InvalidAmount: { code: -31001, message: { ru: "Неверная сумма", uz: "Notoʻgʻri summa", en: "Invalid amount" } },
  TransactionNotFound: { code: -31003, message: { ru: "Транзакция не найдена", uz: "Tranzaksiya topilmadi", en: "Transaction not found" } },
  CannotPerform: { code: -31008, message: { ru: "Невозможно выполнить операцию", uz: "Amalni bajarib boʻlmaydi", en: "Cannot perform operation" } },
  CannotCancel: { code: -31007, message: { ru: "Невозможно отменить", uz: "Bekor qilib boʻlmaydi", en: "Cannot cancel transaction" } },
  OrderNotFound: { code: -31050, message: { ru: "Заказ не найден", uz: "Buyurtma topilmadi", en: "Order not found" } },
  OrderAlreadyPaid: { code: -31051, message: { ru: "Заказ уже оплачен", uz: "Buyurtma toʻlangan", en: "Order already paid" } },
  InvalidAccount: { code: -31099, message: { ru: "Неверные параметры счёта", uz: "Notoʻgʻri hisob", en: "Invalid account" } },
  Unauthorized: { code: -32504, message: { ru: "Ошибка авторизации", uz: "Avtorizatsiya xatosi", en: "Unauthorized" } },
} as const;

export type PaymeErrorCode = (typeof PaymeError)[keyof typeof PaymeError];

// Payme transaction states
export const PaymeState = {
  Created: 1,
  Completed: 2,
  Cancelled: -1,
  CancelledAfterComplete: -2,
} as const;
