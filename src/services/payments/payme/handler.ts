import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { orders, paymentTransactions } from "@/db/schema";
import { PaymeError, PaymeState } from "./errors";

// Payme работает в тийинах (наши единицы совпадают)
type Account = { order_id?: string };

type RpcParams = Record<string, unknown>;
type RpcResult = { result: unknown } | { error: { code: number; message: unknown; data?: string } };

export type PaymeRpcRequest = {
  id: number | string;
  method: string;
  params: RpcParams;
};

const TIMEOUT_MS = 12 * 60 * 60 * 1000; // 12h — Payme рекомендация

function err(code: (typeof PaymeError)[keyof typeof PaymeError], data?: string): RpcResult {
  return { error: { code: code.code, message: code.message, data } };
}

async function findOrderByAccount(account: Account) {
  const orderId = Number(account?.order_id);
  if (!Number.isFinite(orderId)) return null;
  return db.query.orders.findFirst({ where: eq(orders.id, orderId) });
}

async function findTx(providerTxId: string) {
  return db.query.paymentTransactions.findFirst({
    where: and(
      eq(paymentTransactions.provider, "payme"),
      eq(paymentTransactions.providerTxId, providerTxId),
    ),
  });
}

// --- Methods ---

async function checkPerformTransaction(params: RpcParams): Promise<RpcResult> {
  const account = (params.account ?? {}) as Account;
  const amount = Number(params.amount);
  const order = await findOrderByAccount(account);
  if (!order) return err(PaymeError.OrderNotFound);
  if (order.totalTiyin !== amount) return err(PaymeError.InvalidAmount);
  if (order.status === "paid" || order.status === "delivered" || order.status === "shipped") {
    return err(PaymeError.OrderAlreadyPaid);
  }
  return { result: { allow: true } };
}

async function createTransaction(params: RpcParams): Promise<RpcResult> {
  const account = (params.account ?? {}) as Account;
  const amount = Number(params.amount);
  const id = String(params.id);
  const time = Number(params.time);

  const order = await findOrderByAccount(account);
  if (!order) return err(PaymeError.OrderNotFound);
  if (order.totalTiyin !== amount) return err(PaymeError.InvalidAmount);

  const existing = await findTx(id);
  if (existing) {
    if (existing.status !== "created") return err(PaymeError.CannotPerform);
    const raw = (existing.rawPayload ?? {}) as { time?: number; state?: number };
    return {
      result: {
        create_time: raw.time ?? time,
        transaction: String(existing.id),
        state: raw.state ?? PaymeState.Created,
      },
    };
  }

  // Другая активная транзакция для этого заказа? — не даём создать
  const otherActive = await db.query.paymentTransactions.findFirst({
    where: and(
      eq(paymentTransactions.orderId, order.id),
      eq(paymentTransactions.provider, "payme"),
      eq(paymentTransactions.status, "created"),
    ),
  });
  if (otherActive) return err(PaymeError.CannotPerform);

  const [inserted] = await db
    .insert(paymentTransactions)
    .values({
      orderId: order.id,
      provider: "payme",
      providerTxId: id,
      amountTiyin: amount,
      status: "created",
      rawPayload: { time, state: PaymeState.Created, account },
    })
    .returning();

  return {
    result: {
      create_time: time,
      transaction: String(inserted!.id),
      state: PaymeState.Created,
    },
  };
}

async function performTransaction(params: RpcParams): Promise<RpcResult> {
  const id = String(params.id);
  const tx = await findTx(id);
  if (!tx) return err(PaymeError.TransactionNotFound);
  const raw = (tx.rawPayload ?? {}) as { time?: number; state?: number; perform_time?: number };

  if (tx.status === "paid") {
    return {
      result: {
        transaction: String(tx.id),
        perform_time: raw.perform_time ?? Date.now(),
        state: PaymeState.Completed,
      },
    };
  }

  if (tx.status !== "created") return err(PaymeError.CannotPerform);

  // Таймаут: транзакция висит >12ч — отменяем автоматом
  const createdMs = raw.time ?? tx.createdAt.getTime();
  if (Date.now() - createdMs > TIMEOUT_MS) {
    await db
      .update(paymentTransactions)
      .set({
        status: "cancelled",
        rawPayload: { ...raw, state: PaymeState.Cancelled, reason: 4 },
      })
      .where(eq(paymentTransactions.id, tx.id));
    return err(PaymeError.CannotPerform);
  }

  const performTime = Date.now();
  await db.transaction(async (t) => {
    await t
      .update(paymentTransactions)
      .set({
        status: "paid",
        rawPayload: { ...raw, state: PaymeState.Completed, perform_time: performTime },
      })
      .where(eq(paymentTransactions.id, tx.id));
    await t
      .update(orders)
      .set({ status: "paid" })
      .where(eq(orders.id, tx.orderId));
  });

  return {
    result: {
      transaction: String(tx.id),
      perform_time: performTime,
      state: PaymeState.Completed,
    },
  };
}

async function cancelTransaction(params: RpcParams): Promise<RpcResult> {
  const id = String(params.id);
  const reason = Number(params.reason);
  const tx = await findTx(id);
  if (!tx) return err(PaymeError.TransactionNotFound);
  const raw = (tx.rawPayload ?? {}) as { state?: number; cancel_time?: number };

  if (tx.status === "cancelled") {
    return {
      result: {
        transaction: String(tx.id),
        cancel_time: raw.cancel_time ?? Date.now(),
        state: raw.state ?? PaymeState.Cancelled,
      },
    };
  }

  const state = tx.status === "paid" ? PaymeState.CancelledAfterComplete : PaymeState.Cancelled;
  const cancelTime = Date.now();

  await db.transaction(async (t) => {
    await t
      .update(paymentTransactions)
      .set({
        status: "cancelled",
        rawPayload: { ...raw, state, cancel_time: cancelTime, reason },
      })
      .where(eq(paymentTransactions.id, tx.id));
    if (tx.status === "paid") {
      await t.update(orders).set({ status: "refunded" }).where(eq(orders.id, tx.orderId));
    } else {
      // Отмена до оплаты — заказ можно только пометить, если больше активных tx нет
      await t.update(orders).set({ status: "cancelled" }).where(eq(orders.id, tx.orderId));
    }
  });

  return {
    result: { transaction: String(tx.id), cancel_time: cancelTime, state },
  };
}

async function checkTransaction(params: RpcParams): Promise<RpcResult> {
  const id = String(params.id);
  const tx = await findTx(id);
  if (!tx) return err(PaymeError.TransactionNotFound);
  const raw = (tx.rawPayload ?? {}) as {
    time?: number; perform_time?: number; cancel_time?: number; state?: number; reason?: number;
  };
  return {
    result: {
      create_time: raw.time ?? tx.createdAt.getTime(),
      perform_time: raw.perform_time ?? 0,
      cancel_time: raw.cancel_time ?? 0,
      transaction: String(tx.id),
      state: raw.state ?? PaymeState.Created,
      reason: raw.reason ?? null,
    },
  };
}

export async function handlePaymeRpc(req: PaymeRpcRequest): Promise<RpcResult> {
  try {
    switch (req.method) {
      case "CheckPerformTransaction": return await checkPerformTransaction(req.params);
      case "CreateTransaction":       return await createTransaction(req.params);
      case "PerformTransaction":      return await performTransaction(req.params);
      case "CancelTransaction":       return await cancelTransaction(req.params);
      case "CheckTransaction":        return await checkTransaction(req.params);
      default:
        return err(PaymeError.CannotPerform, `Unknown method: ${req.method}`);
    }
  } catch (e) {
    console.error("Payme handler error:", e);
    return err(PaymeError.CannotPerform, e instanceof Error ? e.message : String(e));
  }
}
