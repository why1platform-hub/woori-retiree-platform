"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card, Badge } from "@/components/UI";

interface Application {
  _id: string;
  program: {
    _id: string;
    name: string;
    category: string;
  };
  status: string;
  createdAt: string;
}

interface Bookmark {
  _id: string;
  job: string;
  jobData?: {
    _id: string;
    title: string;
    company: string;
    location: string;
  };
  createdAt: string;
}

interface ConsultationBooking {
  _id: string;
  slot: {
    _id: string;
    instructor: {
      name: string;
    };
    date: string;
    startTime: string;
    endTime: string;
    topic: string;
  };
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

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export default function MyActivityPage() {
  const tNav = useTranslations("nav");
  const locale = useLocale();
  const [applications, setApplications] = useState<Application[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [consultations, setConsultations] = useState<ConsultationBooking[]>([]);
  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"applications" | "bookmarks" | "consultations" | "resume">("applications");
  const [user, setUser] = useState<User | null>(null);

  // Resume form state
  const [editingResume, setEditingResume] = useState(false);
  const [resumeForm, setResumeForm] = useState({ summary: "", experience: "", skills: "" });
  const [saving, setSaving] = useState(false);

  // Translations
  const t = {
    title: locale === 'ko' ? '내 활동' : 'My Activity',
    loading: locale === 'ko' ? '로딩 중...' : 'Loading...',
    tabs: {
      applications: locale === 'ko' ? '지원 현황' : 'Applications',
      bookmarks: locale === 'ko' ? '찜한 채용' : 'Bookmarked Jobs',
      consultations: locale === 'ko' ? '상담 예약' : 'Consultations',
      resume: locale === 'ko' ? '이력서' : 'My Resume',
    },
    applications: {
      empty: locale === 'ko' ? '아직 지원한 프로그램이 없습니다.' : "You haven't applied to any programs yet.",
      applied: locale === 'ko' ? '지원일' : 'Applied',
      unknownProgram: locale === 'ko' ? '알 수 없는 프로그램' : 'Unknown Program',
    },
    bookmarks: {
      empty: locale === 'ko' ? '아직 찜한 채용공고가 없습니다.' : "You haven't bookmarked any jobs yet.",
      remove: locale === 'ko' ? '삭제' : 'Remove',
      unknownJob: locale === 'ko' ? '알 수 없는 채용' : 'Unknown Job',
    },
    consultations: {
      empty: locale === 'ko' ? '아직 예약한 상담이 없습니다.' : "You haven't booked any consultations yet.",
      with: locale === 'ko' ? '상담사' : 'With',
      joinMeeting: locale === 'ko' ? '미팅 참여' : 'Join Meeting',
      approve: locale === 'ko' ? '승인' : 'Approve',
      reject: locale === 'ko' ? '거절' : 'Reject',
      unknown: locale === 'ko' ? '알 수 없음' : 'Unknown',
    },
    resume: {
      title: locale === 'ko' ? '이력서' : 'Your Resume',
      edit: locale === 'ko' ? '편집' : 'Edit',
      editTitle: locale === 'ko' ? '이력서 편집' : 'Edit Your Resume',
      summary: locale === 'ko' ? '자기소개' : 'Summary',
      summaryPlaceholder: locale === 'ko' ? '간단한 자기소개...' : 'Brief professional summary...',
      experience: locale === 'ko' ? '경력' : 'Experience',
      experiencePlaceholder: locale === 'ko' ? '경력 사항...' : 'Your work experience...',
      skills: locale === 'ko' ? '기술/스킬' : 'Skills',
      skillsPlaceholder: locale === 'ko' ? '기술 (쉼표로 구분)...' : 'Your skills (comma separated)...',
      save: locale === 'ko' ? '저장' : 'Save',
      saving: locale === 'ko' ? '저장 중...' : 'Saving...',
      cancel: locale === 'ko' ? '취소' : 'Cancel',
      notProvided: locale === 'ko' ? '미입력' : 'Not provided',
      lastUpdated: locale === 'ko' ? '최종 수정일' : 'Last updated',
      empty: locale === 'ko' ? '아직 이력서가 없습니다.' : "You haven't created a resume yet.",
      create: locale === 'ko' ? '이력서 작성' : 'Create Resume',
    },
    status: {
      approved: locale === 'ko' ? '승인됨' : 'approved',
      pending: locale === 'ko' ? '대기중' : 'pending',
      rejected: locale === 'ko' ? '거절됨' : 'rejected',
      cancelled: locale === 'ko' ? '취소됨' : 'cancelled',
      done: locale === 'ko' ? '완료' : 'done',
    },
  };

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

        if (appsRes.ok) {
          const data = await appsRes.json();
          setApplications(data.applications || []);
        }

        if (bookmarksRes.ok) {
          const data = await bookmarksRes.json();
          setBookmarks(data.bookmarks || []);
        }

        if (consultRes.ok) {
          const data = await consultRes.json();
          const normalized = (data.bookings || []).map((b: any) => {
            const slot = b.slotId ? {
              _id: b.slotId._id,
              date: new Date(b.slotId.startsAt).toISOString().slice(0,10),
              startTime: new Date(b.slotId.startsAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false }),
              endTime: new Date(b.slotId.endsAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false }),
              topic: b.slotId.topic || 'General',
            } : null;
            const instructor = b.instructorId ? { name: b.instructorId.name, email: b.instructorId.email } : { name: t.consultations.unknown };
            return { ...b, slot, instructor };
          });
          setConsultations(normalized || []);
        }

        if (resumeRes.ok) {
          const data = await resumeRes.json();
          if (data.resume) {
            setResume(data.resume);
            setResumeForm({
              summary: data.resume.summary || "",
              experience: data.resume.experience || "",
              skills: data.resume.skills || "",
            });
          }
        }

        if (meRes.ok) {
          const data = await meRes.json();
          if (data.user) setUser(data.user);
        }
      } catch (error) {
        console.error("Error fetching activity data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [locale]);

  const handleRemoveBookmark = async (bookmarkId: string) => {
    try {
      const res = await fetch(`/api/bookmarks?id=${bookmarkId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setBookmarks(bookmarks.filter((b) => b._id !== bookmarkId));
      }
    } catch (error) {
      console.error("Error removing bookmark:", error);
    }
  };

  const handleSaveResume = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/resume", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resumeForm),
      });
      if (res.ok) {
        const data = await res.json();
        setResume(data.resume);
        setEditingResume(false);
      }
    } catch (error) {
      console.error("Error saving resume:", error);
    } finally {
      setSaving(false);
    }
  };

  const getStatusTone = (status: string): "green" | "orange" | "gray" | "blue" => {
    switch (status) {
      case "approved":
      case "done":
        return "green";
      case "pending":
        return "orange";
      case "rejected":
      case "cancelled":
        return "gray";
      default:
        return "blue";
    }
  };

  const getStatusLabel = (status: string): string => {
    return (t.status as any)[status] || status;
  };

  if (loading) {
    return (
      <div className="grid gap-4">
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <p className="text-gray-600">{t.loading}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-bold">{t.title}</h1>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b">
        <button
          onClick={() => setActiveTab("applications")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "applications"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          {t.tabs.applications} ({applications.length})
        </button>
        <button
          onClick={() => setActiveTab("bookmarks")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "bookmarks"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          {t.tabs.bookmarks} ({bookmarks.length})
        </button>
        <button
          onClick={() => setActiveTab("consultations")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "consultations"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          {t.tabs.consultations} ({consultations.length})
        </button>
        <button
          onClick={() => setActiveTab("resume")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "resume"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          {t.tabs.resume}
        </button>
      </div>

      {/* Applications Tab */}
      {activeTab === "applications" && (
        <>
          {applications.length === 0 ? (
            <Card>
              <p className="text-gray-500">{t.applications.empty}</p>
            </Card>
          ) : (
            <div className="grid gap-3">
              {applications.map((app) => (
                <Card key={app._id}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{app.program?.name || t.applications.unknownProgram}</h3>
                      <p className="text-sm text-gray-500">
                        {t.applications.applied}: {new Date(app.createdAt).toLocaleDateString(locale)}
                      </p>
                    </div>
                    <Badge tone={getStatusTone(app.status)}>{getStatusLabel(app.status)}</Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Bookmarks Tab */}
      {activeTab === "bookmarks" && (
        <>
          {bookmarks.length === 0 ? (
            <Card>
              <p className="text-gray-500">{t.bookmarks.empty}</p>
            </Card>
          ) : (
            <div className="grid gap-3">
              {bookmarks.map((bookmark) => (
                <Card key={bookmark._id}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{bookmark.jobData?.title || t.bookmarks.unknownJob}</h3>
                      <p className="text-sm text-blue-600">{bookmark.jobData?.company}</p>
                      <p className="text-xs text-gray-500">{bookmark.jobData?.location}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveBookmark(bookmark._id)}
                      className="rounded bg-red-100 px-3 py-1 text-sm text-red-800 hover:bg-red-200"
                    >
                      {t.bookmarks.remove}
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Consultations Tab */}
      {activeTab === "consultations" && (
        <>
          {consultations.length === 0 ? (
            <Card>
              <p className="text-gray-500">{t.consultations.empty}</p>
            </Card>
          ) : (
            <div className="grid gap-3">
              {consultations.map((booking) => (
                <Card key={booking._id}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{booking.slot?.topic || "Consultation"}</h3>
                      <p className="text-sm text-gray-600">
                        {t.consultations.with}: {booking.slot?.instructor?.name || t.consultations.unknown}
                      </p>
                      <p className="text-sm text-gray-500">
                        {booking.slot?.date && new Date(booking.slot.date).toLocaleDateString(locale)}{" "}
                        {booking.slot?.startTime} - {booking.slot?.endTime}
                      </p>
                      {booking.meetingLink && booking.status === "approved" && (
                        <a
                          href={booking.meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-block text-sm text-blue-600 hover:underline"
                        >
                          {t.consultations.joinMeeting}
                        </a>
                      )}

                      {/* Instructor controls to approve/reject */}
                      {user && user.role === 'instructor' && booking.status === 'pending' && (
                        <div className="mt-3 flex gap-2">
                          <button className="rounded bg-green-600 px-3 py-1 text-white" onClick={async () => {
                            const meetingLink = prompt(locale === 'ko' ? '미팅 링크 (선택사항)' : 'Meeting link (optional)') || '';
                            const res = await fetch('/api/consultation/bookings', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ bookingId: booking._id, action: 'approve', meetingLink }) });
                            const d = await res.json();
                            if (res.ok) {
                              const slot = d.slotId ? { _id: d.slotId._id, date: new Date(d.slotId.startsAt).toISOString().slice(0,10), startTime: new Date(d.slotId.startsAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false }), endTime: new Date(d.slotId.endsAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false }), topic: d.slotId.topic } : null;
                              const updated = { ...d, slot, instructor: d.instructorId };
                              setConsultations(consultations.map(c => c._id === updated._id ? updated : c));
                            } else {
                              alert(locale === 'ko' ? '승인 실패' : 'Failed to approve');
                            }
                          }}>{t.consultations.approve}</button>
                          <button className="rounded bg-red-100 px-3 py-1" onClick={async () => {
                            const res = await fetch('/api/consultation/bookings', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ bookingId: booking._id, action: 'reject' }) });
                            const d = await res.json();
                            if (res.ok) {
                              const slot = d.slotId ? { _id: d.slotId._id, date: new Date(d.slotId.startsAt).toISOString().slice(0,10), startTime: new Date(d.slotId.startsAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false }), endTime: new Date(d.slotId.endsAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false }), topic: d.slotId.topic } : null;
                              const updated = { ...d, slot, instructor: d.instructorId };
                              setConsultations(consultations.map(c => c._id === updated._id ? updated : c));
                            } else {
                              alert(locale === 'ko' ? '거절 실패' : 'Failed to reject');
                            }
                          }}>{t.consultations.reject}</button>
                        </div>
                      )}
                    </div>
                    <Badge tone={getStatusTone(booking.status)}>{getStatusLabel(booking.status)}</Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Resume Tab */}
      {activeTab === "resume" && (
        <Card>
          {editingResume ? (
            <div className="grid gap-4">
              <h3 className="font-semibold">{t.resume.editTitle}</h3>
              <div>
                <label className="mb-1 block text-sm font-medium">{t.resume.summary}</label>
                <textarea
                  value={resumeForm.summary}
                  onChange={(e) => setResumeForm({ ...resumeForm, summary: e.target.value })}
                  className="w-full rounded border px-3 py-2"
                  rows={3}
                  placeholder={t.resume.summaryPlaceholder}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{t.resume.experience}</label>
                <textarea
                  value={resumeForm.experience}
                  onChange={(e) => setResumeForm({ ...resumeForm, experience: e.target.value })}
                  className="w-full rounded border px-3 py-2"
                  rows={5}
                  placeholder={t.resume.experiencePlaceholder}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{t.resume.skills}</label>
                <textarea
                  value={resumeForm.skills}
                  onChange={(e) => setResumeForm({ ...resumeForm, skills: e.target.value })}
                  className="w-full rounded border px-3 py-2"
                  rows={3}
                  placeholder={t.resume.skillsPlaceholder}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveResume}
                  disabled={saving}
                  className="rounded bg-blue-700 px-4 py-2 text-white hover:bg-blue-800 disabled:opacity-50"
                >
                  {saving ? t.resume.saving : t.resume.save}
                </button>
                <button
                  onClick={() => setEditingResume(false)}
                  className="rounded border px-4 py-2 hover:bg-gray-50"
                >
                  {t.resume.cancel}
                </button>
              </div>
            </div>
          ) : resume ? (
            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{t.resume.title}</h3>
                <button
                  onClick={() => setEditingResume(true)}
                  className="rounded bg-gray-100 px-3 py-1 text-sm hover:bg-gray-200"
                >
                  {t.resume.edit}
                </button>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">{t.resume.summary}</p>
                <p className="mt-1 text-gray-600">{resume.summary || t.resume.notProvided}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">{t.resume.experience}</p>
                <p className="mt-1 whitespace-pre-wrap text-gray-600">
                  {resume.experience || t.resume.notProvided}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">{t.resume.skills}</p>
                <p className="mt-1 text-gray-600">{resume.skills || t.resume.notProvided}</p>
              </div>
              <p className="text-xs text-gray-400">
                {t.resume.lastUpdated}: {new Date(resume.updatedAt).toLocaleDateString(locale)}
              </p>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-gray-500 mb-4">{t.resume.empty}</p>
              <button
                onClick={() => setEditingResume(true)}
                className="rounded bg-blue-700 px-4 py-2 text-white hover:bg-blue-800"
              >
                {t.resume.create}
              </button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
