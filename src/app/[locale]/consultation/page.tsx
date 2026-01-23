"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card, Button, Input } from "@/components/UI";
import TimeSelect from "@/components/TimeSelect";

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
  const [userBookings, setUserBookings] = useState<any[]>([]);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [instructorRequests, setInstructorRequests] = useState<any[]>([]);

  // For instructors: create slots
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [topic, setTopic] = useState("General");
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [weeks, setWeeks] = useState(1);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const [insRes, meRes, myBookingsRes] = await Promise.all([
          fetch('/api/instructors'),
          fetch('/api/me'),
          fetch('/api/consultation/bookings'),
        ]);

        if (insRes.ok) {
          const d = await insRes.json();
          setInstructors(d.instructors || []);
          if ((d.instructors || []).length) setSelectedInstructor(d.instructors[0]._id);
        }

        let currentUser = null;
        if (meRes.ok) {
          const d = await meRes.json();
          currentUser = d.user;
          setUser(d.user);
        }

        if (myBookingsRes.ok) {
          const d = await myBookingsRes.json();
          setUserBookings(d.bookings || []);
        }

        // If instructor, fetch booking requests
        if (currentUser?.role === 'instructor') {
          const r = await fetch('/api/consultation/bookings?instructor=true');
          if (r.ok) { const dd = await r.json(); setInstructorRequests(dd.bookings || []); }
        }
      } catch (err) {
        console.error("Failed to load consultation data:", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (!selectedInstructor || !date) return;
    async function loadSlots() {
      const res = await fetch(`/api/consultation/slots?instructorId=${selectedInstructor}`);
      if (res.ok) {
        const d = await res.json();
        const filtered = (d.slots || []).filter((s: any) => {
          const dt = new Date(s.startsAt);
          const slotDate = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
          return slotDate === date;
        });
        setSlots(filtered);
      }
    }
    loadSlots();
  }, [selectedInstructor, date]);

  async function handleBook(slotId: string) {
    setMsg(null);
    setPending(p => ({ ...p, [slotId]: true }));
    try {
      const res = await fetch('/api/consultation/bookings', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ slotId }) });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setPending(p => { const np = { ...p }; delete np[slotId]; return np; });
        setMsg(data?.message || 'Booking failed');
      } else {
        setMsg('Booking requested!');
        if (data?.booking) setUserBookings(prev => [data.booking, ...prev]);
        // Refresh slots
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
    } catch {
      setPending(p => { const np = { ...p }; delete np[slotId]; return np; });
      setMsg('Booking failed');
    }
  }

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
        // Refresh slots
        const r = await fetch(`/api/consultation/slots?instructorId=${user._id || selectedInstructor}`);
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
    } catch { setMsg('Failed to create slots'); }
    finally { setCreating(false); }
  }

  async function handleInstructorAction(bookingId: string, action: 'approve' | 'reject') {
    setMsg(null);
    try {
      const res = await fetch('/api/consultation/bookings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookingId, action }) });
      if (!res.ok) { const d = await res.json().catch(() => null); setMsg(d?.message || 'Failed'); return; }
      // Refresh
      const r = await fetch('/api/consultation/bookings?instructor=true');
      if (r.ok) { const dd = await r.json(); setInstructorRequests(dd.bookings || []); }
      setMsg(`Booking ${action}d`);
    } catch { setMsg('Failed to update booking'); }
  }

  function toggleDay(day: number) {
    setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  }

  const DAYS = [
    { value: 0, label: locale === 'ko' ? '일' : 'Sun' },
    { value: 1, label: locale === 'ko' ? '월' : 'Mon' },
    { value: 2, label: locale === 'ko' ? '화' : 'Tue' },
    { value: 3, label: locale === 'ko' ? '수' : 'Wed' },
    { value: 4, label: locale === 'ko' ? '목' : 'Thu' },
    { value: 5, label: locale === 'ko' ? '금' : 'Fri' },
    { value: 6, label: locale === 'ko' ? '토' : 'Sat' },
  ];

  if (loading) return <p className="text-gray-500 p-4">{locale === 'ko' ? '로딩 중...' : 'Loading...'}</p>;

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-bold">{t('title')}</h1>

      {/* Instructor: Create Slots */}
      {user?.role === 'instructor' && (
        <Card>
          <h2 className="font-semibold mb-3">{t('createSlots')}</h2>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1">{t('startTime')}</label>
                <TimeSelect value={startTime} onChange={setStartTime} className="w-full rounded border px-3 py-2" hour12={false} locale={locale} />
              </div>
              <div>
                <label className="block text-sm mb-1">{t('endTime')}</label>
                <TimeSelect value={endTime} onChange={setEndTime} className="w-full rounded border px-3 py-2" hour12={false} locale={locale} />
              </div>
            </div>
            <div>
              <label className="block text-sm mb-1">{t('topic')}</label>
              <Input placeholder={locale === 'ko' ? '예: 취업 상담' : 'e.g. Career Advice'} value={topic} onChange={(e: any) => setTopic(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1">{t('startDate')}</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded border px-3 py-2 w-full" />
            </div>
            <div>
              <label className="block text-sm mb-2">{t('repeatDays')}</label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={`px-3 py-1 rounded border text-sm ${selectedDays.includes(day.value) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 hover:bg-gray-50"}`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm mb-1">{locale === 'ko' ? '반복 주' : 'Weeks'}</label>
              <select value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} className="rounded border px-3 py-2">
                <option value={1}>{locale === 'ko' ? '1주' : '1 week'}</option>
                <option value={2}>{locale === 'ko' ? '2주' : '2 weeks'}</option>
                <option value={4}>{locale === 'ko' ? '4주' : '4 weeks'}</option>
              </select>
            </div>
            <Button disabled={creating} onClick={handleCreateSlots}>
              {creating ? (locale === 'ko' ? '생성 중...' : 'Creating...') : t('createSlots')}
            </Button>
          </div>

          {/* Instructor Booking Requests */}
          {instructorRequests.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <h3 className="font-medium mb-2">{locale === 'ko' ? '예약 요청' : 'Booking Requests'}</h3>
              <div className="grid gap-2">
                {instructorRequests.filter(r => r.status === 'pending').map((r) => (
                  <div key={r._id} className="flex items-center justify-between border rounded p-2">
                    <div>
                      <span className="font-medium text-sm">{r.userId?.name || r.userId?.email}</span>
                      <span className="text-xs text-gray-500 ml-2">{r.slotId?.startsAt ? new Date(r.slotId.startsAt).toLocaleString(locale) : '—'}</span>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleInstructorAction(r._id, 'approve')} className="rounded bg-green-600 px-2 py-1 text-white text-xs">{locale === 'ko' ? '승인' : 'Approve'}</button>
                      <button onClick={() => handleInstructorAction(r._id, 'reject')} className="rounded bg-red-500 px-2 py-1 text-white text-xs">{locale === 'ko' ? '거절' : 'Reject'}</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* User: Browse & Book Slots */}
      <Card>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">{t('selectInstructor')}</label>
              <select value={selectedInstructor || ''} onChange={(e) => setSelectedInstructor(e.target.value)} className="w-full rounded border px-3 py-2">
                {instructors.length === 0 && <option value="">{locale === 'ko' ? '강사 없음' : 'No instructors'}</option>}
                {instructors.map((ins) => <option key={ins._id} value={ins._id}>{ins.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">{locale === 'ko' ? '날짜' : 'Date'}</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded border px-3 py-2" />
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-2">{t('availableTimes')}</h3>
            {instructors.length === 0 ? (
              <p className="text-gray-500 text-sm">{locale === 'ko' ? '등록된 강사가 없습니다.' : 'No instructors available.'}</p>
            ) : slots.length === 0 ? (
              <p className="text-gray-500 text-sm">{t('noAvailableSlots')}</p>
            ) : (
              <div className="grid gap-2">
                {slots.map((s) => {
                  const userBooking = userBookings.find(b => String(b.slotId?._id || b.slotId) === String(s._id));
                  const isUserPending = !!pending[s._id] || (!!userBooking && userBooking.status === 'pending');
                  const isUserApproved = !!userBooking && userBooking.status === 'approved';

                  return (
                    <div key={s._id} className="flex items-center justify-between border rounded px-3 py-2">
                      <div>
                        <span className="text-sm font-medium">
                          {new Date(s.startsAt).toLocaleTimeString(locale, {hour: '2-digit', minute:'2-digit', hour12: false})} - {new Date(s.endsAt).toLocaleTimeString(locale, {hour: '2-digit', minute:'2-digit', hour12: false})}
                        </span>
                        <span className="text-xs text-gray-500 ml-2">{s.topic}</span>
                      </div>
                      <div>
                        {s.isBooked ? (
                          <span className="text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded">{locale === 'ko' ? '예약됨' : 'Booked'}</span>
                        ) : isUserApproved ? (
                          <span className="text-xs text-green-700 px-2 py-1 bg-green-50 rounded">{locale === 'ko' ? '승인됨' : 'Approved'}</span>
                        ) : isUserPending ? (
                          <span className="text-xs text-orange-700 px-2 py-1 bg-orange-50 rounded">{locale === 'ko' ? '대기 중' : 'Pending'}</span>
                        ) : (
                          <button className="rounded bg-blue-600 px-3 py-1 text-white text-xs" onClick={() => handleBook(s._id)}>
                            {locale === 'ko' ? '예약' : 'Book'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {msg && <p className="text-sm text-blue-700 bg-blue-50 rounded p-2">{msg}</p>}
        </div>
      </Card>
    </div>
  );
}
