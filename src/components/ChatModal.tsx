"use client";

import { useEffect, useState } from "react";
import { Input, Button } from "@/components/UI";

export default function ChatModal({ peerId, onClose }: { peerId: string; onClose: () => void }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/messages?userId=${peerId}`);
      if (res.ok) { const d = await res.json(); setMessages(d.messages || []); }
    }
    load();
  }, [peerId]);

  async function send() {
    if (!text.trim()) return;
    const res = await fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recipientId: peerId, content: text.trim() }) });
    if (res.ok) {
      const d = await res.json(); setMessages([...messages, d.message]); setText('');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>
      <div className="relative bg-white w-full max-w-lg p-4 rounded shadow">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium">Chat</h3>
          <button onClick={onClose} className="text-sm">Close</button>
        </div>
        <div className="max-h-80 overflow-auto border p-2 mb-2">
          {messages.map(m => (
            <div key={m._id} className="mb-2">
              <div className="text-xs text-gray-500">{m.senderId === peerId ? 'Them' : 'You'} · {new Date(m.createdAt).toLocaleString()}</div>
              <div className="mt-1">{m.content}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input value={text} onChange={(e:any)=>setText(e.target.value)} placeholder="Message..." />
          <Button onClick={send}>Send</Button>
        </div>
      </div>
    </div>
  );
}
