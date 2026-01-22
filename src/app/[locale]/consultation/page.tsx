"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card, Button, Input } from "@/components/UI";
import TimeSelect from "@/components/TimeSelect";
import dynamic from 'next/dynamic';
const ChatModal = dynamic(() => import('@/components/ChatModal'), { ssr: false });

const DAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

export default function ConsultationPage() {
  const t = useTranslations("consultations");
  const locale = useLocale();
  const [instructors, setInstructors] = useState<any[]>([]);
  const [selectedInstructor, setSelectedInstructor] = useState<string | null>(null);
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [chatPeer, setChatPeer] = useState<string | null>(null);
  const [userBookings, setUserBookings] = useState<any[]>([]);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [instructorRequests, setInstructorRequests] = useState<any[]>([]);

  // For instructors: create slots with days and weeks
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [topic, setTopic] = useState("General");
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [weeks, setWeeks] = useState(1);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    async function init() {
      setLoading(true);
      const [insRes, meRes, myBookingsRes] = await Promise.all([fetch('/api/instructors'), fetch('/api/me'), fetch('/api/consultation/bookings')]);
      if (insRes.ok) { const d = await insRes.json(); setInstructors(d.instructors || []); if ((d.instructors || []).length) setSelectedInstructor(d.instructors[0]._id); }
      if (meRes.ok) { const d = await meRes.json(); setUser(d.user); }
      if (myBookingsRes.ok) { const d = await myBookingsRes.json(); setUserBookings(d.bookings || []); }

      // If current user is an instructor, fetch instructor requests
      if (meRes.ok) {
        const me = await meRes.json();
        if (me.user && me.user.role === 'instructor') {
          const r = await fetch('/api/consultation/bookings?instructor=true');
          if (r.ok) { const dd = await r.json(); setInstructorRequests(dd.bookings || []); }
        }
      }
      setLoading(false);
    }
    init();
  }, []);

  useEffect(() => {
    if (!selectedInstructor || !date) return;
    async function loadSlots() {
      setLoading(true);
      const res = await fetch(`/api/consultation/slots?instructorId=${selectedInstructor}`);
        if (res.ok) {
        const d = await res.json();
        // filter slots for the selected date using local date (avoid timezone mismatch)
        const filtered = (d.slots || []).filter((s: any) => {
          const dt = new Date(s.startsAt);
          const slotDate = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
          return slotDate === date;
        });
        setSlots(filtered);
      }
      setLoading(false);
    }
    loadSlots();
  }, [selectedInstructor, date]);

  async function handleBook(slotId: string) {
    setMsg(null);
    // optimistic UI: mark as pending
    setPending(p => ({ ...p, [slotId]: true }));
    try {
      const res = await fetch('/api/consultation/bookings', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ slotId }) });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setPending(p => { const np = { ...p }; delete np[slotId]; return np; });
        setMsg(data?.message || `Booking failed (${res.status})`);
      } else {
        setMsg('Booking requested');
        // add booking to user's bookings
        if (data?.booking) setUserBookings(prev => [data.booking, ...prev]);
        // refresh slots for the instructor
        const r = await fetch(`/api/consultation/slots?instructorId=${selectedInstructor}`);
        if (r.ok) {
          const dd = await r.json();
          const filtered = (dd.slots || []).filter((s: any) => {
            const dt = new Date(s.startsAt);
            const slotDate = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
            return slotDate === date;
          });
          setSlots(filtered);
        }
      }
    } catch (err) {
      setPending(p => { const np = { ...p }; delete np[slotId]; return np; });
      setMsg('Booking failed');
    }
  }

  // Instructor: create 30-min slots using the new API format
  async function handleCreateSlots() {
    if (!user || user.role !== 'instructor') return;
    setCreating(true);
    setMsg(null);
    try {
      const res = await fetch('/api/consultation/slots', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          date,
          startTime,
          endTime,
          topic,
          days: selectedDays.length > 0 ? selectedDays : undefined,
          weeks,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.message || 'Failed to create slots');
      } else {
        setMsg(`Created ${data.count} slots`);
        // refresh slots
        const r = await fetch(`/api/consultation/slots?mine=true`);
        if (r.ok) {
          const dd = await r.json();
          const filtered = (dd.slots || []).filter((s: any) => {
            const dt = new Date(s.startsAt);
            const slotDate = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
            return slotDate === date;
          });
          setSlots(filtered);
        }
      }
    } catch (err) { setMsg('Failed to create slots'); }
    finally { setCreating(false); }
  }

  // Instructor actions: approve / reject booking
  async function handleInstructorAction(bookingId: string, action: 'approve' | 'reject') {
    setMsg(null);
    try {
      const res = await fetch('/api/consultation/bookings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookingId, action }) });
      if (!res.ok) { const d = await res.json().catch(() => null); setMsg(d?.message || `Failed (${res.status})`); return; }
      const updated = await res.json();
      // refresh instructor requests and slots and userBookings
      const r = await fetch('/api/consultation/bookings?instructor=true');
      if (r.ok) { const dd = await r.json(); setInstructorRequests(dd.bookings || []); }
      const s = await fetch(`/api/consultation/slots?instructorId=${selectedInstructor}`);
      if (s.ok) { const sd = await s.json(); const filtered = (sd.slots || []).filter((slot: any) => {
        const dt = new Date(slot.startsAt);
        const slotDate = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
        return slotDate === date;
      }); setSlots(filtered); }
      // refresh user's bookings (so user sees approval)
      const myb = await fetch('/api/consultation/bookings');
      if (myb.ok) { const md = await myb.json(); setUserBookings(md.bookings || []); }
      setMsg(`Booking ${action}ed`);
    } catch (err) { setMsg('Failed to update booking'); }
  }
  function toggleDay(day: number) {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  }

  // refresh instructor requests when instructor user is viewing
  useEffect(() => {
    async function loadRequests() {
      if (!user || user.role !== 'instructor') return;
      const res = await fetch('/api/consultation/bookings?instructor=true');
      if (res.ok) { const d = await res.json(); setInstructorRequests(d.bookings || []); }
    }
    loadRequests();
  }, [user, selectedInstructor, date]);

  if (loading) return <div className="text-gray-600">Loading...</div>;

  return (
    <div className="grid gap-6">
      {chatPeer && <ChatModal peerId={chatPeer} onClose={() => setChatPeer(null)} />}
      <h1 className="text-2xl font-bold">{t('title')}</h1>

      <Card>
        <div className="grid gap-3">
          <label>Instructor</label>
          <select value={selectedInstructor || ''} onChange={(e) => setSelectedInstructor(e.target.value)} className="rounded border px-3 py-2">
            {instructors.map((ins) => <option key={ins._id} value={ins._id}>{ins.name}</option>)}
          </select>

          <label>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded border px-3 py-2" />

          <div>
            <h3 className="font-medium mb-2">{t('availableTimes')}</h3>
            <div className="text-xs text-gray-500 mb-2">{t('startDate')}: {date}</div>
            {slots.length === 0 ? <p className="text-gray-500">{t('noAvailableSlots')}</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left p-2">Time</th>
                      <th className="text-left p-2">Topic</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slots.map((s) => {
                      const userBooking = userBookings.find(b => String(b.slotId?._id || b.slotId) === String(s._id));
                      const isUserPending = !!pending[s._id] || (!!userBooking && userBooking.status === 'pending');
                      const isUserApproved = !!userBooking && userBooking.status === 'approved';
                      const statusLabel = s.isBooked ? 'Booked' : isUserApproved ? 'Approved' : isUserPending ? 'Requested' : 'Available';

                      return (
                        <tr key={s._id} className="border-t">
                          <td className="p-2">{new Date(s.startsAt).toLocaleTimeString(locale, {hour: '2-digit', minute:'2-digit', hour12: false})} - {new Date(s.endsAt).toLocaleTimeString(locale, {hour: '2-digit', minute:'2-digit', hour12: false})}</td>
                          <td className="p-2">{s.topic}</td>
                          <td className="p-2">
                            <span className={`font-medium ${s.isBooked ? 'text-gray-600' : isUserApproved ? 'text-green-700' : isUserPending ? 'text-orange-700' : 'text-gray-700'}`}>{statusLabel}</span>
                          </td>
                          <td className="p-2">
                            {s.isBooked ? (
                              <button className="rounded bg-gray-400 px-3 py-1 text-white" disabled>Booked</button>
                            ) : isUserPending ? (
                              <button className="rounded bg-gray-400 px-3 py-1 text-white" disabled>Requested</button>
                            ) : isUserApproved ? (
                              <button className="rounded bg-green-600 px-3 py-1 text-white" disabled>Approved</button>
                            ) : (
                              <button className="rounded bg-blue-600 px-3 py-1 text-white" onClick={() => handleBook(s._id)}>Book</button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {msg && <p className="text-sm text-gray-700">{msg}</p>}

          {/* My Bookings (user) */}
          {user && userBookings && userBookings.filter(b => String(b.instructorId?._id || b.instructorId) === String(selectedInstructor)).length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium">My Bookings</h4>
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-sm border">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left p-2">Time</th>
                      <th className="text-left p-2">Topic</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Meeting</th>
                      <th className="text-left p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userBookings.filter(b => String(b.instructorId?._id || b.instructorId) === String(selectedInstructor)).map(b => (
                      <tr key={b._id} className="border-t">
                        <td className="p-2">{b.slotId?.startsAt ? new Date(b.slotId.startsAt).toLocaleString() : '—'}</td>
                        <td className="p-2">{b.slotId?.topic || '—'}</td>
                        <td className="p-2"><span className={`${b.status === 'approved' ? 'text-green-700' : b.status === 'pending' ? 'text-orange-700' : 'text-gray-700'}`}>{b.status}</span></td>
                        <td className="p-2">{b.meetingLink ? <a className="text-blue-700" href={b.meetingLink} target="_blank">Link</a> : '—'}</td>
                        <td className="p-2">
                          {b.status === 'approved' && (
                            <div className="flex gap-2">
                              <button onClick={() => setChatPeer(b.instructorId?._id || b.instructorId)} className="text-sm text-blue-600 hover:underline">DM</button>
                              <button className="text-sm text-gray-600 hover:underline" onClick={async () => { const res = await fetch('/api/users/follow', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: b.instructorId?._id || b.instructorId }) }); if (res.ok) alert('Toggled follow'); }}>Follow</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </Card>

      {/* Instructor area */}
      {user && user.role === 'instructor' && (
        <Card>
          <h2 className="font-semibold mb-3">Instructor — Create Operating Slots</h2>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t('startTime')}</label>
                <TimeSelect value={startTime} onChange={setStartTime} className="w-full rounded border px-3 py-2" hour12={false} locale={locale} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('endTime')}</label>
                <TimeSelect value={endTime} onChange={setEndTime} className="w-full rounded border px-3 py-2" hour12={false} locale={locale} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Topic</label>
              <Input placeholder="e.g. General, Career Advice" value={topic} onChange={(e:any)=>setTopic(e.target.value)} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Repeat on Days</label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={`px-3 py-1 rounded border text-sm ${
                      selectedDays.includes(day.value)
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">Select days to repeat the time slot. Leave empty for selected date only.</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Weeks</label>
              <select
                value={weeks}
                onChange={(e) => setWeeks(Number(e.target.value))}
                className="rounded border px-3 py-2"
              >
                <option value={1}>1 week</option>
                <option value={2}>2 weeks</option>
                <option value={4}>4 weeks</option>
                <option value={8}>8 weeks</option>
              </select>
            </div>

            <Button disabled={creating} onClick={handleCreateSlots}>
              {creating ? t('creating') : t('createSlots')}
            </Button>

            {/* Requests */}
            <div className="mt-6">
              <h3 className="font-medium mb-2">Requests</h3>
              {instructorRequests.filter(r => {
                if (!r.slotId?.startsAt) return true;
                const dt = new Date(r.slotId.startsAt);
                const slotDate = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
                return !date || slotDate === date;
              }).length === 0 ? (
                <p className="text-gray-500">No requests</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left p-2">User</th>
                        <th className="text-left p-2">Slot</th>
                        <th className="text-left p-2">Status</th>
                        <th className="text-left p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {instructorRequests.filter(r => {
                        if (!r.slotId?.startsAt) return true;
                        const dt = new Date(r.slotId.startsAt);
                        const slotDate = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
                        return !date || slotDate === date;
                      }).map((r) => (
                        <tr key={r._id} className="border-t">
                          <td className="p-2">{r.userId?.name || r.userId?.email}</td>
                          <td className="p-2">{r.slotId?.startsAt ? new Date(r.slotId.startsAt).toLocaleString() : '—'}</td>
                          <td className="p-2">{r.status}</td>
                          <td className="p-2">
                            {r.status === 'pending' && (
                              <div className="flex gap-2">
                                <button onClick={() => handleInstructorAction(r._id, 'approve')} className="rounded bg-green-600 px-3 py-1 text-white">Approve</button>
                                <button onClick={() => handleInstructorAction(r._id, 'reject')} className="rounded bg-red-500 px-3 py-1 text-white">Reject</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}