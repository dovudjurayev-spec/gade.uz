"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Step = "phone" | "code";

export function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("+998 ");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [devCode, setDevCode] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function requestCode() {
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        if (json.error === "cooldown") {
          setCooldown(json.retryAfterSec ?? 60);
          setError(`Подождите ${json.retryAfterSec ?? 60} сек и попробуйте снова`);
          setStep("code");
        } else if (json.error === "invalid_phone") setError("Введите номер в формате +998 XX XXX XX XX");
        else if (json.error === "send_failed") setError("Не удалось отправить SMS. Попробуйте позже");
        else setError("Ошибка");
      } else {
        setStep("code");
        setCooldown(json.cooldownSec ?? 60);
        if (json.devCode) setDevCode(json.devCode);
      }
    } finally {
      setPending(false);
    }
  }

  async function verifyCode() {
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        if (json.error === "invalid") setError("Неверный код");
        else if (json.error === "expired" || json.error === "no_code") setError("Код истёк, запросите новый");
        else if (json.error === "too_many_attempts") setError("Слишком много попыток. Запросите новый код");
        else setError("Ошибка");
      } else {
        router.push("/account");
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <input
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="+998 __ ___ __ __"
        disabled={step === "code"}
        className="w-full h-12 border px-3"
      />
      {step === "code" && devCode && (
        <div className="text-xs bg-yellow-50 border border-yellow-300 p-2 rounded">
          DEV-режим: код <span className="font-mono font-bold">{devCode}</span> (SMS не отправляется без Eskiz-креденшлов)
        </div>
      )}
      {step === "code" && (
        <input
          type="text"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          placeholder="Код из SMS"
          className="w-full h-12 border px-3 tracking-widest text-center"
          autoFocus
        />
      )}
      {error && <div className="text-sm text-red-600">{error}</div>}
      {step === "phone" ? (
        <button onClick={requestCode} disabled={pending} className="w-full h-12 bg-brand text-white uppercase tracking-widest text-sm disabled:bg-neutral-400">
          {pending ? "Отправляем..." : "Получить код"}
        </button>
      ) : (
        <div className="space-y-2">
          <button onClick={verifyCode} disabled={pending || code.length !== 6} className="w-full h-12 bg-brand text-white uppercase tracking-widest text-sm disabled:bg-neutral-400">
            {pending ? "Проверяем..." : "Войти"}
          </button>
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <button onClick={() => { setStep("phone"); setCode(""); setError(null); }} className="underline">Изменить номер</button>
            <button onClick={requestCode} disabled={pending || cooldown > 0} className="underline disabled:no-underline disabled:text-neutral-400">
              {cooldown > 0 ? `Отправить ещё раз (${cooldown})` : "Отправить ещё раз"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
