"use client";

import Link from "next/link";
import { useState } from "react";

export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit() {
    setPending(true);
    try {
      await fetch("/api/auth/password/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-neutral-700">
          Если аккаунт с таким email существует, мы отправили на него ссылку для сброса пароля. Проверьте почту.
        </p>
        <Link href="/account/login" className="block text-center underline text-xs text-neutral-500">
          Вернуться к входу
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        autoComplete="email"
        className="w-full h-12 border px-3"
      />
      <button
        onClick={submit}
        disabled={pending || !email}
        className="w-full h-12 bg-brand text-white uppercase tracking-widest text-sm disabled:bg-neutral-400"
      >
        {pending ? "..." : "Отправить ссылку"}
      </button>
      <Link href="/account/login" className="block text-center underline text-xs text-neutral-500">
        Вернуться к входу
      </Link>
    </div>
  );
}
