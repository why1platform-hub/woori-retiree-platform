"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card, Badge, Button } from "@/components/UI";

interface EmailRequest {
  _id: string;
  userId: { _id: string; name: string; email: string };
  newEmail: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

export default function EmailRequestsPage() {
  const t = useTranslations("admin.emailRequests");
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<EmailRequest[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/email-requests');
      if (res.ok) {
        const d = await res.json();
        setRequests(d.requests || []);
      }
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  }

  async function handleAction(id: string, action: 'approve' | 'reject') {
    if (action === 'reject' && !confirm(t('confirmReject'))) return;
    setProcessing(id);
    try {
      const res = await fetch('/api/admin/email-requests', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action })
      });
      if (res.ok) {
        const d = await res.json();
        const updated = d.request;
        setRequests(reqs => reqs.map(r => r._id === id ? updated : r));
        alert(action === 'approve' ? t('approvedMsg') : t('rejectedMsg'));
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.message || `Failed (${res.status})`);
      }
    } catch (err) {
      console.error(err);
      alert('Failed');
    } finally { setProcessing(null); }
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <Link href={`/${'en'}`} className="text-sm text-blue-600 hover:underline">{t('backToAdmin')}</Link>
      </div>

      <Card>
        {loading ? (
          <p className="text-sm text-gray-500">{t('loading')}</p>
        ) : requests.length === 0 ? (
          <p className="text-sm text-gray-500">{t('noRequests')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2">{t('requester')}</th>
                  <th className="pb-2">{t('newEmail')}</th>
                  <th className="pb-2">{t('createdAt')}</th>
                  <th className="pb-2">{t('status')}</th>
                  <th className="pb-2">{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(r => (
                  <tr key={r._id} className="border-b">
                    <td className="py-2">{r.userId?.name} <div className="text-xs text-gray-500">{r.userId?.email}</div></td>
                    <td className="py-2">{r.newEmail}</td>
                    <td className="py-2">{new Date(r.createdAt).toLocaleString()}</td>
                    <td className="py-2"><Badge tone={r.status === 'approved' ? 'green' : r.status === 'pending' ? 'orange' : 'gray'}>{r.status}</Badge></td>
                    <td className="py-2 space-x-2">
                      <Button disabled={r.status !== 'pending' || processing === r._id} onClick={() => handleAction(r._id, 'approve')}>{t('approve')}</Button>
                      <button disabled={r.status !== 'pending' || processing === r._id} onClick={() => handleAction(r._id, 'reject')} className="text-red-600 hover:underline text-sm">{t('reject')}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}