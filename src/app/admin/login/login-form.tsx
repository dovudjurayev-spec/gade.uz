"use client";

import { useState, useTransition } from "react";
import { loginAction } from "./actions";

export function LoginForm({ nextUrl, initialError }: { nextUrl: string; initialError?: string }) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await loginAction({ login, password, nextUrl });
      if (result && !result.ok) setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        required
        autoComplete="username"
        value={login}
        onChange={(e) => setLogin(e.target.value)}
        placeholder="Логин"
        className="w-full h-12 border px-3"
      />
      <input
        required
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Пароль"
        className="w-full h-12 border px-3"
      />
      {error && <div className="text-sm text-red-600">{error}</div>}
      <button
        type="submit"
        disabled={pending}
        className="w-full h-12 bg-brand text-white uppercase tracking-widest text-sm disabled:bg-neutral-400"
      >
        {pending ? "Проверяем..." : "Войти"}
      </button>
    </form>
  );
}
