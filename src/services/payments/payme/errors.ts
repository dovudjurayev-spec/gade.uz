// Стандартные коды ошибок Payme Merchant API.
// message — строка (RU), т.к. sandbox Payme ожидает string, а не локализованный объект.
export const PaymeError = {
  InvalidAmount: { code: -31001, message: "Неверная сумма" },
  TransactionNotFound: { code: -31003, message: "Транзакция не найдена" },
  CannotPerform: { code: -31008, message: "Невозможно выполнить операцию" },
  CannotCancel: { code: -31007, message: "Невозможно отменить" },
  OrderNotFound: { code: -31050, message: "Заказ не найден" },
  OrderAlreadyPaid: { code: -31051, message: "Заказ уже оплачен" },
  InvalidAccount: { code: -31099, message: "Неверные параметры счёта" },
  Unauthorized: { code: -32504, message: "Ошибка авторизации" },
} as const;

export type PaymeErrorCode = (typeof PaymeError)[keyof typeof PaymeError];

// Payme transaction states
export const PaymeState = {
  Created: 1,
  Completed: 2,
  Cancelled: -1,
  CancelledAfterComplete: -2,
} as const;
