"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { Card, Badge } from "@/components/UI";

interface Notice { _id: string; title: string; body: string; badge: "info" | "urgent"; publishedAt: string; }
interface Program { _id: string; name: string; category: string; status: string; startDate: string; endDate: string; }
interface Job { _id: string; company: string; title: string; location: string; employmentType: string; salary: string; companyLogo?: string; }
interface User { _id: string; name: string; email: string; role: string; }
interface Application { _id: string; status: string; }
interface Booking { _id: string; status: string; slotId?: { startsAt: string; endsAt: string }; }

type EventType = 'booking' | 'program' | 'both';

function MiniCalendar({
  locale,
  year,
  month,
  onPrevMonth,
  onNextMonth,
  eventDates,
}: {
  locale: string;
  year: number;
  month: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  eventDates: Record<string, EventType>;
}) {
  const touchX = useRef<number | null>(null);
  const today = new Date();
  const todayDate = today.getDate();
  const todayMonth = today.getMonth();
  const todayYear = today.getFullYear();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const dayHeaders = locale === 'ko'
    ? ['일', '월', '화', '수', '목', '금', '토']
    : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

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
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={onPrevMonth}
          className="p-1 rounded hover:bg-gray-100 text-gray-500 transition-colors"
          aria-label="Previous month"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <p className="text-sm font-semibold text-center text-gray-700">{monthName}</p>
        <button
          onClick={onNextMonth}
          className="p-1 rounded hover:bg-gray-100 text-gray-500 transition-colors"
          aria-label="Next month"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-px text-center text-xs">
        {dayHeaders.map(d => <div key={d} className="text-gray-400 pb-1 font-medium">{d}</div>)}
      </div>

      {/* Calendar cells */}
      <div className="grid grid-cols-7 gap-px text-center text-xs">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const isToday = d === todayDate && month === todayMonth && year === todayYear;
          const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const eventType = eventDates[dateKey];
          return (
            <div
              key={i}
              className={`py-1 rounded flex flex-col items-center ${isToday ? 'bg-blue-600 text-white font-bold' : d ? 'text-gray-700 hover:bg-gray-100' : ''}`}
            >
              <span className="leading-tight">{d}</span>
              {eventType && (
                <div className="flex gap-px mt-0.5 justify-center">
                  {(eventType === 'booking' || eventType === 'both') && (
                    <span className={`w-1 h-1 rounded-full ${isToday ? 'bg-white' : 'bg-blue-500'}`} />
                  )}
                  {(eventType === 'program' || eventType === 'both') && (
                    <span className={`w-1 h-1 rounded-full ${isToday ? 'bg-yellow-200' : 'bg-orange-500'}`} />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-2 justify-center text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />{locale === 'ko' ? '상담' : 'Consult'}</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />{locale === 'ko' ? '프로그램' : 'Program'}</span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const locale = useLocale();
  const [user, setUser] = useState<User | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());

  const T = {
    welcome: locale === 'ko' ? '안녕하세요' : 'Welcome',
    notices: locale === 'ko' ? '공지사항' : 'Notices',
    noNotices: locale === 'ko' ? '공지사항이 없습니다.' : 'No notices.',
    programs: locale === 'ko' ? '진행 중인 프로그램' : 'Ongoing Programs',
    noPrograms: locale === 'ko' ? '진행 중인 프로그램이 없습니다.' : 'No ongoing programs.',
    myStatus: locale === 'ko' ? '나의 현황' : 'My Status',
    applied: locale === 'ko' ? '신청 내역' : 'Applications',
    consultations: locale === 'ko' ? '상담 예약' : 'Consultations',
    thisMonth: locale === 'ko' ? '이번 달 일정' : 'This Month',
    recommended: locale === 'ko' ? '추천 채용정보' : 'Recommended Jobs',
    quickAccess: locale === 'ko' ? '바로가기' : 'Quick Access',
    dday: (d: number) => d === 0 ? 'D-day' : `D-${d}`,
    urgent: locale === 'ko' ? '긴급' : 'Urgent',
    info: locale === 'ko' ? '정보' : 'Info',
    viewAll: locale === 'ko' ? '전체보기' : 'View All',
    pending: locale === 'ko' ? '승인 대기' : 'Pending',
    approved: locale === 'ko' ? '승인 완료' : 'Approved',
    open: locale === 'ko' ? '모집중' : 'Open',
    upcoming: locale === 'ko' ? '예정' : 'Upcoming',
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const [noticesRes, meRes, programsRes, jobsRes, appsRes, bookingsRes] = await Promise.all([
          fetch("/api/notices"),
          fetch("/api/me"),
          fetch("/api/programs"),
          fetch("/api/jobs"),
          fetch("/api/applications"),
          fetch("/api/consultation/bookings"),
        ]);
        if (noticesRes.ok) setNotices((await noticesRes.json()).notices || []);
        if (meRes.ok) setUser((await meRes.json()).user);
        if (programsRes.ok) setPrograms((await programsRes.json()).programs || []);
        if (jobsRes.ok) setJobs((await jobsRes.json()).jobs || []);
        if (appsRes.ok) setApplications((await appsRes.json()).applications || []);
        if (bookingsRes.ok) setBookings((await bookingsRes.json()).bookings || []);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const ongoingPrograms = useMemo(() => programs.filter(p => p.status === 'open' || p.status === 'upcoming'), [programs]);
  const top3Notices = useMemo(() => notices.slice(0, 3), [notices]);
  const top2Jobs = useMemo(() => jobs.slice(0, 2), [jobs]);

  const getDday = (endDate: string) => {
    const diff = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000);
    return Math.max(0, diff);
  };

  const approvedCount = applications.filter(a => a.status === 'approved').length;
  const approvedBookings = bookings.filter(b => b.status === 'approved').length;

  // Build event dates for calendar: booking dates (blue) and program deadlines (orange)
  const eventDates = useMemo(() => {
    const map: Record<string, EventType> = {};
    const toKey = (iso: string) => {
      const d = new Date(iso);
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    };

    bookings.forEach(b => {
      if (b.slotId?.startsAt) {
        const key = toKey(b.slotId.startsAt);
        map[key] = map[key] === 'program' ? 'both' : 'booking';
      }
    });

    programs.forEach(p => {
      if (p.status !== 'closed') {
        const key = toKey(p.endDate);
        map[key] = map[key] === 'booking' ? 'both' : 'program';
      }
    });

    return map;
  }, [bookings, programs]);

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  };

  const quickLinks = [
    { href: `/${locale}/programs`, label: locale === 'ko' ? '프로그램 신청' : 'Programs', icon: '📋', color: 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200' },
    { href: `/${locale}/jobs`, label: locale === 'ko' ? '채용정보' : 'Jobs', icon: '💼', color: 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200' },
    { href: `/${locale}/learning`, label: locale === 'ko' ? '학습자료' : 'Learning', icon: '📚', color: 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200' },
    { href: `/${locale}/support`, label: locale === 'ko' ? '고객지원' : 'Support', icon: '🙋', color: 'bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200' },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600" />
    </div>
  );

  return (
    <div className="grid gap-6">
      {/* Greeting */}
      {user && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {locale === 'ko' ? `${T.welcome}, ${user.name}님` : `${T.welcome}, ${user.name}`}
            </h1>
            <p className="text-sm text-gray-500 mt-1">{user.email}</p>
          </div>
          <Badge tone={user.role === "superadmin" ? "orange" : user.role === "instructor" ? "blue" : "green"}>
            {user.role}
          </Badge>
        </div>
      )}

      {/* Main 60/40 layout */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* LEFT: 60% — Notices + Programs */}
        <div className="lg:col-span-3 grid gap-6">
          {/* Notices */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-gray-900">{T.notices}</h2>
              <Link href={`/${locale}/support`} className="text-xs text-blue-600 hover:underline">{T.viewAll}</Link>
            </div>
            {top3Notices.length === 0 ? (
              <p className="text-sm text-gray-400">{T.noNotices}</p>
            ) : (
              <div className="divide-y">
                {top3Notices.map(n => (
                  <div key={n._id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start gap-2">
                      <span className={`mt-0.5 flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${n.badge === 'urgent' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                        {n.badge === 'urgent' ? T.urgent : T.info}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-gray-800 line-clamp-1">{n.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                        <p className="text-xs text-gray-400 mt-1">{new Date(n.publishedAt).toLocaleDateString(locale)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Ongoing Programs */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-gray-900">{T.programs}</h2>
              <Link href={`/${locale}/programs`} className="text-xs text-blue-600 hover:underline">{T.viewAll}</Link>
            </div>
            {ongoingPrograms.length === 0 ? (
              <p className="text-sm text-gray-400">{T.noPrograms}</p>
            ) : (
              <div className="divide-y">
                {ongoingPrograms.slice(0, 4).map(p => {
                  const dday = getDday(p.endDate);
                  return (
                    <div key={p._id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-gray-800 line-clamp-1">{p.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(p.startDate).toLocaleDateString(locale)} ~ {new Date(p.endDate).toLocaleDateString(locale)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded">{T.dday(dday)}</span>
                        <Badge tone={p.status === 'open' ? 'green' : 'orange'}>
                          {p.status === 'open' ? T.open : T.upcoming}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* RIGHT: 40% — Status + Calendar + Jobs */}
        <div className="lg:col-span-2 grid gap-6 content-start">
          {/* My Status */}
          <Card>
            <h2 className="font-bold text-gray-900 mb-3">{T.myStatus}</h2>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-blue-700">{applications.length}</p>
                <p className="text-xs text-gray-600 mt-1">{T.applied}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-green-700">{approvedCount}</p>
                <p className="text-xs text-gray-600 mt-1">{T.approved}</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-purple-700">{approvedBookings}</p>
                <p className="text-xs text-gray-600 mt-1">{T.consultations}</p>
              </div>
            </div>
          </Card>

          {/* Calendar */}
          <Card>
            <h2 className="font-bold text-gray-900 mb-3">{T.thisMonth}</h2>
            <MiniCalendar
              locale={locale}
              year={calYear}
              month={calMonth}
              onPrevMonth={prevMonth}
              onNextMonth={nextMonth}
              eventDates={eventDates}
            />
          </Card>

          {/* Recommended Jobs */}
          {top2Jobs.length > 0 && (
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-gray-900">{T.recommended}</h2>
                <Link href={`/${locale}/jobs`} className="text-xs text-blue-600 hover:underline">{T.viewAll}</Link>
              </div>
              <div className="grid gap-3">
                {top2Jobs.map(job => (
                  <Link key={job._id} href={`/${locale}/jobs`} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-blue-50 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-white border flex items-center justify-center overflow-hidden flex-shrink-0">
                      {job.companyLogo
                        ? <img src={job.companyLogo} alt={job.company} className="w-full h-full object-contain p-1" />
                        : <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">{job.company.charAt(0)}</div>
                      }
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 line-clamp-1">{job.title}</p>
                      <p className="text-xs text-gray-500">{job.company} · {job.location || '—'}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Quick Access Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {quickLinks.map(link => (
          <Link key={link.href} href={link.href} className={`flex flex-col items-center gap-2 p-4 rounded-xl text-center transition-colors ${link.color}`}>
            <span className="text-2xl">{link.icon}</span>
            <span className="text-sm font-medium">{link.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
