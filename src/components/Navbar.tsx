"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getMeClient, logoutClient } from "@/lib/clientAuth";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";

interface PlatformSettings {
  platformName: { en: string; ko: string };
  platformLogo: { url: string; fileName: string };
}

export function Navbar() {
  const t = useTranslations();
  const locale = useLocale();
  const [me, setMe] = useState<{email:string; role:string; name:string} | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNot, setShowNot] = useState(false);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);

  useEffect(() => {
    getMeClient().then(setMe).catch(() => setMe(null));
  }, []);

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  // Listen for platform settings updates from admin page
  useEffect(() => {
    const handleSettingsUpdate = () => {
      loadSettings();
    };
    window.addEventListener('platformSettingsUpdated', handleSettingsUpdate);
    return () => window.removeEventListener('platformSettingsUpdated', handleSettingsUpdate);
  }, []);

  useEffect(() => {
    async function loadNot() {
      if (!me) return;
      const res = await fetch('/api/notifications');
      if (res.ok) { const d = await res.json(); setNotifications(d.notifications || []); }
    }
    loadNot();
  }, [me]);

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href={`/${locale}`} className="flex items-center gap-3">
          {settings?.platformLogo?.url && (
            <img 
              src={settings.platformLogo.url} 
              alt="Platform Logo" 
              className="h-10 w-auto"
            />
          )}
          <span className="font-semibold">
            {locale === 'ko' ? settings?.platformName.ko : settings?.platformName.en || t('site.title')}
          </span>
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          <Link href={`/${locale}/programs`}>{t('nav.programs')}</Link>
          <Link href={`/${locale}/jobs`}>{t('nav.jobs')}</Link>
          <Link href={`/${locale}/learning`}>{t('nav.learning')}</Link>
          <Link href={`/${locale}/consultation`}>{t('nav.consultation')}</Link>
          <Link href={`/${locale}/my-activity`}>{t('nav.myActivity')}</Link>
          <Link href={`/${locale}/support`}>{t('nav.support')}</Link>

          {me?.role === "instructor" && <Link href={`/${locale}/instructor`}>{t('nav.instructor')}</Link>}
          {me?.role === "superadmin" && <Link href={`/${locale}/admin`}>{t('nav.admin')}</Link>}

          <span className="text-gray-400">|</span>

          <LanguageSwitcher />

          <span className="text-gray-400">|</span>

          {me && (
            <div className="relative">
              <button className="px-2" onClick={() => setShowNot(!showNot)} aria-label="notifications">
                🔔 {notifications.filter(n => !n.read).length > 0 && <span className="ml-1 rounded bg-red-500 text-white px-1 text-xs">{notifications.filter(n => !n.read).length}</span>}
              </button>
              {showNot && (
                <div className="absolute right-0 mt-2 w-80 bg-white border rounded shadow p-2 z-50">
                  <h4 className="font-medium mb-2">{t('notifications.title')}</h4>
                  <div className="max-h-64 overflow-auto">
                    {notifications.length === 0 ? <p className="text-sm text-gray-500">{t('notifications.noNotifications')}</p> : notifications.map(n => (
                      <div key={n._id} onClick={async (e) => {
                        // toggle read/unread
                        e.currentTarget.classList.add('opacity-70');
                        const res = await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: n._id }) });
                        if (res.ok) {
                          const d = await res.json();
                          setNotifications(notifications.map(x => x._id === n._id ? { ...x, read: d.read } : x));
                        }
                        // navigate based on type
                        try {
                          if (n.type === 'email_request') {
                            window.location.href = `/${locale}/admin/email-requests`;
                          } else if (n.type === 'message') {
                            window.location.href = `/${locale}/my-activity`;
                          } else {
                            // default to homepage
                            window.location.href = `/${locale}`;
                          }
                        } catch (err) { }
                      }} className={`p-2 border-b flex items-start gap-3 cursor-pointer ${n.read ? 'bg-white' : 'bg-white border-l-4 border-blue-500'}`}>
                        {!n.read && <span className="w-2 h-2 mt-1 rounded-full bg-blue-500" />}
                        <div className="flex-1">
                          <div className="text-sm">{n.text}</div>
                          <div className="text-xs text-gray-500">{new Date(n.createdAt).toLocaleString()}</div>
                        </div>
                        {/* If this is an email_request and current user is admin, show Approve */}
                        {n.type === 'email_request' && me?.role === 'superadmin' && (
                          <div>
                            <button className="text-xs text-green-600" onClick={async (e) => {
                              e.stopPropagation();
                              // call admin approve
                              const requestId = n.payload?.requestId;
                              if (!requestId) return;
                              const res = await fetch('/api/admin/email-requests', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: requestId, action: 'approve' }) });
                              if (res.ok) {
                                // mark notification read and refresh list
                                await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: n._id }) });
                                const r = await fetch('/api/notifications');
                                if (r.ok) { const d = await r.json(); setNotifications(d.notifications || []); }
                              }
                            }}>{t('notifications.approve')}</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!me ? (
            <>
              <Link href={`/${locale}/login`}>{t('nav.login')}</Link>
              <Link href={`/${locale}/register`}>{t('nav.register')}</Link>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link href={`/${locale}/profile`} className="rounded border px-3 py-1 hover:bg-gray-50">
                {t('nav.profile')}
              </Link>
              <button
                className="rounded border px-3 py-1 hover:bg-gray-50"
                onClick={async () => {
                  await logoutClient();
                  setMe(null);
                  window.location.href = `/${locale}/login`;
                }}
              >
                {t('nav.logout')} ({me.role})
              </button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
