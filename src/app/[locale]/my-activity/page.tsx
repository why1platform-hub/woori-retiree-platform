"use client";

import { useEffect, useState, useMemo } from "react";
import { useLocale } from "next-intl";
import { Card, Badge } from "@/components/UI";

interface Application {
  _id: string;
  program: { _id: string; name: string; category: string };
  status: string;
  createdAt: string;
}

interface Bookmark {
  _id: string;
  job: string;
  jobData?: { _id: string; title: string; company: string; location: string };
  createdAt: string;
}

interface ConsultationBooking {
  _id: string;
  slot: { _id: string; date: string; startTime: string; endTime: string; topic: string } | null;
  instructor?: { name: string; email?: string };
  status: string;
  meetingLink?: string;
  createdAt: string;
}

interface Resume {
  _id: string;
  summary: string;
  experience: string;
  skills: string;
  updatedAt: string;
}

interface User { id: string; email: string; name: string; role: string; }

type TabKey = "applications" | "bookmarks" | "consultations" | "resume";

export default function MyActivityPage() {
  const locale = useLocale();
  const [applications, setApplications] = useState<Application[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [consultations, setConsultations] = useState<ConsultationBooking[]>([]);
  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("applications");
  const [user, setUser] = useState<User | null>(null);
  const [editingResume, setEditingResume] = useState(false);
  const [resumeForm, setResumeForm] = useState({ summary: "", experience: "", skills: "" });
  const [saving, setSaving] = useState(false);

  const L = (ko: string, en: string) => locale === 'ko' ? ko : en;

  useEffect(() => {
    async function fetchData() {
      try {
        const [appsRes, bookmarksRes, consultRes, resumeRes, meRes] = await Promise.all([
          fetch("/api/applications"),
          fetch("/api/bookmarks"),
          fetch("/api/consultation/bookings"),
          fetch("/api/resume"),
          fetch('/api/me'),
        ]);

        if (appsRes.ok) setApplications((await appsRes.json()).applications || []);
        if (bookmarksRes.ok) setBookmarks((await bookmarksRes.json()).bookmarks || []);

        if (consultRes.ok) {
          const unknown = L('알 수 없음', 'Unknown');
          const normalized = ((await consultRes.json()).bookings || []).map((b: any) => {
            const slot = b.slotId ? {
              _id: b.slotId._id,
              date: new Date(b.slotId.startsAt).toISOString().slice(0, 10),
              startTime: new Date(b.slotId.startsAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false }),
              endTime: new Date(b.slotId.endsAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false }),
              topic: b.slotId.topic || 'General',
            } : null;
            const instructor = b.instructorId ? { name: b.instructorId.name, email: b.instructorId.email } : { name: unknown };
            return { ...b, slot, instructor };
          });
          setConsultations(normalized);
        }

        if (resumeRes.ok) {
          const data = await resumeRes.json();
          if (data.resume) {
            setResume(data.resume);
            setResumeForm({ summary: data.resume.summary || "", experience: data.resume.experience || "", skills: data.resume.skills || "" });
          }
        }

        if (meRes.ok) { const d = await meRes.json(); if (d.user) setUser(d.user); }
      } catch (err) {
        console.error("Error fetching activity data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [locale]);

  const handleRemoveBookmark = async (id: string) => {
    const res = await fetch(`/api/bookmarks?id=${id}`, { method: "DELETE" });
    if (res.ok) setBookmarks(b => b.filter(x => x._id !== id));
  };

  const handleSaveResume = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/resume", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resumeForm),
      });
      if (res.ok) { const d = await res.json(); setResume(d.resume); setEditingResume(false); }
    } finally {
      setSaving(false);
    }
  };

  const getStatusTone = (status: string): "green" | "orange" | "gray" | "blue" => {
    if (status === "approved" || status === "done") return "green";
    if (status === "pending") return "orange";
    if (status === "rejected" || status === "cancelled") return "gray";
    return "blue";
  };

  const statusLabel: Record<string, string> = {
    approved: L('승인됨', 'Approved'),
    pending: L('대기중', 'Pending'),
    rejected: L('거절됨', 'Rejected'),
    cancelled: L('취소됨', 'Cancelled'),
    done: L('완료', 'Done'),
  };

  // Sidebar derived data
  const approvedApps = useMemo(() => applications.filter(a => a.status === 'approved').length, [applications]);
  const pendingApps = useMemo(() => applications.filter(a => a.status === 'pending').length, [applications]);

  const today = new Date().toISOString().slice(0, 10);
  const nextBooking = useMemo(() =>
    consultations
      .filter(c => c.slot?.date && c.slot.date >= today && c.status !== 'rejected' && c.status !== 'cancelled')
      .sort((a, b) => (a.slot!.date > b.slot!.date ? 1 : -1))[0]
  , [consultations]);

  const TABS: { key: TabKey; label: string; count?: number }[] = [
    { key: "applications", label: L('지원 현황', 'Applications'), count: applications.length },
    { key: "bookmarks", label: L('찜한 채용', 'Saved Jobs'), count: bookmarks.length },
    { key: "consultations", label: L('상담 예약', 'Consultations'), count: consultations.length },
    { key: "resume", label: L('이력서', 'My Resume') },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600" />
    </div>
  );

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{L('내 활동', 'My Activity')}</h1>
        <p className="text-sm text-gray-500 mt-1">{L('지원, 상담, 북마크, 이력서를 한눈에 확인하세요.', 'Track your applications, consultations, bookmarks, and resume.')}</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Main + Sidebar */}
      <div className="grid gap-6 lg:grid-cols-4">
        {/* Main Content */}
        <div className="lg:col-span-3 grid gap-4">

          {/* Applications Tab */}
          {activeTab === "applications" && (
            applications.length === 0 ? (
              <Card><p className="text-gray-400 text-center py-6">{L('아직 지원한 프로그램이 없습니다.', "No applications yet.")}</p></Card>
            ) : (
              <div className="overflow-x-auto rounded-lg border bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="text-left px-4 py-3 font-semibold text-gray-700">{L('프로그램', 'Program')}</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-700">{L('지원일', 'Applied')}</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-700">{L('상태', 'Status')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {applications.map(app => (
                      <tr key={app._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">{app.program?.name || L('알 수 없는 프로그램', 'Unknown Program')}</td>
                        <td className="px-4 py-3 text-gray-600">{new Date(app.createdAt).toLocaleDateString(locale)}</td>
                        <td className="px-4 py-3">
                          <Badge tone={getStatusTone(app.status)}>{statusLabel[app.status] || app.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* Bookmarks Tab */}
          {activeTab === "bookmarks" && (
            bookmarks.length === 0 ? (
              <Card><p className="text-gray-400 text-center py-6">{L('아직 찜한 채용공고가 없습니다.', "No saved jobs yet.")}</p></Card>
            ) : (
              <div className="grid gap-3">
                {bookmarks.map(bm => (
                  <Card key={bm._id}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{bm.jobData?.title || L('알 수 없는 채용', 'Unknown Job')}</p>
                        <p className="text-sm text-blue-600">{bm.jobData?.company}</p>
                        <p className="text-xs text-gray-500">{bm.jobData?.location}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveBookmark(bm._id)}
                        className="rounded bg-red-50 px-3 py-1 text-sm text-red-700 hover:bg-red-100 border border-red-100"
                      >
                        {L('삭제', 'Remove')}
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            )
          )}

          {/* Consultations Tab */}
          {activeTab === "consultations" && (
            consultations.length === 0 ? (
              <Card><p className="text-gray-400 text-center py-6">{L('아직 예약한 상담이 없습니다.', "No consultations booked yet.")}</p></Card>
            ) : (
              <div className="grid gap-3">
                {consultations.map(booking => (
                  <Card key={booking._id}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900">{booking.slot?.topic || 'Consultation'}</p>
                        <p className="text-sm text-gray-600 mt-0.5">
                          {L('상담사', 'With')}: {booking.instructor?.name || L('알 수 없음', 'Unknown')}
                        </p>
                        {booking.slot && (
                          <p className="text-sm text-gray-500">
                            {new Date(booking.slot.date).toLocaleDateString(locale)} {booking.slot.startTime} – {booking.slot.endTime}
                          </p>
                        )}
                        {booking.meetingLink && booking.status === "approved" && (
                          <a href={booking.meetingLink} target="_blank" rel="noopener noreferrer"
                            className="mt-2 inline-block text-sm text-blue-600 hover:underline">
                            {L('미팅 참여', 'Join Meeting')} →
                          </a>
                        )}
                        {user?.role === 'instructor' && booking.status === 'pending' && (
                          <div className="mt-3 flex gap-2">
                            <button className="rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700" onClick={async () => {
                              const meetingLink = prompt(L('미팅 링크 (선택사항)', 'Meeting link (optional)')) || '';
                              const res = await fetch('/api/consultation/bookings', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ bookingId: booking._id, action: 'approve', meetingLink }) });
                              if (res.ok) { const d = await res.json(); setConsultations(cs => cs.map(c => c._id === d._id ? { ...d, slot: d.slotId ? { _id: d.slotId._id, date: new Date(d.slotId.startsAt).toISOString().slice(0,10), startTime: new Date(d.slotId.startsAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false }), endTime: new Date(d.slotId.endsAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false }), topic: d.slotId.topic } : null, instructor: d.instructorId } : c)); }
                            }}>{L('승인', 'Approve')}</button>
                            <button className="rounded bg-red-50 px-3 py-1 text-sm text-red-700 hover:bg-red-100 border border-red-100" onClick={async () => {
                              const res = await fetch('/api/consultation/bookings', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ bookingId: booking._id, action: 'reject' }) });
                              if (res.ok) { const d = await res.json(); setConsultations(cs => cs.map(c => c._id === d._id ? { ...d, slot: d.slotId ? { _id: d.slotId._id, date: new Date(d.slotId.startsAt).toISOString().slice(0,10), startTime: new Date(d.slotId.startsAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false }), endTime: new Date(d.slotId.endsAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false }), topic: d.slotId.topic } : null, instructor: d.instructorId } : c)); }
                            }}>{L('거절', 'Reject')}</button>
                          </div>
                        )}
                      </div>
                      <Badge tone={getStatusTone(booking.status)}>{statusLabel[booking.status] || booking.status}</Badge>
                    </div>
                  </Card>
                ))}
              </div>
            )
          )}

          {/* Resume Tab */}
          {activeTab === "resume" && (
            <Card>
              {editingResume ? (
                <div className="grid gap-4">
                  <h3 className="font-semibold text-gray-900">{L('이력서 편집', 'Edit Your Resume')}</h3>
                  {[
                    { key: 'summary', label: L('자기소개', 'Summary'), placeholder: L('간단한 자기소개...', 'Brief professional summary...'), rows: 3 },
                    { key: 'experience', label: L('경력', 'Experience'), placeholder: L('경력 사항...', 'Your work experience...'), rows: 5 },
                    { key: 'skills', label: L('기술/스킬', 'Skills'), placeholder: L('기술 (쉼표로 구분)...', 'Skills (comma separated)...'), rows: 3 },
                  ].map(({ key, label, placeholder, rows }) => (
                    <div key={key}>
                      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
                      <textarea
                        value={resumeForm[key as keyof typeof resumeForm]}
                        onChange={e => setResumeForm({ ...resumeForm, [key]: e.target.value })}
                        className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={rows}
                        placeholder={placeholder}
                      />
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <button onClick={handleSaveResume} disabled={saving}
                      className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50">
                      {saving ? L('저장 중...', 'Saving...') : L('저장', 'Save')}
                    </button>
                    <button onClick={() => setEditingResume(false)}
                      className="rounded border px-4 py-2 text-sm hover:bg-gray-50">
                      {L('취소', 'Cancel')}
                    </button>
                  </div>
                </div>
              ) : resume ? (
                <div className="grid gap-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">{L('이력서', 'Your Resume')}</h3>
                    <button onClick={() => setEditingResume(true)}
                      className="rounded bg-gray-100 px-3 py-1 text-sm hover:bg-gray-200">
                      {L('편집', 'Edit')}
                    </button>
                  </div>
                  {[
                    { label: L('자기소개', 'Summary'), value: resume.summary },
                    { label: L('경력', 'Experience'), value: resume.experience },
                    { label: L('기술/스킬', 'Skills'), value: resume.skills },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-sm font-medium text-gray-700">{label}</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">{value || L('미입력', 'Not provided')}</p>
                    </div>
                  ))}
                  <p className="text-xs text-gray-400">{L('최종 수정일', 'Last updated')}: {new Date(resume.updatedAt).toLocaleDateString(locale)}</p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">{L('아직 이력서가 없습니다.', "You haven't created a resume yet.")}</p>
                  <button onClick={() => setEditingResume(true)}
                    className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
                    {L('이력서 작성', 'Create Resume')}
                  </button>
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="grid gap-4 content-start">
          {/* Activity Summary */}
          <Card>
            <h3 className="font-bold text-gray-900 mb-3">{L('활동 요약', 'Activity Summary')}</h3>
            <div className="grid gap-3">
              <div className="flex items-center justify-between py-2 border-b last:border-0">
                <span className="text-sm text-gray-600">{L('총 지원', 'Total Applied')}</span>
                <span className="font-bold text-blue-700 text-lg">{applications.length}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b last:border-0">
                <span className="text-sm text-gray-600">{L('승인 완료', 'Approved')}</span>
                <span className="font-bold text-green-700 text-lg">{approvedApps}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b last:border-0">
                <span className="text-sm text-gray-600">{L('대기중', 'Pending')}</span>
                <span className="font-bold text-orange-600 text-lg">{pendingApps}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-600">{L('상담 예약', 'Consultations')}</span>
                <span className="font-bold text-purple-700 text-lg">{consultations.length}</span>
              </div>
            </div>
          </Card>

          {/* Next Schedule */}
          <Card>
            <h3 className="font-bold text-gray-900 mb-3">{L('다음 일정', 'Next Schedule')}</h3>
            {nextBooking ? (
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-sm font-semibold text-blue-900">{nextBooking.slot?.topic || 'Consultation'}</p>
                <p className="text-xs text-blue-700 mt-1">
                  {nextBooking.slot && new Date(nextBooking.slot.date).toLocaleDateString(locale)}
                </p>
                <p className="text-xs text-blue-600">
                  {nextBooking.slot?.startTime} – {nextBooking.slot?.endTime}
                </p>
                <p className="text-xs text-gray-500 mt-1">{nextBooking.instructor?.name}</p>
                <div className="mt-2">
                  <Badge tone={getStatusTone(nextBooking.status)}>{statusLabel[nextBooking.status] || nextBooking.status}</Badge>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400">{L('예정된 일정이 없습니다.', 'No upcoming schedule.')}</p>
            )}
          </Card>

          {/* Saved Jobs count */}
          <Card>
            <h3 className="font-bold text-gray-900 mb-2">{L('찜한 채용', 'Saved Jobs')}</h3>
            <p className="text-sm text-gray-600 mb-3">
              {L(`${bookmarks.length}개의 채용공고를 저장했습니다.`, `${bookmarks.length} job${bookmarks.length !== 1 ? 's' : ''} saved.`)}
            </p>
            <button onClick={() => setActiveTab('bookmarks')}
              className="text-sm text-blue-600 hover:underline font-medium">
              {L('저장 목록 보기 →', 'View saved jobs →')}
            </button>
          </Card>
        </div>
      </div>
    </div>
  );
}
