import { Resend } from "resend";
import { env } from "@/lib/env";

let client: Resend | null = null;
function getClient(): Resend | null {
  if (!env.RESEND_API_KEY) return null;
  if (!client) client = new Resend(env.RESEND_API_KEY);
  return client;
}

export type SendEmailInput = { to: string; subject: string; html: string; text?: string };

export async function sendEmail({ to, subject, html, text }: SendEmailInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const c = getClient();
  if (!c) {
    if (env.NODE_ENV !== "production") {
      console.log(`[email:dev] to=${to} subject=${subject}\n${text ?? html}`);
      return { ok: true };
    }
    return { ok: false, error: "RESEND_API_KEY is not set" };
  }
  try {
    const res = await c.emails.send({ from: env.RESEND_FROM, to, subject, html, text });
    if (res.error) return { ok: false, error: res.error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "send failed" };
  }
}

export async function sendVerificationCodeEmail(to: string, code: string) {
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#111">
      <h2 style="margin:0 0 16px">Подтверждение email</h2>
      <p>Ваш код подтверждения для регистрации на GADE.uz:</p>
      <div style="font-size:32px;letter-spacing:8px;font-weight:600;margin:24px 0;padding:16px;background:#f5f5f5;text-align:center;border-radius:4px">${code}</div>
      <p style="color:#666;font-size:12px">Код действителен 10 минут. Если вы не регистрировались на GADE.uz — просто проигнорируйте это письмо.</p>
    </div>`;
  const text = `Код подтверждения GADE.uz: ${code}\n\nКод действителен 10 минут.`;
  return sendEmail({ to, subject: `GADE.uz — код подтверждения ${code}`, html, text });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#111">
      <h2 style="margin:0 0 16px">Сброс пароля</h2>
      <p>Мы получили запрос на сброс пароля для аккаунта <b>${to}</b>.</p>
      <p><a href="${resetUrl}" style="display:inline-block;background:#111;color:#fff;padding:12px 20px;text-decoration:none;letter-spacing:.05em;text-transform:uppercase;font-size:12px">Задать новый пароль</a></p>
      <p style="color:#666;font-size:12px">Ссылка действительна 1 час. Если вы не запрашивали сброс — проигнорируйте это письмо.</p>
    </div>`;
  const text = `Сброс пароля\n\nПерейдите по ссылке (действительна 1 час):\n${resetUrl}\n\nЕсли вы не запрашивали сброс — проигнорируйте письмо.`;
  return sendEmail({ to, subject: "GADE.uz — сброс пароля", html, text });
}
