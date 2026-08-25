"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        if (json.error === "invalid") setError("Ссылка недействительна");
        else if (json.error === "expired") setError("Срок ссылки истёк — запросите новую");
        else setError("Ошибка");
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/account/login"), 1200);
    } finally {
      setPending(false);
    }
  }

  if (done) return <p className="text-sm text-green-700">Пароль обновлён. Перенаправляем на вход…</p>;

  return (
    <div className="space-y-4">
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Новый пароль"
        autoComplete="new-password"
        className="w-full h-12 border px-3"
      />
      {error && <div className="text-sm text-red-600">{error}</div>}
      <button
        onClick={submit}
        disabled={pending || password.length < 8}
        className="w-full h-12 bg-brand text-white uppercase tracking-widest text-sm disabled:bg-neutral-400"
      >
        {pending ? "..." : "Сохранить пароль"}
      </button>
    </div>
  );
}
