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
  job: {
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
  const t = useTranslations("nav");
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
            const instructor = b.instructorId ? { name: b.instructorId.name, email: b.instructorId.email } : { name: 'Unknown' };
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
          // store role in the user state
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

  if (loading) {
    return (
      <div className="grid gap-4">
        <h1 className="text-2xl font-bold">{t("myActivity")}</h1>
        <p className="text-gray-600">Loading your activity...</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-bold">{t("myActivity")}</h1>

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
          Applications ({applications.length})
        </button>
        <button
          onClick={() => setActiveTab("bookmarks")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "bookmarks"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Bookmarked Jobs ({bookmarks.length})
        </button>
        <button
          onClick={() => setActiveTab("consultations")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "consultations"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Consultations ({consultations.length})
        </button>
        <button
          onClick={() => setActiveTab("resume")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "resume"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          My Resume
        </button>
      </div>

      {/* Applications Tab */}
      {activeTab === "applications" && (
        <>
          {applications.length === 0 ? (
            <Card>
              <p className="text-gray-500">You haven&apos;t applied to any programs yet.</p>
            </Card>
          ) : (
            <div className="grid gap-3">
              {applications.map((app) => (
                <Card key={app._id}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{app.program?.name || "Unknown Program"}</h3>
                      <p className="text-sm text-gray-500">
                        Applied: {new Date(app.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge tone={getStatusTone(app.status)}>{app.status}</Badge>
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
              <p className="text-gray-500">You haven&apos;t bookmarked any jobs yet.</p>
            </Card>
          ) : (
            <div className="grid gap-3">
              {bookmarks.map((bookmark) => (
                <Card key={bookmark._id}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{bookmark.job?.title || "Unknown Job"}</h3>
                      <p className="text-sm text-blue-600">{bookmark.job?.company}</p>
                      <p className="text-xs text-gray-500">{bookmark.job?.location}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveBookmark(bookmark._id)}
                      className="rounded bg-red-100 px-3 py-1 text-sm text-red-800 hover:bg-red-200"
                    >
                      Remove
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
              <p className="text-gray-500">You haven&apos;t booked any consultations yet.</p>
            </Card>
          ) : (
            <div className="grid gap-3">
              {consultations.map((booking) => (
                <Card key={booking._id}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{booking.slot?.topic || "Consultation"}</h3>
                      <p className="text-sm text-gray-600">
                        With: {booking.slot?.instructor?.name || "Unknown"}
                      </p>
                      <p className="text-sm text-gray-500">
                        {booking.slot?.date && new Date(booking.slot.date).toLocaleDateString()}{" "}
                        {booking.slot?.startTime} - {booking.slot?.endTime}
                      </p>
                      {booking.meetingLink && booking.status === "approved" && (
                        <a
                          href={booking.meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-block text-sm text-blue-600 hover:underline"
                        >
                          Join Meeting
                        </a>
                      )}

                      {/* Instructor controls to approve/reject */}
                      {user && user.role === 'instructor' && booking.status === 'pending' && (
                        <div className="mt-3 flex gap-2">
                          <button className="rounded bg-green-600 px-3 py-1 text-white" onClick={async () => {
                            const meetingLink = prompt('Meeting link (optional)') || '';
                            const res = await fetch('/api/consultation/bookings', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ bookingId: booking._id, action: 'approve', meetingLink }) });
                            const d = await res.json();
                            if (res.ok) {
                              // normalize returned booking
                              const slot = d.slotId ? { _id: d.slotId._id, date: new Date(d.slotId.startsAt).toISOString().slice(0,10), startTime: new Date(d.slotId.startsAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false }), endTime: new Date(d.slotId.endsAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false }), topic: d.slotId.topic } : null;
                              const updated = { ...d, slot, instructor: d.instructorId };
                              setConsultations(consultations.map(c => c._id === updated._id ? updated : c));
                            } else {
                              alert('Failed to approve');
                            }
                          }}>Approve</button>
                          <button className="rounded bg-red-100 px-3 py-1" onClick={async () => {
                            const res = await fetch('/api/consultation/bookings', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ bookingId: booking._id, action: 'reject' }) });
                            const d = await res.json();
                            if (res.ok) {
                              const slot = d.slotId ? { _id: d.slotId._id, date: new Date(d.slotId.startsAt).toISOString().slice(0,10), startTime: new Date(d.slotId.startsAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false }), endTime: new Date(d.slotId.endsAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false }), topic: d.slotId.topic } : null;
                              const updated = { ...d, slot, instructor: d.instructorId };
                              setConsultations(consultations.map(c => c._id === updated._id ? updated : c));
                            } else {
                              alert('Failed to reject');
                            }
                          }}>Reject</button>
                        </div>
                      )}
                    </div>
                    <Badge tone={getStatusTone(booking.status)}>{booking.status}</Badge>
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
              <h3 className="font-semibold">Edit Your Resume</h3>
              <div>
                <label className="mb-1 block text-sm font-medium">Summary</label>
                <textarea
                  value={resumeForm.summary}
                  onChange={(e) => setResumeForm({ ...resumeForm, summary: e.target.value })}
                  className="w-full rounded border px-3 py-2"
                  rows={3}
                  placeholder="Brief professional summary..."
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Experience</label>
                <textarea
                  value={resumeForm.experience}
                  onChange={(e) => setResumeForm({ ...resumeForm, experience: e.target.value })}
                  className="w-full rounded border px-3 py-2"
                  rows={5}
                  placeholder="Your work experience..."
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Skills</label>
                <textarea
                  value={resumeForm.skills}
                  onChange={(e) => setResumeForm({ ...resumeForm, skills: e.target.value })}
                  className="w-full rounded border px-3 py-2"
                  rows={3}
                  placeholder="Your skills (comma separated)..."
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveResume}
                  disabled={saving}
                  className="rounded bg-blue-700 px-4 py-2 text-white hover:bg-blue-800 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => setEditingResume(false)}
                  className="rounded border px-4 py-2 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : resume ? (
            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Your Resume</h3>
                <button
                  onClick={() => setEditingResume(true)}
                  className="rounded bg-gray-100 px-3 py-1 text-sm hover:bg-gray-200"
                >
                  Edit
                </button>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Summary</p>
                <p className="mt-1 text-gray-600">{resume.summary || "Not provided"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Experience</p>
                <p className="mt-1 whitespace-pre-wrap text-gray-600">
                  {resume.experience || "Not provided"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Skills</p>
                <p className="mt-1 text-gray-600">{resume.skills || "Not provided"}</p>
              </div>
              <p className="text-xs text-gray-400">
                Last updated: {new Date(resume.updatedAt).toLocaleDateString()}
              </p>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-gray-500 mb-4">You haven&apos;t created a resume yet.</p>
              <button
                onClick={() => setEditingResume(true)}
                className="rounded bg-blue-700 px-4 py-2 text-white hover:bg-blue-800"
              >
                Create Resume
              </button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
