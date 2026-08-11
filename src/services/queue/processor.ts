import { and, eq, isNull, lte, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { outboundQueue, syncLog } from "@/db/schema";
import { sendOrderToManagers, notifyTech } from "@/services/telegram/send-order";

const MAX_ATTEMPTS = 6;
const BASE_DELAY_MS = 30_000; // 30s → 1m → 2m → 4m → 8m → 16m

function nextDelay(attempts: number): number {
  return BASE_DELAY_MS * 2 ** attempts;
}

type JobPayload = { orderId: number };

async function handleJob(kind: string, payload: JobPayload): Promise<void> {
  switch (kind) {
    case "telegram_order":
      await sendOrderToManagers(payload.orderId);
      return;
    case "crm_order":
      // Billz integration — до получения доступа заглушка
      console.log(`[queue] crm_order stub for order ${payload.orderId}`);
      return;
    default:
      throw new Error(`Unknown job kind: ${kind}`);
  }
}

export async function processQueue(maxJobs = 20): Promise<{ processed: number; failed: number }> {
  const now = new Date();
  const jobs = await db
    .select()
    .from(outboundQueue)
    .where(and(isNull(outboundQueue.completedAt), lte(outboundQueue.nextAttemptAt, now)))
    .orderBy(outboundQueue.nextAttemptAt)
    .limit(maxJobs);

  let processed = 0;
  let failed = 0;

  for (const job of jobs) {
    const started = Date.now();
    try {
      await handleJob(job.kind, job.payload as JobPayload);
      await db
        .update(outboundQueue)
        .set({ completedAt: new Date(), lastError: null })
        .where(eq(outboundQueue.id, job.id));

      await db.insert(syncLog).values({
        direction: "site_to_bitrix",
        entity: job.kind,
        status: "ok",
        durationMs: Date.now() - started,
      });
      processed++;
    } catch (e) {
      failed++;
      const attempts = job.attempts + 1;
      const errorMsg = e instanceof Error ? e.message : String(e);

      if (attempts >= MAX_ATTEMPTS) {
        await db
          .update(outboundQueue)
          .set({
            attempts,
            lastError: errorMsg,
            nextAttemptAt: new Date(Date.now() + 24 * 60 * 60_000), // отложить на сутки
          })
          .where(eq(outboundQueue.id, job.id));
        await notifyTech(`Job ${job.kind}#${job.id} исчерпал попытки: ${errorMsg}`);
      } else {
        await db
          .update(outboundQueue)
          .set({
            attempts,
            lastError: errorMsg,
            nextAttemptAt: new Date(Date.now() + nextDelay(attempts)),
          })
          .where(eq(outboundQueue.id, job.id));
      }

      await db.insert(syncLog).values({
        direction: "site_to_bitrix",
        entity: job.kind,
        status: attempts >= MAX_ATTEMPTS ? "error" : "retrying",
        error: errorMsg,
        durationMs: Date.now() - started,
      });
    }
  }

  // Best-effort cleanup: старые completed можно чистить в отдельном cron; тут не трогаем.
  void sql;

  return { processed, failed };
}
