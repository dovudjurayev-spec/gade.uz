import { env } from "./env";

export function verifyCronRequest(req: Request): boolean {
  if (!env.CRON_TOKEN) return false;
  const token = req.headers.get("x-cron-token");
  return token === env.CRON_TOKEN;
}
