"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "login" | "register";
type RegisterStep = "name" | "credentials" | "code";

const STEP_INDEX: Record<RegisterStep, number> = { name: 1, credentials: 2, code: 3 };
const STEP_LABEL: Record<RegisterStep, string> = {
  name: "Имя",
  credentials: "Данные для входа",
  code: "Код из письма",
};

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [registerStep, setRegisterStep] = useState<RegisterStep>("name");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setRegisterStep("name");
    setCode("");
  }

  async function loginSubmit() {
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        if (json.error === "invalid_credentials") setError("Неверный email или пароль");
        else setError("Ошибка");
        return;
      }
      router.push("/account");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function requestCode() {
    setError(null);
    setPending(true);
    try {
      const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name: fullName }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        if (json.error === "email_taken") setError("Аккаунт с таким email уже существует");
        else if (json.error === "cooldown") {
          setCooldown(json.retryAfterSec ?? 60);
          setError(`Код уже отправлен — подождите ${json.retryAfterSec ?? 60} сек`);
          setRegisterStep("code");
        } else if (json.error === "send_failed") setError("Не удалось отправить письмо. Попробуйте позже");
        else if (json.error === "bad_request") setError("Проверьте поля: email и пароль (мин. 8 символов)");
        else setError("Ошибка");
        return;
      }
      setRegisterStep("code");
      setCooldown(json.cooldownSec ?? 60);
    } finally {
      setPending(false);
    }
  }

  async function verifyCode() {
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        if (json.error === "invalid") setError("Неверный код");
        else if (json.error === "no_code") setError("Код истёк или не найден — запросите новый");
        else if (json.error === "too_many_attempts") setError("Слишком много попыток. Запросите новый код");
        else if (json.error === "email_taken") setError("Аккаунт с таким email уже существует");
        else setError("Ошибка");
        return;
      }
      router.push("/account");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex border">
        <button
          type="button"
          onClick={() => switchMode("login")}
          className={`flex-1 h-10 text-xs uppercase tracking-widest ${mode === "login" ? "bg-brand text-white" : "text-neutral-600"}`}
        >
          Вход
        </button>
        <button
          type="button"
          onClick={() => switchMode("register")}
          className={`flex-1 h-10 text-xs uppercase tracking-widest ${mode === "register" ? "bg-brand text-white" : "text-neutral-600"}`}
        >
          Регистрация
        </button>
      </div>

      {mode === "register" && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] uppercase tracking-widest text-neutral-500">
            <span>Шаг {STEP_INDEX[registerStep]} из 3</span>
            <span>{STEP_LABEL[registerStep]}</span>
          </div>
          <div className="h-1 bg-neutral-200 overflow-hidden">
            <div
              className="h-full bg-brand transition-all duration-300"
              style={{ width: `${(STEP_INDEX[registerStep] / 3) * 100}%` }}
            />
          </div>
        </div>
      )}

      {mode === "login" && (
        <>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            autoComplete="email"
            className="w-full h-12 border px-3"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Пароль"
            autoComplete="current-password"
            className="w-full h-12 border px-3"
          />
          {error && <div className="text-sm text-red-600">{error}</div>}
          <button
            onClick={loginSubmit}
            disabled={pending || !email || !password}
            className="w-full h-12 bg-brand text-white uppercase tracking-widest text-sm disabled:bg-neutral-400"
          >
            {pending ? "..." : "Войти"}
          </button>
          <div className="text-center">
            <Link href="/account/password/forgot" className="text-xs text-neutral-500 underline">
              Забыли пароль?
            </Link>
          </div>
        </>
      )}

      {mode === "register" && registerStep === "name" && (
        <>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Имя"
            autoComplete="given-name"
            className="w-full h-12 border px-3"
          />
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Фамилия (необязательно)"
            autoComplete="family-name"
            className="w-full h-12 border px-3"
          />
          <button
            onClick={() => setRegisterStep("credentials")}
            disabled={!firstName.trim()}
            className="w-full h-12 bg-brand text-white uppercase tracking-widest text-sm disabled:bg-neutral-400"
          >
            Далее
          </button>
        </>
      )}

      {mode === "register" && registerStep === "credentials" && (
        <>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            autoComplete="email"
            className="w-full h-12 border px-3"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Пароль (мин. 8 символов)"
            autoComplete="new-password"
            className="w-full h-12 border px-3"
          />
          {error && <div className="text-sm text-red-600">{error}</div>}
          <button
            onClick={requestCode}
            disabled={pending || !email || password.length < 8}
            className="w-full h-12 bg-brand text-white uppercase tracking-widest text-sm disabled:bg-neutral-400"
          >
            {pending ? "Отправляем код..." : "Отправить код"}
          </button>
          <button
            type="button"
            onClick={() => { setRegisterStep("name"); setError(null); }}
            className="w-full text-xs text-neutral-500 underline"
          >
            Назад
          </button>
        </>
      )}

      {mode === "register" && registerStep === "code" && (
        <>
          <div className="text-xs text-neutral-500">
            Код отправлен на <span className="font-medium text-neutral-800">{email}</span>
          </div>
          <input
            type="text"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="Код из письма"
            className="w-full h-12 border px-3 tracking-widest text-center"
            autoFocus
          />
          {error && <div className="text-sm text-red-600">{error}</div>}
          <button
            onClick={verifyCode}
            disabled={pending || code.length !== 6}
            className="w-full h-12 bg-brand text-white uppercase tracking-widest text-sm disabled:bg-neutral-400"
          >
            {pending ? "Проверяем..." : "Подтвердить"}
          </button>
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <button
              type="button"
              onClick={() => { setRegisterStep("credentials"); setError(null); setCode(""); }}
              className="underline"
            >
              Изменить email
            </button>
            <button
              type="button"
              onClick={requestCode}
              disabled={pending || cooldown > 0}
              className="underline disabled:no-underline disabled:text-neutral-400"
            >
              {cooldown > 0 ? `Отправить снова (${cooldown})` : "Отправить снова"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
