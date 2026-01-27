"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card, Badge, ToastContainer, showToast } from "@/components/UI";

interface Notice {
  _id: string;
  title: string;
  body: string;
  badge: "info" | "urgent";
  publishedAt: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
}

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const tNav = useTranslations("nav");
  const tAuth = useTranslations("auth");
  const locale = useLocale();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPasswordField, setNewPasswordField] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changing, setChanging] = useState(false);

  // Role translations
  const getRoleLabel = (role: string) => {
    if (locale === 'ko') {
      switch (role) {
        case 'user': return '사용자';
        case 'instructor': return '강사';
        case 'superadmin': return '슈퍼어드민';
        default: return role;
      }
    }
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  // Badge translations
  const getBadgeLabel = (badge: string) => {
    if (locale === 'ko') {
      switch (badge) {
        case 'info': return '정보';
        case 'urgent': return '긴급';
        default: return badge;
      }
    }
    return badge;
  };

  // UI translations
  const ui = {
    welcome: locale === 'ko' ? '환영합니다' : 'Welcome',
    quickLinks: locale === 'ko' ? '바로가기' : 'Quick Links',
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const [noticesRes, meRes] = await Promise.all([
          fetch("/api/notices"),
          fetch("/api/me"),
        ]);

        if (noticesRes.ok) {
          const data = await noticesRes.json();
          setNotices(data.notices || []);
        }

        if (meRes.ok) {
          const data = await meRes.json();
          setUser(data.user);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-gray-600">{t("loading")}</p>
      </div>
    );
  }

  return (
    <>
      <ToastContainer />
      <div className="grid gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t("title")}</h1>
        {user && (
          <span className="text-sm text-gray-600">
            {user.name} ({getRoleLabel(user.role)})
          </span>
        )}
      </div>

      {/* User Welcome Card */}
      {user && (
        <Card>
          <h2 className="text-lg font-semibold">
            {locale === 'ko' ? `${ui.welcome}, ${user.name}님!` : `${ui.welcome}, ${user.name}!`}
          </h2>
          <p className="mt-1 text-sm text-gray-600">{user.email}</p>
          <div className="mt-2">
            <Badge tone={user.role === "superadmin" ? "orange" : user.role === "instructor" ? "blue" : "green"}>
              {getRoleLabel(user.role)}
            </Badge>
          </div>
        </Card>
      )}

      {/* Notices Section */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">{t("notices")}</h2>
        {notices.length === 0 ? (
          <Card>
            <p className="text-gray-500">{t("noNotices")}</p>
          </Card>
        ) : (
          <div className="grid gap-3">
            {notices.map((notice) => (
              <Card key={notice._id}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{notice.title}</h3>
                      <Badge tone={notice.badge === "urgent" ? "orange" : "blue"}>
                        {getBadgeLabel(notice.badge)}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-gray-700">{notice.body}</p>
                    <p className="mt-2 text-xs text-gray-400">
                      {new Date(notice.publishedAt).toLocaleDateString(locale)}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Quick Links */}
      <Card>
        <h2 className="mb-3 font-semibold">{ui.quickLinks}</h2>
        <div className="flex flex-wrap gap-2">
          <a href="programs" className="rounded bg-blue-100 px-3 py-1 text-sm text-blue-800 hover:bg-blue-200">
            {tNav("programs")}
          </a>
          <a href="jobs" className="rounded bg-green-100 px-3 py-1 text-sm text-green-800 hover:bg-green-200">
            {tNav("jobs")}
          </a>
          <a href="learning" className="rounded bg-purple-100 px-3 py-1 text-sm text-purple-800 hover:bg-purple-200">
            {tNav("learning")}
          </a>
          <a href="my-activity" className="rounded bg-orange-100 px-3 py-1 text-sm text-orange-800 hover:bg-orange-200">
            {tNav("myActivity")}
          </a>
          <a href="support" className="rounded bg-gray-100 px-3 py-1 text-sm text-gray-800 hover:bg-gray-200">
            {tNav("support")}
          </a>
        </div>
      </Card>

      {/* Change Password */}
      {user && (
        <Card>
          <h2 className="mb-3 font-semibold">{tAuth('changePassword')}</h2>
          <form className="grid gap-3" onSubmit={async (e) => {
            e.preventDefault();
            if (!currentPassword || !newPasswordField) {
              showToast(tAuth('fillAllFields'), 'error');
              return;
            }
            if (newPasswordField !== confirmPassword) {
              showToast(tAuth('passwordsDoNotMatch'), 'error');
              return;
            }
            setChanging(true);
            try {
              const res = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ currentPassword, newPassword: newPasswordField }),
              });
              const data = await res.json();
              if (!res.ok) {
                showToast(data.message || tAuth('passwordChangeFailed'), 'error');
              } else {
                showToast(tAuth('passwordChanged'), 'success');
                setCurrentPassword(''); setNewPasswordField(''); setConfirmPassword('');
              }
            } catch (err) {
              showToast(tAuth('passwordChangeFailed'), 'error');
            } finally { setChanging(false); }
          }}>
            <input type="password" placeholder={tAuth('currentPassword')} className="rounded border px-3 py-2" value={currentPassword} onChange={(e)=>setCurrentPassword(e.target.value)} required />
            <input type="password" placeholder={tAuth('newPassword')} className="rounded border px-3 py-2" value={newPasswordField} onChange={(e)=>setNewPasswordField(e.target.value)} required />
            <input type="password" placeholder={tAuth('confirmPassword')} className="rounded border px-3 py-2" value={confirmPassword} onChange={(e)=>setConfirmPassword(e.target.value)} required />
            <div className="flex items-center gap-3">
              <button disabled={changing} className="rounded bg-blue-600 px-3 py-2 text-white hover:bg-blue-700 disabled:opacity-50">{changing ? '...' : tAuth('changePassword')}</button>
            </div>
          </form>
        </Card>
      )}
      </div>
    </>
  );
}
