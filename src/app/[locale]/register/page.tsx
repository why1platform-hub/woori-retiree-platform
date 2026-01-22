"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useTranslations } from "next-intl";

export default function RegisterPage() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"user" | "instructor">("user");
  const [msg, setMsg] = useState<string | null>(null);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (password !== confirmPassword) {
      setMsg("Passwords do not match");
      return;
    }

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, email, password, role }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.message || "Registration failed");
    } else {
      router.push(`/${locale}/login`);
    }
  }

  return (
    <div className="mx-auto max-w-sm rounded border p-6">
      <h1 className="text-xl font-bold">{t('register')}</h1>
      {msg && <p className="mt-2 text-sm text-red-600">{msg}</p>}

      <form onSubmit={handleRegister} className="mt-4 grid gap-3">
        <input
          type="text"
          placeholder={t('name')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded border px-3 py-2"
          required
        />
        <div>
          <label className="block text-sm text-gray-600 mb-1">{t('userType')}</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "user" | "instructor")}
            className="w-full rounded border px-3 py-2"
          >
            <option value="user">{t('userTypeUser')}</option>
            <option value="instructor">{t('userTypeInstructor')}</option>
          </select>
        </div>
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
        <input
          type="password"
          placeholder={t('confirmPassword')}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="rounded border px-3 py-2"
        />
        <button className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
          {t('submit')}
        </button>
      </form>

      <p className="mt-4 text-sm">
        {t('alreadyHaveAccount')} <Link href={`/${locale}/login`} className="text-blue-600 hover:underline">{t('login')}</Link>
      </p>
    </div>
  );
}
