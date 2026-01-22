"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

export default function ForgotPasswordPage() {
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setMsg({ type: "error", text: data.message || tCommon('failed') });
    } else {
      setMsg({ type: "success", text: data.message });
      setEmail("");
    }
  }

  return (
    <div className="mx-auto max-w-sm rounded border p-6">
      <h1 className="text-xl font-bold">{t('forgotPassword')}</h1>
      <p className="mt-2 text-sm text-gray-600">{t('forgotPasswordDescription')}</p>

      {msg && (
        <p className={`mt-3 text-sm ${msg.type === "error" ? "text-red-600" : "text-green-600"}`}>
          {msg.text}
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-4 grid gap-3">
        <input
          type="email"
          placeholder={t('email')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="rounded border px-3 py-2"
        />
        <button
          disabled={loading}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? tCommon('loading') : t('submit')}
        </button>
      </form>

      <p className="mt-4 text-sm">
        <Link href={`/${locale}/login`} className="text-blue-600 hover:underline">{t('backToLogin')}</Link>
      </p>
    </div>
  );
}
