"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useTranslations } from "next-intl";

export default function LoginPage() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.message || "Login failed");
    } else {
      // Auto-refresh after successful login
      setTimeout(() => {
        window.location.href = `/${locale}/dashboard`;
      }, 100);
    }
  }

  return (
    <div className="mx-auto max-w-sm rounded border p-6">
      <h1 className="text-xl font-bold">{t('login')}</h1>
      {msg && <p className="mt-2 text-sm text-red-600">{msg}</p>}

      <form onSubmit={handleLogin} className="mt-4 grid gap-3">
        <input
          type="email"
          placeholder={t('email')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded border px-3 py-2"
        />
        <input
          type="password"
          placeholder={t('password')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded border px-3 py-2"
        />
        <button className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
          {t('submit')}
        </button>
      </form>

      <p className="mt-4 text-sm">
        {t('noAccount')} <Link href={`/${locale}/register`} className="text-blue-600 hover:underline">{t('register')}</Link>
        {' | '}
        <Link href={`/${locale}/forgot-password`} className="text-blue-600 hover:underline">{t('forgotPassword')}</Link>
      </p>
    </div>
  );
}
