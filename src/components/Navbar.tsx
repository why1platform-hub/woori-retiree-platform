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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  useEffect(() => {
    const handleSettingsUpdate = () => loadSettings();
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

  // Close mobile menu when clicking a link
  const handleLinkClick = () => setMobileMenuOpen(false);

  const navLinks = (
    <>
      <Link href={`/${locale}/programs`} onClick={handleLinkClick} className="block py-2 md:py-0 hover:text-blue-600">{t('nav.programs')}</Link>
      <Link href={`/${locale}/jobs`} onClick={handleLinkClick} className="block py-2 md:py-0 hover:text-blue-600">{t('nav.jobs')}</Link>
      <Link href={`/${locale}/learning`} onClick={handleLinkClick} className="block py-2 md:py-0 hover:text-blue-600">{t('nav.learning')}</Link>
      <Link href={`/${locale}/consultation`} onClick={handleLinkClick} className="block py-2 md:py-0 hover:text-blue-600">{t('nav.consultation')}</Link>
      <Link href={`/${locale}/my-activity`} onClick={handleLinkClick} className="block py-2 md:py-0 hover:text-blue-600">{t('nav.myActivity')}</Link>
      <Link href={`/${locale}/support`} onClick={handleLinkClick} className="block py-2 md:py-0 hover:text-blue-600">{t('nav.support')}</Link>
      {me?.role === "instructor" && <Link href={`/${locale}/instructor`} onClick={handleLinkClick} className="block py-2 md:py-0 hover:text-blue-600">{t('nav.instructor')}</Link>}
      {me?.role === "superadmin" && <Link href={`/${locale}/admin`} onClick={handleLinkClick} className="block py-2 md:py-0 hover:text-blue-600">{t('nav.admin')}</Link>}
    </>
  );

  return (
    <header className="border-b bg-white sticky top-0 z-40">
      <div className="mx-auto max-w-6xl px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href={me ? `/${locale}/dashboard` : `/${locale}`} className="flex items-center gap-2 flex-shrink-0">
            {settings?.platformLogo?.url && (
              <img src={settings.platformLogo.url} alt="Logo" className="h-8 w-auto" loading="lazy" />
            )}
            <span className="font-semibold text-sm md:text-base truncate max-w-[120px] md:max-w-none">
              {locale === 'ko' ? settings?.platformName?.ko : settings?.platformName?.en || t('site.title')}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-4 text-sm">
            {navLinks}
            <span className="text-gray-300">|</span>
            <LanguageSwitcher />
            <span className="text-gray-300">|</span>

            {/* Notifications */}
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
                          e.currentTarget.classList.add('opacity-70');
                          const res = await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: n._id }) });
                          if (res.ok) {
                            const d = await res.json();
                            setNotifications(notifications.map(x => x._id === n._id ? { ...x, read: d.read } : x));
                          }
                          try {
                            if (n.type === 'email_request') window.location.href = `/${locale}/admin/email-requests`;
                            else if (n.type === 'message') window.location.href = `/${locale}/my-activity`;
                            else window.location.href = `/${locale}`;
                          } catch (err) { }
                        }} className={`p-2 border-b flex items-start gap-3 cursor-pointer ${n.read ? 'bg-white' : 'bg-white border-l-4 border-blue-500'}`}>
                          {!n.read && <span className="w-2 h-2 mt-1 rounded-full bg-blue-500" />}
                          <div className="flex-1">
                            <div className="text-sm">{n.text}</div>
                            <div className="text-xs text-gray-500">{new Date(n.createdAt).toLocaleString()}</div>
                          </div>
                          {n.type === 'email_request' && me?.role === 'superadmin' && (
                            <button className="text-xs text-green-600" onClick={async (e) => {
                              e.stopPropagation();
                              const requestId = n.payload?.requestId;
                              if (!requestId) return;
                              const res = await fetch('/api/admin/email-requests', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: requestId, action: 'approve' }) });
                              if (res.ok) {
                                await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: n._id }) });
                                const r = await fetch('/api/notifications');
                                if (r.ok) { const d = await r.json(); setNotifications(d.notifications || []); }
                              }
                            }}>{t('notifications.approve')}</button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Auth buttons */}
            {!me ? (
              <>
                <Link href={`/${locale}/login`}>{t('nav.login')}</Link>
                <Link href={`/${locale}/register`}>{t('nav.register')}</Link>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link href={`/${locale}/profile`} className="rounded border px-3 py-1 hover:bg-gray-50">{t('nav.profile')}</Link>
                <button className="rounded border px-3 py-1 hover:bg-gray-50" onClick={async () => {
                  await logoutClient();
                  setMe(null);
                  window.location.href = `/${locale}/login`;
                }}>{t('nav.logout')}</button>
              </div>
            )}
          </nav>

          {/* Mobile: Right side icons */}
          <div className="flex md:hidden items-center gap-2">
            <LanguageSwitcher />

            {/* Mobile Notifications */}
            {me && (
              <button className="p-2" onClick={() => setShowNot(!showNot)} aria-label="notifications">
                🔔 {notifications.filter(n => !n.read).length > 0 && <span className="ml-1 rounded bg-red-500 text-white px-1 text-xs">{notifications.filter(n => !n.read).length}</span>}
              </button>
            )}

            {/* Hamburger Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded hover:bg-gray-100"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Notifications Dropdown */}
        {showNot && (
          <div className="md:hidden mt-2 bg-white border rounded shadow p-2 z-50">
            <h4 className="font-medium mb-2">{t('notifications.title')}</h4>
            <div className="max-h-48 overflow-auto">
              {notifications.length === 0 ? <p className="text-sm text-gray-500">{t('notifications.noNotifications')}</p> : notifications.slice(0, 5).map(n => (
                <div key={n._id} className={`p-2 border-b text-sm ${n.read ? '' : 'border-l-4 border-blue-500'}`}>
                  {n.text}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <nav className="md:hidden mt-3 pt-3 border-t">
            <div className="grid gap-1 text-sm">
              {navLinks}

              <div className="border-t my-2 pt-2">
                {!me ? (
                  <div className="grid gap-1">
                    <Link href={`/${locale}/login`} onClick={handleLinkClick} className="block py-2 text-blue-600 font-medium">{t('nav.login')}</Link>
                    <Link href={`/${locale}/register`} onClick={handleLinkClick} className="block py-2 text-blue-600 font-medium">{t('nav.register')}</Link>
                  </div>
                ) : (
                  <div className="grid gap-1">
                    <Link href={`/${locale}/profile`} onClick={handleLinkClick} className="block py-2">{t('nav.profile')}</Link>
                    <button className="text-left py-2 text-red-600" onClick={async () => {
                      await logoutClient();
                      setMe(null);
                      setMobileMenuOpen(false);
                      window.location.href = `/${locale}/login`;
                    }}>{t('nav.logout')} ({me.role})</button>
                  </div>
                )}
              </div>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
