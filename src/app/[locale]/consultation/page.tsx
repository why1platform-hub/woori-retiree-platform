"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card, Button, Input } from "@/components/UI";
import TimeSelect from "@/components/TimeSelect";

function CalendarGrid({
  locale, year, month, selectedDate, onSelectDate,
  primarySlotDates, otherSlotDates, onPrevMonth, onNextMonth,
}: {
  locale: string; year: number; month: number;
  selectedDate: string | null; onSelectDate: (d: string) => void;
  primarySlotDates: Set<string>; otherSlotDates: Set<string>;
  onPrevMonth: () => void; onNextMonth: () => void;
}) {
  const touchX = useRef<number | null>(null);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dayH = locale === 'ko' ? ['일','월','화','수','목','금','토'] : ['Su','Mo','Tu','We','Th','Fr','Sa'];
  const monthName = locale === 'ko'
    ? `${year}년 ${month + 1}월`
    : new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <div
      onTouchStart={e => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={e => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 50) { dx < 0 ? onNextMonth() : onPrevMonth(); }
        touchX.current = null;
      }}
    >
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={onPrevMonth} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors" aria-label="Previous month">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <p className="font-semibold text-gray-800 text-sm">{monthName}</p>
        <button onClick={onNextMonth} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors" aria-label="Next month">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 text-center text-xs mb-1">
        {dayH.map(d => <div key={d} className="text-gray-400 py-1 font-medium">{d}</div>)}
      </div>

      {/* Calendar cells */}
      <div className="grid grid-cols-7 gap-0.5 text-center text-xs">
        {cells.map((d, i) => {
          if (!d) return <div key={i} className="py-2.5" />;
          const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const cellDate = new Date(year, month, d);
          const isPast = cellDate < today;
          const isPrimary = !isPast && primarySlotDates.has(key);
          const isOther = !isPast && !isPrimary && otherSlotDates.has(key);
          const isSelected = selectedDate === key;
          const isToday = cellDate.getTime() === today.getTime();
          const isClickable = (isPrimary || isOther) && !isPast;
          return (
            <div
              key={i}
              onClick={() => isClickable && onSelectDate(key)}
              className={`py-2 rounded-lg flex flex-col items-center transition-all select-none ${
                isSelected ? 'bg-blue-600 text-white shadow-sm' :
                isPrimary ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer' :
                isOther ? 'bg-gray-100 text-gray-600 hover:bg-gray-200 cursor-pointer' :
                isToday ? 'ring-1 ring-blue-400 font-bold text-gray-800' :
                isPast ? 'text-gray-300' : 'text-gray-500'
              }`}
            >
              <span className="font-medium leading-tight">{d}</span>
              {(isPrimary || isOther) && (
                <span className={`w-1 h-1 rounded-full mt-0.5 ${isSelected ? 'bg-white' : isPrimary ? 'bg-blue-500' : 'bg-gray-400'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-3 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-100 border border-blue-400 inline-block" />
          {locale === 'ko' ? '선택 강사' : 'Selected'}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-gray-300 inline-block" />
          {locale === 'ko' ? '다른 강사' : 'Others'}
        </span>
      </div>
    </div>
  );
}

export default function ConsultationPage() {
  const t = useTranslations("consultations");
  const locale = useLocale();
  const [instructors, setInstructors] = useState<any[]>([]);
  const [selectedInstructor, setSelectedInstructor] = useState<string | null>(null);
  const [allSlots, setAllSlots] = useState<any[]>([]);
  const [allAvailableSlots, setAllAvailableSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [userBookings, setUserBookings] = useState<any[]>([]);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [instructorRequests, setInstructorRequests] = useState<any[]>([]);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Instructor slot creation state
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [topic, setTopic] = useState("General");
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [weeks, setWeeks] = useState(1);
  const [creating, setCreating] = useState(false);
  const [mySlots, setMySlots] = useState<any[]>([]);

  useEffect(() => {
    async function init() {
      try {
        const [insRes, meRes, myBookingsRes, allSlotsRes] = await Promise.all([
          fetch('/api/instructors'),
          fetch('/api/me'),
          fetch('/api/consultation/bookings'),
          fetch('/api/consultation/slots?available=true'),
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

        if (allSlotsRes.ok) {
          const d = await allSlotsRes.json();
          setAllAvailableSlots(d.slots || []);
        }

        if (currentUser?.role === 'instructor') {
          const [bookingsRes, slotsRes] = await Promise.all([
            fetch('/api/consultation/bookings?instructor=true'),
            fetch('/api/consultation/slots?mine=true'),
          ]);
          if (bookingsRes.ok) { const dd = await bookingsRes.json(); setInstructorRequests(dd.bookings || []); }
          if (slotsRes.ok) { const dd = await slotsRes.json(); setMySlots(dd.slots || []); }
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
    if (!selectedInstructor) return;
    async function loadSlots() {
      const res = await fetch(`/api/consultation/slots?instructorId=${selectedInstructor}`);
      if (res.ok) {
        const d = await res.json();
        setAllSlots(d.slots || []);
      }
    }
    loadSlots();
  }, [selectedInstructor]);

  // Month navigation
  const prevMonth = () => {
    setSelectedDate(null);
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    setSelectedDate(null);
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  };

  // Dates where selected instructor has available future slots
  const primarySlotDates = useMemo(() => {
    const s = new Set<string>();
    const now = new Date();
    allSlots.forEach(slot => {
      if (slot.isBooked) return;
      const dt = new Date(slot.startsAt);
      if (dt < now) return;
      s.add(`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`);
    });
    return s;
  }, [allSlots]);

  // Dates where OTHER instructors have available slots
  const otherSlotDates = useMemo(() => {
    const s = new Set<string>();
    allAvailableSlots.forEach(slot => {
      const instrId = String(slot.instructorId?._id || slot.instructorId);
      if (instrId === String(selectedInstructor)) return;
      const dt = new Date(slot.startsAt);
      s.add(`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`);
    });
    return s;
  }, [allAvailableSlots, selectedInstructor]);

  // Slots on selected date for selected instructor
  const slotsOnSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    return allSlots.filter(slot => {
      const dt = new Date(slot.startsAt);
      const key = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
      return key === selectedDate;
    }).sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  }, [allSlots, selectedDate]);

  // Other instructors with slots on selected date
  const otherInstructorsOnDate = useMemo(() => {
    if (!selectedDate) return [];
    const instrMap = new Map<string, { instructor: any; slots: any[] }>();
    allAvailableSlots.forEach(slot => {
      const dt = new Date(slot.startsAt);
      const key = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
      if (key !== selectedDate) return;
      const instrId = String(slot.instructorId?._id || slot.instructorId);
      if (instrId === String(selectedInstructor)) return;
      if (!instrMap.has(instrId)) {
        const ins = instructors.find(i => String(i._id) === instrId);
        instrMap.set(instrId, { instructor: ins || { _id: instrId, name: instrId }, slots: [] });
      }
      instrMap.get(instrId)!.slots.push(slot);
    });
    return [...instrMap.values()];
  }, [allAvailableSlots, selectedDate, selectedInstructor, instructors]);

  const formatSelectedDate = (key: string) => {
    const d = new Date(key + 'T00:00:00');
    const dayNames = locale === 'ko'
      ? ['일', '월', '화', '수', '목', '금', '토']
      : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return locale === 'ko'
      ? `${d.getMonth()+1}월 ${d.getDate()}일 (${dayNames[d.getDay()]})`
      : `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (${dayNames[d.getDay()]})`;
  };

  async function handleBook(slotId: string) {
    setMsg(null);
    setPending(p => ({ ...p, [slotId]: true }));
    try {
      const res = await fetch('/api/consultation/bookings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slotId })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setPending(p => { const np = { ...p }; delete np[slotId]; return np; });
        setMsg(data?.message || 'Booking failed');
      } else {
        setMsg(locale === 'ko' ? '예약이 요청되었습니다!' : 'Booking requested!');
        if (data?.booking) setUserBookings(prev => [data.booking, ...prev]);
        const r = await fetch(`/api/consultation/slots?instructorId=${selectedInstructor}`);
        if (r.ok) { const dd = await r.json(); setAllSlots(dd.slots || []); }
        const r2 = await fetch('/api/consultation/slots?available=true');
        if (r2.ok) { const dd = await r2.json(); setAllAvailableSlots(dd.slots || []); }
      }
    } catch {
      setPending(p => { const np = { ...p }; delete np[slotId]; return np; });
      setMsg(locale === 'ko' ? '예약 실패' : 'Booking failed');
    }
  }

  async function handleCreateSlots() {
    if (!user || user.role !== 'instructor') return;
    setCreating(true); setMsg(null);
    try {
      const res = await fetch('/api/consultation/slots', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ date: startDate, startTime, endTime, topic, days: selectedDays.length > 0 ? selectedDays : undefined, weeks }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.message || (locale === 'ko' ? '슬롯 생성 실패' : 'Failed to create slots'));
      } else {
        setMsg(locale === 'ko' ? `${data.count}개 슬롯 생성됨` : `Created ${data.count} slots`);
        const r = await fetch('/api/consultation/slots?mine=true');
        if (r.ok) { const dd = await r.json(); setMySlots(dd.slots || []); }
        if (user._id === selectedInstructor || !selectedInstructor) {
          const r2 = await fetch(`/api/consultation/slots?instructorId=${user._id}`);
          if (r2.ok) { const dd = await r2.json(); setAllSlots(dd.slots || []); }
        }
        const r3 = await fetch('/api/consultation/slots?available=true');
        if (r3.ok) { const dd = await r3.json(); setAllAvailableSlots(dd.slots || []); }
      }
    } catch { setMsg(locale === 'ko' ? '슬롯 생성 실패' : 'Failed to create slots'); }
    finally { setCreating(false); }
  }

  async function handleDeleteSlot(slotId: string) {
    if (!confirm(locale === 'ko' ? '이 슬롯을 삭제하시겠습니까?' : 'Delete this slot?')) return;
    try {
      const res = await fetch(`/api/consultation/slots?id=${slotId}`, { method: 'DELETE' });
      if (res.ok) {
        setMySlots(prev => prev.filter(s => s._id !== slotId));
        setMsg(locale === 'ko' ? '슬롯이 삭제되었습니다' : 'Slot deleted');
      } else {
        const d = await res.json().catch(() => null);
        setMsg(d?.message || (locale === 'ko' ? '삭제 실패' : 'Delete failed'));
      }
    } catch { setMsg(locale === 'ko' ? '삭제 실패' : 'Delete failed'); }
  }

  async function handleInstructorAction(bookingId: string, action: 'approve' | 'reject') {
    setMsg(null);
    try {
      const res = await fetch('/api/consultation/bookings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookingId, action }) });
      if (!res.ok) { const d = await res.json().catch(() => null); setMsg(d?.message || 'Failed'); return; }
      const r = await fetch('/api/consultation/bookings?instructor=true');
      if (r.ok) { const dd = await r.json(); setInstructorRequests(dd.bookings || []); }
      setMsg(locale === 'ko' ? `예약 ${action === 'approve' ? '승인됨' : '거절됨'}` : `Booking ${action}d`);
    } catch { setMsg(locale === 'ko' ? '업데이트 실패' : 'Failed to update booking'); }
  }

  function toggleRepeatDay(day: number) {
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

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600" />
    </div>
  );

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {locale === 'ko' ? '강사를 선택하고 상담 날짜를 예약하세요.' : 'Select an instructor and book a consultation date.'}
        </p>
      </div>

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
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded border px-3 py-2 w-full" />
            </div>
            <div>
              <label className="block text-sm mb-2">{t('repeatDays')}</label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((day) => (
                  <button key={day.value} type="button" onClick={() => toggleRepeatDay(day.value)}
                    className={`px-3 py-1 rounded border text-sm ${selectedDays.includes(day.value) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 hover:bg-gray-50"}`}>
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

          {mySlots.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <h3 className="font-medium mb-2">{locale === 'ko' ? '내 상담 슬롯' : 'My Consultation Slots'}</h3>
              <div className="grid gap-2 max-h-64 overflow-y-auto">
                {mySlots.map((s) => (
                  <div key={s._id} className="flex items-center justify-between border rounded px-3 py-2 bg-gray-50 text-sm">
                    <div>
                      <span className="font-medium">
                        {new Date(s.startsAt).toLocaleDateString(locale)} &nbsp;
                        {new Date(s.startsAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false })}
                        {' — '}
                        {new Date(s.endsAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </span>
                      <span className="ml-2 text-gray-500">{s.topic}</span>
                      {s.isBooked && (
                        <span className="ml-2 text-xs text-orange-600 bg-orange-50 px-1 rounded">{locale === 'ko' ? '예약됨' : 'Booked'}</span>
                      )}
                    </div>
                    {!s.isBooked && (
                      <button onClick={() => handleDeleteSlot(s._id)} className="text-red-500 hover:text-red-700 text-xs ml-2">
                        {locale === 'ko' ? '삭제' : 'Delete'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {instructorRequests.filter(r => r.status === 'pending').length > 0 && (
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

      {/* User: Browse & Book */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Calendar - 3/5 width on desktop */}
        <div className="lg:col-span-3">
          <Card>
            {/* Instructor selector */}
            <div className="mb-5">
              <p className="text-sm font-medium text-gray-700 mb-2">{t('selectInstructor')}</p>
              {instructors.length === 0 ? (
                <p className="text-gray-500 text-sm">{locale === 'ko' ? '등록된 강사가 없습니다.' : 'No instructors available.'}</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {instructors.map(ins => (
                    <button
                      key={ins._id}
                      onClick={() => { setSelectedInstructor(ins._id); setSelectedDate(null); }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        selectedInstructor === ins._id
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:text-blue-600'
                      }`}
                    >
                      {ins.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Calendar grid */}
            {instructors.length > 0 && (
              <>
                <CalendarGrid
                  locale={locale}
                  year={calYear}
                  month={calMonth}
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                  primarySlotDates={primarySlotDates}
                  otherSlotDates={otherSlotDates}
                  onPrevMonth={prevMonth}
                  onNextMonth={nextMonth}
                />

                {/* Hint */}
                {!selectedDate && primarySlotDates.size > 0 && (
                  <p className="text-xs text-gray-500 text-center mt-3">
                    {locale === 'ko' ? '파란색 날짜를 클릭해 시간을 확인하세요.' : 'Tap a highlighted date to see available times.'}
                  </p>
                )}
                {primarySlotDates.size === 0 && selectedInstructor && (
                  <p className="text-sm text-gray-500 text-center mt-4">{t('noAvailableSlots')}</p>
                )}

                {/* Selected date slots */}
                {selectedDate && (
                  <div className="mt-5 pt-4 border-t">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                      {formatSelectedDate(selectedDate)}
                    </h3>

                    {slotsOnSelectedDate.length === 0 ? (
                      <div className="bg-gray-50 rounded-lg p-4 text-center">
                        <p className="text-sm text-gray-600 font-medium">
                          {locale === 'ko' ? '선택한 강사는 이 날짜에 예약 가능한 시간이 없습니다.' : 'Selected instructor has no slots on this date.'}
                        </p>
                        {otherInstructorsOnDate.length > 0 && (
                          <div className="mt-3 text-left">
                            <p className="text-xs font-semibold text-blue-700 mb-2 text-center">
                              {locale === 'ko' ? '↓ 다른 강사는 이 날짜에 예약 가능합니다' : '↓ Other instructors are available on this date'}
                            </p>
                            <div className="grid gap-2">
                              {otherInstructorsOnDate.map(({ instructor, slots: iSlots }) => (
                                <div key={instructor._id} className="rounded-xl border border-blue-100 bg-white p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <div>
                                      <p className="font-semibold text-sm text-gray-900">{instructor.name}</p>
                                      <p className="text-xs text-green-600">{iSlots.length} {locale === 'ko' ? '슬롯 가능' : 'slots available'}</p>
                                    </div>
                                    <button
                                      onClick={() => setSelectedInstructor(instructor._id)}
                                      className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium"
                                    >
                                      {locale === 'ko' ? '강사 변경' : 'Switch'}
                                    </button>
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {iSlots.slice(0, 5).map((s: any) => (
                                      <span key={s._id} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                                        {new Date(s.startsAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false })}
                                      </span>
                                    ))}
                                    {iSlots.length > 5 && <span className="text-xs text-gray-400">+{iSlots.length - 5}</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="grid gap-2">
                        {slotsOnSelectedDate.map(s => {
                          const userBooking = userBookings.find(b => String(b.slotId?._id || b.slotId) === String(s._id));
                          const isUserPending = !!pending[s._id] || (!!userBooking && userBooking.status === 'pending');
                          const isUserApproved = !!userBooking && userBooking.status === 'approved';
                          return (
                            <div key={s._id} className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-colors ${s.isBooked ? 'bg-gray-50 opacity-60' : 'bg-white hover:border-blue-300 hover:shadow-sm'}`}>
                              <div>
                                <p className="font-semibold text-sm text-gray-900">
                                  {new Date(s.startsAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false })}
                                  {' – '}
                                  {new Date(s.endsAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false })}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">{s.topic}</p>
                              </div>
                              <div>
                                {s.isBooked ? (
                                  <span className="text-xs text-gray-500 px-3 py-1.5 bg-gray-200 rounded-full">{locale === 'ko' ? '예약됨' : 'Booked'}</span>
                                ) : isUserApproved ? (
                                  <span className="text-xs text-green-700 px-3 py-1.5 bg-green-100 rounded-full">{locale === 'ko' ? '승인됨' : 'Approved'}</span>
                                ) : isUserPending ? (
                                  <span className="text-xs text-orange-700 px-3 py-1.5 bg-orange-100 rounded-full">{locale === 'ko' ? '대기 중' : 'Pending'}</span>
                                ) : user?.role === 'instructor' && String(s.instructorId) === String(user._id) ? (
                                  <span className="text-xs text-gray-400 px-2 py-1">{locale === 'ko' ? '내 슬롯' : 'My slot'}</span>
                                ) : (
                                  <button
                                    className="rounded-lg bg-blue-600 px-4 py-2 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60"
                                    onClick={() => handleBook(s._id)}
                                    disabled={!!pending[s._id]}
                                  >
                                    {pending[s._id] ? '...' : (locale === 'ko' ? '예약' : 'Book')}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {msg && (
                  <p className="text-sm text-blue-700 bg-blue-50 rounded-lg p-3 mt-4">{msg}</p>
                )}
              </>
            )}
          </Card>
        </div>

        {/* Right sidebar - 2/5 width on desktop */}
        <div className="lg:col-span-2 grid gap-4 content-start">
          {/* Other instructors on selected date */}
          {selectedDate && otherInstructorsOnDate.length > 0 && (
            <Card>
              <h3 className="font-semibold text-gray-800 mb-3 text-sm">
                {locale === 'ko' ? `${formatSelectedDate(selectedDate)} 다른 강사도 가능` : `Also available on ${formatSelectedDate(selectedDate)}`}
              </h3>
              <div className="grid gap-2">
                {otherInstructorsOnDate.map(({ instructor, slots: iSlots }) => (
                  <div key={instructor._id} className="rounded-xl border p-3 hover:border-blue-200 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-semibold text-sm text-gray-900">{instructor.name}</p>
                        <p className="text-xs text-green-600 mt-0.5">{iSlots.length} {locale === 'ko' ? '슬롯 가능' : 'slots available'}</p>
                      </div>
                      <button
                        onClick={() => { setSelectedInstructor(instructor._id); }}
                        className="text-xs px-3 py-1.5 rounded-lg border border-blue-300 text-blue-600 hover:bg-blue-50 transition-colors font-medium"
                      >
                        {locale === 'ko' ? '선택' : 'Select'}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {iSlots.slice(0, 4).map((s: any) => (
                        <span key={s._id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {new Date(s.startsAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false })}
                        </span>
                      ))}
                      {iSlots.length > 4 && <span className="text-xs text-gray-400">+{iSlots.length - 4}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* All instructors overview */}
          <Card>
            <h3 className="font-semibold text-gray-800 mb-3 text-sm">{locale === 'ko' ? '강사 목록' : 'Instructors'}</h3>
            {instructors.length === 0 ? (
              <p className="text-sm text-gray-500">{locale === 'ko' ? '등록된 강사가 없습니다.' : 'No instructors available.'}</p>
            ) : (
              <div className="grid gap-2">
                {instructors.map(ins => {
                  const hasSlots = allAvailableSlots.some(s => String(s.instructorId?._id || s.instructorId) === String(ins._id));
                  const isSelected = selectedInstructor === ins._id;
                  return (
                    <button
                      key={ins._id}
                      onClick={() => { setSelectedInstructor(ins._id); setSelectedDate(null); }}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-colors text-left w-full ${
                        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                      }`}
                    >
                      <div>
                        <p className={`font-medium text-sm ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}>{ins.name}</p>
                        <p className={`text-xs mt-0.5 ${hasSlots ? 'text-green-600' : 'text-gray-400'}`}>
                          {hasSlots ? (locale === 'ko' ? '● 예약 가능' : '● Available') : (locale === 'ko' ? '슬롯 없음' : 'No slots')}
                        </p>
                      </div>
                      {isSelected && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </Card>

          {/* How to book */}
          <Card>
            <h3 className="font-semibold text-gray-800 mb-3 text-sm">{locale === 'ko' ? '예약 방법' : 'How to Book'}</h3>
            <ol className="space-y-3">
              {[
                { n: '1', t: locale === 'ko' ? '강사 선택' : 'Select Instructor', d: locale === 'ko' ? '원하는 강사를 선택하세요.' : 'Choose your instructor.' },
                { n: '2', t: locale === 'ko' ? '날짜 선택' : 'Pick a Date', d: locale === 'ko' ? '파란 날짜를 클릭하세요.' : 'Click a highlighted date.' },
                { n: '3', t: locale === 'ko' ? '시간 예약' : 'Book a Time', d: locale === 'ko' ? '예약 버튼을 눌러 요청하세요.' : 'Press Book to submit request.' },
              ].map(s => (
                <li key={s.n} className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{s.n}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{s.t}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{s.d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}
