"use client";

import { useState } from "react";

export default function ReplyForm({ inquiryId, onReplied } : { inquiryId: string; onReplied: (inquiry:any) => void }) {
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true); setMsg(null);
    try {
      const res = await fetch('/api/support/inquiries', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ inquiryId, reply: reply.trim() })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) setMsg((data && data.message) || `Failed (${res.status})`);
      else { onReplied(data.inquiry); setReply(''); setMsg('Replied'); }
    } catch (err) { setMsg('Failed'); }
    finally { setSending(false); }
  }

  return (
    <form onSubmit={handleSend} className="mt-3 grid gap-2">
      <textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Type your response..." className="w-full rounded border px-3 py-2" rows={3} />
      <div className="flex gap-2">
        <button className="rounded bg-blue-600 px-3 py-1 text-white" disabled={sending}>{sending ? 'Sending...' : 'Send Response'}</button>
        {msg && <p className="text-sm text-gray-700">{msg}</p>}
      </div>
    </form>
  );
}
