"use client";

import { useEffect, useState } from "react";
import { Input, Textarea, Button } from "@/components/UI";
import { useTranslations } from "next-intl";

export default function ProfilePage() {
  const t = useTranslations();
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<any>({ name: '', phone: '', bio: '', email: '', organization: '' });
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetch('/api/me');
      if (res.ok) {
        const d = await res.json();
        const u = d.user || d;
        setForm({ name: u.name || '', phone: u.phone || '', bio: u.bio || '', email: u.email || '', organization: u.organization || '' });
      }
      setLoading(false);
    }
    load();
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    const res = await fetch('/api/me', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form.name, phone: form.phone, bio: form.bio, organization: form.organization }) });
    if (res.ok) setMsg(t('profile.saved'));
    else { const d = await res.json().catch(() => null); setMsg(d?.message || t('common.failed')); }
  }

  const requestEmailChange = async () => {
    if (!form.email) return setMsg(t('profile.enterEmail'));
    const res = await fetch('/api/me/email-request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ newEmail: form.email }) });
    if (res.ok) setMsg(t('profile.emailRequested'));
    else { const d = await res.json().catch(() => null); setMsg(d?.message || t('common.failed')); }
  }

  if (loading) return <div>{t('common.loading')}</div>;

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-bold">{t('profile.title')}</h1>
      <form onSubmit={save} className="grid gap-3 max-w-md">
        <Input placeholder={t('profile.name')} value={form.name} onChange={(e:any) => setForm({...form, name: e.target.value})} />
        <Input placeholder={t('profile.phone')} value={form.phone} onChange={(e:any) => setForm({...form, phone: e.target.value})} />
        <Input placeholder={t('profile.organization')} value={form.organization} onChange={(e:any) => setForm({...form, organization: e.target.value})} />
        <Textarea placeholder={t('profile.bio')} value={form.bio} onChange={(e:any) => setForm({...form, bio: e.target.value})} rows={4} />
        <Input placeholder={t('profile.newEmailPlaceholder')} value={form.email} onChange={(e:any) => setForm({...form, email: e.target.value})} />
        <div className="flex gap-2">
          <Button type="submit">{t('profile.saveProfile')}</Button>
          <Button type="button" onClick={requestEmailChange}>{t('profile.requestEmailChange')}</Button>
        </div>
        <p className="text-sm text-gray-600">{t('profile.changePassword')}</p>
        <div className="grid gap-2">
          <Input type="password" placeholder={t('auth.currentPassword')} value={(form as any)._current || ''} onChange={(e:any) => setForm({...form, _current: e.target.value})} />
          <Input type="password" placeholder={t('auth.newPassword')} value={(form as any)._new || ''} onChange={(e:any) => setForm({...form, _new: e.target.value})} />
          <Button onClick={async () => {
            const res = await fetch('/api/auth/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword: (form as any)._current, newPassword: (form as any)._new }) });
            if (res.ok) setMsg(t('auth.passwordChanged')); else { const d = await res.json().catch(() => null); setMsg(d?.message || t('common.failed')); }
          }}>{t('profile.changePasswordButton')}</Button>
        </div>
        {msg && <p className="text-sm text-gray-700">{msg}</p>}
      </form>
    </div>
  );
}
