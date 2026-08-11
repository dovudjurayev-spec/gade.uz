"use server";

import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { createAdminSession, verifyPassword } from "@/lib/admin-auth";

export async function loginAction(input: { login: string; password: string; nextUrl: string }) {
  if (!env.ADMIN_PASSWORD_HASH || !env.ADMIN_SESSION_SECRET) {
    return { ok: false as const, error: "Админка не настроена (нет ADMIN_PASSWORD_HASH или ADMIN_SESSION_SECRET)" };
  }
  if (input.login !== env.ADMIN_LOGIN) {
    return { ok: false as const, error: "Неверный логин или пароль" };
  }
  if (!verifyPassword(input.password, env.ADMIN_PASSWORD_HASH)) {
    return { ok: false as const, error: "Неверный логин или пароль" };
  }
  await createAdminSession(input.login);
  const safeNext = input.nextUrl.startsWith("/admin") ? input.nextUrl : "/admin";
  redirect(safeNext);
}
