"use client";

import { useEffect, useState, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card, Badge, Button, Input, Textarea } from "@/components/UI";
import TimeSelect from "@/components/TimeSelect";
import dynamic from 'next/dynamic';
import { PlatformSettingsComponent } from "@/components/PlatformSettings";
const ChatModal = dynamic(() => import('@/components/ChatModal'), { ssr: false });

type Tab = "settings" | "users" | "notices" | "programs" | "jobs" | "courses" | "faqs" | "inquiries" | "consultations";

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  bio?: string;
  organization?: string;
  createdAt?: string;
  passwordResetRequested?: boolean;
}

interface Notice {
  _id: string;
  title: string;
  body: string;
  badge: "info" | "urgent";
  publishedAt: string;
}

interface Program {
  _id: string;
  name: string;
  category: string;
  description: string;
  startDate: string;
  endDate: string;
  status: string;
}

interface Job {
  _id: string;
  company: string;
  title: string;
  location: string;
  employmentType: string;
  salary: string;
  requirements: string;
  applyUrl?: string;
}

interface Course {
  _id: string;
  title: string;
  category: string;
  description?: string;
  durationMinutes: number;
  thumbnailUrl?: string;
  videoUrl: string;
  views: number;
  instructor: { _id: string; name: string };
}

interface Faq {
  _id: string;
  question: string;
  answer: string;
}

interface Inquiry {
  _id: string;
  userId: { name: string; email: string };
  subject: string;
  message: string;
  status: string;
  reply?: string;
  createdAt: string;
}

interface ConsultationSlot {
  _id: string;
  instructorId: { _id: string; name: string; email: string };
  startsAt: string;
  endsAt: string;
  topic: string;
  isBooked: boolean;
}

interface ConsultationBooking {
  _id: string;
  userId: { _id: string; name: string; email: string };
  instructorId: { _id: string; name: string; email: string };
  slotId: { _id: string; startsAt: string; endsAt: string; topic: string };
  status: string;
  meetingLink?: string;
  createdAt: string;
}

interface Instructor {
  _id: string;
  name: string;
  email: string;
}

interface CategoryItem {
  _id: string;
  name: string;
  label: string;
  order: number;
}

export default function AdminPage() {
  const t = useTranslations("admin");
  const locale = useLocale();
  const [activeTab, setActiveTab] = useState<Tab>("settings");
  const [loading, setLoading] = useState(true);

  // Data states
  const [users, setUsers] = useState<User[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [slots, setSlots] = useState<ConsultationSlot[]>([]);
  const [bookings, setBookings] = useState<ConsultationBooking[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);

  // Search/filter states
  const [userSearch, setUserSearch] = useState("");
  const [noticeSearch, setNoticeSearch] = useState("");
  const [programSearch, setProgramSearch] = useState("");
  const [programCategoryFilter, setProgramCategoryFilter] = useState("");
  const [programStatusFilter, setProgramStatusFilter] = useState("");
  const [jobSearch, setJobSearch] = useState("");
  const [courseSearch, setCourseSearch] = useState("");
  const [courseCategoryFilter, setCourseCategoryFilter] = useState("");
  const [inquirySearch, setInquirySearch] = useState("");
  const [consultationSearch, setConsultationSearch] = useState("");

  // Category management
  const [categoryForm, setCategoryForm] = useState({ name: "", label: "" });
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [categoryEditForm, setCategoryEditForm] = useState({ name: "", label: "", order: 0 });

  // Form states
  const [userForm, setUserForm] = useState({ name: "", email: "", password: "", role: "user" });
  const [noticeForm, setNoticeForm] = useState({ title: "", body: "", badge: "info" });
  const [programForm, setProgramForm] = useState({
    name: "", category: "", description: "", startDate: "", endDate: "", status: "upcoming"
  });
  const [jobForm, setJobForm] = useState({
    company: "", title: "", location: "", employmentType: "Full-time", salary: "", requirements: "", applyUrl: ""
  });
  const [faqForm, setFaqForm] = useState({ question: "", answer: "" });

  // Slot form state
  const [slotForm, setSlotForm] = useState({
    instructorId: "", date: "", startTime: "09:00", endTime: "17:00", topic: "General"
  });

  // Course edit state
  const [editingCourse, setEditingCourse] = useState<string | null>(null);
  const [courseEditForm, setCourseEditForm] = useState({
    title: "", category: "finance", description: "", durationMinutes: 30, thumbnailUrl: "", videoUrl: ""
  });

  // Edit states
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [userEditForm, setUserEditForm] = useState({ name: "", email: "", phone: "", bio: "", organization: "", role: "" });
  const [chatUser, setChatUser] = useState<string | null>(null);
  const [editingJob, setEditingJob] = useState<string | null>(null);
  const [editingFaq, setEditingFaq] = useState<string | null>(null);
  const [respondingInquiry, setRespondingInquiry] = useState<string | null>(null);
  const [inquiryResponse, setInquiryResponse] = useState("");
  const [editingBooking, setEditingBooking] = useState<string | null>(null);
  const [editingSlot, setEditingSlot] = useState<string | null>(null);
  const [slotEditForm, setSlotEditForm] = useState({ startsAt: "", endsAt: "", topic: "" });
  const [bookingEditForm, setBookingEditForm] = useState({ status: "", meetingLink: "", instructorId: "", slotId: "" });

  const [loadedTabs, setLoadedTabs] = useState<Set<Tab>>(new Set());

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchTabData(activeTab);
  }, [activeTab]);

  async function fetchCategories() {
    try {
      const res = await fetch("/api/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
        // Set default category for program form if empty
        if (!programForm.category && data.categories?.length > 0) {
          setProgramForm(prev => ({ ...prev, category: data.categories[0].name }));
        }
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  }

  async function fetchTabData(tab: Tab) {
    setLoading(true);
    try {
      switch (tab) {
        case "users": {
          const res = await fetch("/api/admin/users");
          if (res.ok) setUsers((await res.json()).users || []);
          break;
        }
        case "notices": {
          const res = await fetch("/api/notices");
          if (res.ok) setNotices((await res.json()).notices || []);
          break;
        }
        case "programs": {
          const res = await fetch("/api/programs");
          if (res.ok) setPrograms((await res.json()).programs || []);
          break;
        }
        case "jobs": {
          const res = await fetch("/api/jobs");
          if (res.ok) setJobs((await res.json()).jobs || []);
          break;
        }
        case "courses": {
          const res = await fetch("/api/courses");
          if (res.ok) setCourses((await res.json()).courses || []);
          break;
        }
        case "faqs": {
          const res = await fetch("/api/support/faq");
          if (res.ok) setFaqs((await res.json()).faqs || []);
          break;
        }
        case "inquiries": {
          const res = await fetch("/api/support/inquiries?all=true");
          if (res.ok) setInquiries((await res.json()).inquiries || []);
          break;
        }
        case "consultations": {
          const [slotsRes, bookingsRes, insRes] = await Promise.all([
            fetch('/api/consultation/slots'),
            fetch('/api/consultation/bookings'),
            fetch('/api/instructors'),
          ]);
          if (slotsRes.ok) setSlots((await slotsRes.json()).slots || []);
          if (bookingsRes.ok) setBookings((await bookingsRes.json()).bookings || []);
          if (insRes.ok) setInstructors((await insRes.json()).instructors || []);
          break;
        }
      }
      setLoadedTabs(prev => new Set(prev).add(tab));
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }

  // Filtered lists
  const filteredUsers = useMemo(() => {
    if (!userSearch) return users;
    const q = userSearch.toLowerCase();
    return users.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [users, userSearch]);

  const filteredNotices = useMemo(() => {
    if (!noticeSearch) return notices;
    const q = noticeSearch.toLowerCase();
    return notices.filter(n => n.title.toLowerCase().includes(q));
  }, [notices, noticeSearch]);

  const filteredPrograms = useMemo(() => {
    let list = programs;
    if (programSearch) {
      const q = programSearch.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
    }
    if (programCategoryFilter) {
      list = list.filter(p => p.category === programCategoryFilter);
    }
    if (programStatusFilter) {
      list = list.filter(p => p.status === programStatusFilter);
    }
    return list;
  }, [programs, programSearch, programCategoryFilter, programStatusFilter]);

  const filteredJobs = useMemo(() => {
    if (!jobSearch) return jobs;
    const q = jobSearch.toLowerCase();
    return jobs.filter(j => j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q));
  }, [jobs, jobSearch]);

  const filteredCourses = useMemo(() => {
    let list = courses;
    if (courseSearch) {
      const q = courseSearch.toLowerCase();
      list = list.filter(c => c.title.toLowerCase().includes(q));
    }
    if (courseCategoryFilter) {
      list = list.filter(c => c.category === courseCategoryFilter);
    }
    return list;
  }, [courses, courseSearch, courseCategoryFilter]);

  const filteredInquiries = useMemo(() => {
    if (!inquirySearch) return inquiries;
    const q = inquirySearch.toLowerCase();
    return inquiries.filter(i => i.subject.toLowerCase().includes(q));
  }, [inquiries, inquirySearch]);

  const filteredBookings = useMemo(() => {
    if (!consultationSearch) return bookings;
    const q = consultationSearch.toLowerCase();
    return bookings.filter(b =>
      (b.slotId?.topic || "").toLowerCase().includes(q) ||
      (b.instructorId?.name || "").toLowerCase().includes(q)
    );
  }, [bookings, consultationSearch]);

  const getCategoryLabel = (name: string) => {
    const cat = categories.find(c => c.name === name);
    return cat?.label || name;
  };

  // Category handlers
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...categoryForm, order: categories.length }),
    });
    if (res.ok) {
      const data = await res.json();
      setCategories([...categories, data.category]);
      setCategoryForm({ name: "", label: "" });
    } else {
      const err = await res.json().catch(() => null);
      alert(err?.message || "Failed to create category");
    }
  };

  const handleUpdateCategory = async (id: string) => {
    const res = await fetch("/api/categories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...categoryEditForm }),
    });
    if (res.ok) {
      const data = await res.json();
      setCategories(categories.map(c => c._id === id ? data.category : c));
      setEditingCategory(null);
      setCategoryEditForm({ name: "", label: "", order: 0 });
    } else {
      const err = await res.json().catch(() => null);
      alert(err?.message || "Failed to update category");
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm(locale === 'ko' ? '이 카테고리를 삭제하시겠습니까?' : 'Delete this category?')) return;
    const res = await fetch(`/api/categories?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setCategories(categories.filter(c => c._id !== id));
    } else {
      const err = await res.json().catch(() => null);
      alert(err?.message || "Failed to delete category");
    }
  };

  // User handlers
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userForm),
    });
    if (res.ok) {
      const data = await res.json();
      setUsers([...users, data.user]);
      setUserForm({ name: "", email: "", password: "", role: "user" });
    }
  };

  const handleUpdateUser = async (userId: string) => {
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        name: userEditForm.name,
        email: userEditForm.email,
        phone: userEditForm.phone,
        bio: userEditForm.bio,
        organization: userEditForm.organization,
        role: userEditForm.role
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setUsers(users.map(u => u._id === userId ? data.user : u));
      setEditingUser(null);
      setUserEditForm({ name: "", email: "", phone: "", bio: "", organization: "", role: "" });
    } else {
      const err = await res.json().catch(() => null);
      alert(err?.message || "Failed to update user");
    }
  };

  const handleResetPassword = async (userId: string) => {
    if (!confirm(locale === 'ko' ? '비밀번호를 초기화하시겠습니까?' : 'Reset password to default?')) return;
    const res = await fetch("/api/admin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) {
      const data = await res.json();
      setUsers(users.map(u => u._id === userId ? { ...u, passwordResetRequested: false } : u));
      alert(locale === 'ko' ? `비밀번호가 초기화되었습니다: ${data.newPassword}` : `Password reset to: ${data.newPassword}`);
    }
  };

  // Notice handlers
  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/notices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(noticeForm),
    });
    if (res.ok) {
      const data = await res.json();
      setNotices([data.notice, ...notices]);
      setNoticeForm({ title: "", body: "", badge: "info" });
    }
  };

  const handleDeleteNotice = async (id: string) => {
    if (!confirm("Delete this notice?")) return;
    const res = await fetch(`/api/notices?id=${id}`, { method: "DELETE" });
    if (res.ok) setNotices(notices.filter(n => n._id !== id));
  };

  // Program handlers
  const handleCreateProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/programs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(programForm),
    });
    if (res.ok) {
      const data = await res.json();
      setPrograms([...programs, data.program]);
      setProgramForm({ name: "", category: categories[0]?.name || "", description: "", startDate: "", endDate: "", status: "upcoming" });
    }
  };

  const handleDeleteProgram = async (id: string) => {
    if (!confirm("Delete this program?")) return;
    const res = await fetch(`/api/programs?id=${id}`, { method: "DELETE" });
    if (res.ok) setPrograms(programs.filter(p => p._id !== id));
  };

  // Job handlers
  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(jobForm),
    });
    if (res.ok) {
      const data = await res.json();
      setJobs([...jobs, data.job]);
      setJobForm({ company: "", title: "", location: "", employmentType: "Full-time", salary: "", requirements: "", applyUrl: "" });
    }
  };

  const handleDeleteJob = async (id: string) => {
    if (!confirm("Delete this job?")) return;
    const res = await fetch(`/api/jobs?id=${id}`, { method: "DELETE" });
    if (res.ok) setJobs(jobs.filter(j => j._id !== id));
  };

  // Course handlers
  const handleDeleteCourse = async (id: string) => {
    if (!confirm("Delete this course?")) return;
    const res = await fetch(`/api/courses?id=${id}`, { method: "DELETE" });
    if (res.ok) setCourses(courses.filter(c => c._id !== id));
  };

  const handleUpdateCourse = async (id: string) => {
    const payload: Record<string, unknown> = { id };
    if (courseEditForm.title) payload.title = courseEditForm.title;
    if (courseEditForm.category) payload.category = courseEditForm.category;
    if (courseEditForm.thumbnailUrl !== undefined) payload.thumbnailUrl = courseEditForm.thumbnailUrl;
    if (courseEditForm.videoUrl !== undefined) payload.videoUrl = courseEditForm.videoUrl;
    if (courseEditForm.durationMinutes && courseEditForm.durationMinutes >= 1) {
      payload.durationMin = courseEditForm.durationMinutes;
    }

    const res = await fetch("/api/courses", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const updated = await res.json();
      setCourses(courses.map(c => c._id === id ? { ...c, ...updated } : c));
      setEditingCourse(null);
      setCourseEditForm({ title: "", category: "finance", description: "", durationMinutes: 30, thumbnailUrl: "", videoUrl: "" });
    } else {
      const err = await res.json();
      alert(err.message || "Failed to update course");
    }
  };

  // FAQ handlers
  const handleCreateFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/support/faq", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(faqForm),
    });
    if (res.ok) {
      const data = await res.json();
      setFaqs([...faqs, data.faq]);
      setFaqForm({ question: "", answer: "" });
    }
  };

  const handleDeleteFaq = async (id: string) => {
    if (!confirm("Delete this FAQ?")) return;
    const res = await fetch(`/api/support/faq?id=${id}`, { method: "DELETE" });
    if (res.ok) setFaqs(faqs.filter(f => f._id !== id));
  };

  // Inquiry handlers
  const handleRespondInquiry = async (id: string) => {
    const res = await fetch("/api/support/inquiries", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inquiryId: id, reply: inquiryResponse }),
    });
    if (res.ok) {
      setInquiries(inquiries.map(i => i._id === id ? { ...i, reply: inquiryResponse, status: "answered" } : i));
      setRespondingInquiry(null);
      setInquiryResponse("");
    }
  };

  // Consultation handlers
  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = { date: slotForm.date, startTime: slotForm.startTime, endTime: slotForm.endTime, topic: slotForm.topic };
    if (slotForm.instructorId) payload.instructorId = slotForm.instructorId;
    const res = await fetch('/api/consultation/slots', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (res.ok) {
      const data = await res.json();
      setSlots([...data.slots, ...slots]);
      setSlotForm({ instructorId: '', date: '', startTime: '09:00', endTime: '17:00', topic: 'General' });
      alert(`Created ${data.count} slots`);
    } else {
      const err = await res.json().catch(() => null);
      alert(err?.message || `Failed (${res.status})`);
    }
  };

  const handleDeleteSlot = async (id: string) => {
    if (!confirm('Delete this slot?')) return;
    const res = await fetch(`/api/consultation/slots?id=${id}`, { method: 'DELETE' });
    if (res.ok) setSlots(slots.filter(s => s._id !== id));
    else {
      const err = await res.json().catch(() => null);
      alert(err?.message || `Failed (${res.status})`);
    }
  };

  const handleEditSlot = async () => {
    if (!editingSlot) return;
    const body: any = { id: editingSlot };
    if (slotEditForm.startsAt) body.startsAt = slotEditForm.startsAt;
    if (slotEditForm.endsAt) body.endsAt = slotEditForm.endsAt;
    if (slotEditForm.topic) body.topic = slotEditForm.topic;
    const res = await fetch('/api/consultation/slots', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (res.ok) {
      const data = await res.json();
      setSlots(slots.map(s => s._id === data.slot._id ? data.slot : s));
      setEditingSlot(null);
      setSlotEditForm({ startsAt: '', endsAt: '', topic: '' });
    } else {
      const err = await res.json().catch(() => null);
      alert(err?.message || `Failed (${res.status})`);
    }
  };

  const handleUpdateBooking = async (bookingId: string, updates: { status?: string; meetingLink?: string; instructorId?: string; slotId?: string }) => {
    const res = await fetch('/api/consultation/bookings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookingId, ...updates }) });
    if (res.ok) {
      const updated = await res.json();
      setBookings(bookings.map(b => b._id === updated._id ? updated : b));
      setEditingBooking(null);
    } else {
      const err = await res.json().catch(() => null);
      alert(err?.message || `Failed (${res.status})`);
    }
  };


  const tabs: { key: Tab; label: string }[] = [
    { key: "settings", label: locale === 'ko' ? '설정' : 'Settings' },
    { key: "users", label: `${locale === 'ko' ? '사용자' : 'Users'}${loadedTabs.has('users') ? ` (${users.length})` : ''}` },
    { key: "notices", label: `${locale === 'ko' ? '공지' : 'Notices'}${loadedTabs.has('notices') ? ` (${notices.length})` : ''}` },
    { key: "programs", label: `${locale === 'ko' ? '프로그램' : 'Programs'}${loadedTabs.has('programs') ? ` (${programs.length})` : ''}` },
    { key: "jobs", label: `${locale === 'ko' ? '채용' : 'Jobs'}${loadedTabs.has('jobs') ? ` (${jobs.length})` : ''}` },
    { key: "courses", label: `${locale === 'ko' ? '강좌' : 'Courses'}${loadedTabs.has('courses') ? ` (${courses.length})` : ''}` },
    { key: "faqs", label: `FAQ${loadedTabs.has('faqs') ? ` (${faqs.length})` : ''}` },
    { key: "inquiries", label: `${locale === 'ko' ? '문의' : 'Inquiries'}${loadedTabs.has('inquiries') ? ` (${inquiries.length})` : ''}` },
    { key: "consultations", label: `${locale === 'ko' ? '상담' : 'Consult'}${loadedTabs.has('consultations') ? ` (${bookings.length})` : ''}` },
  ];

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold">{t("dashboard")}</h1>
        <p className="text-gray-600">{t("manageDescription")}</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-gray-500 text-sm">{locale === 'ko' ? '로딩 중...' : 'Loading...'}</p>}

      {/* Platform Settings Tab */}
      {activeTab === "settings" && (
        <PlatformSettingsComponent />
      )}

      {/* Users Tab */}
      {activeTab === "users" && (
        <div className="grid gap-6">
          {chatUser && (
            <ChatModal peerId={chatUser} onClose={() => setChatUser(null)} />
          )}
          <Card>
            <h3 className="mb-4 font-semibold">{t("users.title")}</h3>
            <form onSubmit={handleCreateUser} className="grid gap-3 sm:grid-cols-5">
              <Input placeholder={t("users.name")} value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} required />
              <Input type="email" placeholder={t("users.email")} value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} required />
              <Input type="password" placeholder={t("users.password")} value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} required />
              <select value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value})} className="rounded border px-3 py-2">
                <option value="user">user</option>
                <option value="instructor">instructor</option>
                <option value="superadmin">superadmin</option>
              </select>
              <Button type="submit">{t("users.create")}</Button>
            </form>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">{t("users.usersList")}</h3>
              <Input
                placeholder={locale === 'ko' ? '이름/이메일 검색...' : 'Search name/email...'}
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="max-w-xs"
              />
            </div>
            <div className="grid gap-4">
              {filteredUsers.map(user => (
                <div key={user._id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-lg">{user.name}</span>
                        <Badge tone={user.role === "superadmin" ? "orange" : user.role === "instructor" ? "blue" : "gray"}>
                          {user.role}
                        </Badge>
                        {user.passwordResetRequested && (
                          <Badge tone="orange">{locale === 'ko' ? '비밀번호 재설정 요청' : 'Password Reset Requested'}</Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                        <div><strong>{t("users.email")}:</strong> {user.email}</div>
                        <div><strong>{t("users.phone")}:</strong> {user.phone || "-"}</div>
                        <div><strong>{t("users.organization")}:</strong> {user.organization || "-"}</div>
                        <div><strong>{t("users.bio")}:</strong> {user.bio || "-"}</div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => {
                          if (editingUser === user._id) {
                            setEditingUser(null);
                            setUserEditForm({ name: "", email: "", phone: "", bio: "", organization: "", role: "" });
                          } else {
                            setEditingUser(user._id);
                            setUserEditForm({
                              name: user.name,
                              email: user.email,
                              phone: user.phone || "",
                              bio: user.bio || "",
                              organization: user.organization || "",
                              role: user.role
                            });
                          }
                        }}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        {t("users.edit")}
                      </button>
                      <button onClick={() => setChatUser(user._id)} className="text-blue-600 hover:underline text-sm">DM</button>
                      <button onClick={() => handleResetPassword(user._id)} className="text-orange-600 hover:underline text-sm">
                        {t("users.resetPassword")}
                      </button>
                    </div>
                  </div>

                  {editingUser === user._id && (
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="font-medium mb-3">{t("users.edit")} {user.name}</h4>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="text-sm text-gray-600">{t("users.name")}</label>
                          <Input value={userEditForm.name} onChange={e => setUserEditForm({...userEditForm, name: e.target.value})} />
                        </div>
                        <div>
                          <label className="text-sm text-gray-600">{t("users.email")}</label>
                          <Input type="email" value={userEditForm.email} onChange={e => setUserEditForm({...userEditForm, email: e.target.value})} />
                        </div>
                        <div>
                          <label className="text-sm text-gray-600">{t("users.phone")}</label>
                          <Input value={userEditForm.phone} onChange={e => setUserEditForm({...userEditForm, phone: e.target.value})} />
                        </div>
                        <div>
                          <label className="text-sm text-gray-600">{t("users.organization")}</label>
                          <Input value={userEditForm.organization} onChange={e => setUserEditForm({...userEditForm, organization: e.target.value})} />
                        </div>
                        <div>
                          <label className="text-sm text-gray-600">{t("users.role")}</label>
                          <select value={userEditForm.role} onChange={e => setUserEditForm({...userEditForm, role: e.target.value})} className="w-full rounded border px-3 py-2">
                            <option value="user">user</option>
                            <option value="instructor">instructor</option>
                            <option value="superadmin">superadmin</option>
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-sm text-gray-600">{t("users.bio")}</label>
                          <Textarea value={userEditForm.bio} onChange={e => setUserEditForm({...userEditForm, bio: e.target.value})} rows={2} />
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button onClick={() => handleUpdateUser(user._id)}>{t("users.saveRole")}</Button>
                        <button onClick={() => { setEditingUser(null); setUserEditForm({ name: "", email: "", phone: "", bio: "", organization: "", role: "" }); }} className="text-gray-600 hover:underline">
                          {t("users.cancel")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Notices Tab */}
      {activeTab === "notices" && (
        <div className="grid gap-6">
          <Card>
            <h3 className="mb-4 font-semibold">{t("notices.title")}</h3>
            <form onSubmit={handleCreateNotice} className="grid gap-3">
              <Input placeholder={t("notices.noticeTitle")} value={noticeForm.title} onChange={e => setNoticeForm({...noticeForm, title: e.target.value})} required />
              <Textarea placeholder={t("notices.body")} value={noticeForm.body} onChange={e => setNoticeForm({...noticeForm, body: e.target.value})} rows={3} required />
              <div className="flex gap-3">
                <select value={noticeForm.badge} onChange={e => setNoticeForm({...noticeForm, badge: e.target.value})} className="rounded border px-3 py-2">
                  <option value="info">{t("notices.info")}</option>
                  <option value="urgent">{t("notices.urgent")}</option>
                </select>
                <Button type="submit">{t("notices.publish")}</Button>
              </div>
            </form>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">{t("notices.noticesList")}</h3>
              <Input
                placeholder={locale === 'ko' ? '제목 검색...' : 'Search title...'}
                value={noticeSearch}
                onChange={e => setNoticeSearch(e.target.value)}
                className="max-w-xs"
              />
            </div>
            <div className="grid gap-3">
              {filteredNotices.map(notice => (
                <div key={notice._id} className="flex items-start justify-between border-b pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{notice.title}</span>
                      <Badge tone={notice.badge === "urgent" ? "orange" : "blue"}>{notice.badge}</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{notice.body}</p>
                  </div>
                  <button onClick={() => handleDeleteNotice(notice._id)} className="text-red-600 hover:underline text-sm">{t("notices.delete")}</button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Programs Tab */}
      {activeTab === "programs" && (
        <div className="grid gap-6">
          {/* Category Management */}
          <Card>
            <h3 className="mb-4 font-semibold">{locale === 'ko' ? '카테고리 관리' : 'Manage Categories'}</h3>
            <form onSubmit={handleCreateCategory} className="flex gap-3 mb-4">
              <Input
                placeholder={locale === 'ko' ? '이름 (영문소문자)' : 'Name (lowercase)'}
                value={categoryForm.name}
                onChange={e => setCategoryForm({...categoryForm, name: e.target.value})}
                required
              />
              <Input
                placeholder={locale === 'ko' ? '표시 이름' : 'Display Label'}
                value={categoryForm.label}
                onChange={e => setCategoryForm({...categoryForm, label: e.target.value})}
                required
              />
              <Button type="submit">{locale === 'ko' ? '추가' : 'Add'}</Button>
            </form>
            <div className="grid gap-2">
              {categories.map(cat => (
                <div key={cat._id} className="flex items-center justify-between border-b pb-2">
                  {editingCategory === cat._id ? (
                    <div className="flex gap-2 flex-1 mr-2">
                      <Input
                        value={categoryEditForm.name}
                        onChange={e => setCategoryEditForm({...categoryEditForm, name: e.target.value})}
                        className="flex-1"
                      />
                      <Input
                        value={categoryEditForm.label}
                        onChange={e => setCategoryEditForm({...categoryEditForm, label: e.target.value})}
                        className="flex-1"
                      />
                      <Button onClick={() => handleUpdateCategory(cat._id)}>{locale === 'ko' ? '저장' : 'Save'}</Button>
                      <button onClick={() => setEditingCategory(null)} className="text-gray-600 hover:underline text-sm">
                        {locale === 'ko' ? '취소' : 'Cancel'}
                      </button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <span className="font-medium">{cat.label}</span>
                        <span className="text-sm text-gray-500 ml-2">({cat.name})</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingCategory(cat._id);
                            setCategoryEditForm({ name: cat.name, label: cat.label, order: cat.order });
                          }}
                          className="text-blue-600 hover:underline text-sm"
                        >
                          {locale === 'ko' ? '수정' : 'Edit'}
                        </button>
                        <button onClick={() => handleDeleteCategory(cat._id)} className="text-red-600 hover:underline text-sm">
                          {locale === 'ko' ? '삭제' : 'Delete'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Create Program */}
          <Card>
            <h3 className="mb-4 font-semibold">{t("programs.title")}</h3>
            <form onSubmit={handleCreateProgram} className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input placeholder={t("programs.name")} value={programForm.name} onChange={e => setProgramForm({...programForm, name: e.target.value})} required />
                <select value={programForm.category} onChange={e => setProgramForm({...programForm, category: e.target.value})} className="rounded border px-3 py-2">
                  {categories.map(cat => (
                    <option key={cat._id} value={cat.name}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <Textarea placeholder={t("programs.description")} value={programForm.description} onChange={e => setProgramForm({...programForm, description: e.target.value})} rows={2} required />
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="text-sm text-gray-600">{t("programs.startDate")}</label>
                  <Input type="date" value={programForm.startDate} onChange={e => setProgramForm({...programForm, startDate: e.target.value})} required />
                </div>
                <div>
                  <label className="text-sm text-gray-600">{t("programs.endDate")}</label>
                  <Input type="date" value={programForm.endDate} onChange={e => setProgramForm({...programForm, endDate: e.target.value})} required />
                </div>
                <div>
                  <label className="text-sm text-gray-600">{t("programs.status")}</label>
                  <select value={programForm.status} onChange={e => setProgramForm({...programForm, status: e.target.value})} className="w-full rounded border px-3 py-2">
                    <option value="upcoming">{t("programs.upcoming")}</option>
                    <option value="open">{t("programs.open")}</option>
                    <option value="closed">{t("programs.closed")}</option>
                  </select>
                </div>
              </div>
              <Button type="submit">{t("programs.create")}</Button>
            </form>
          </Card>

          {/* Programs List with Search/Filter */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">{t("programs.programsList")}</h3>
            </div>
            <div className="flex flex-wrap gap-3 mb-4">
              <Input
                placeholder={locale === 'ko' ? '이름/설명 검색...' : 'Search name/description...'}
                value={programSearch}
                onChange={e => setProgramSearch(e.target.value)}
                className="max-w-xs"
              />
              <select value={programCategoryFilter} onChange={e => setProgramCategoryFilter(e.target.value)} className="rounded border px-3 py-2">
                <option value="">{locale === 'ko' ? '전체 카테고리' : 'All Categories'}</option>
                {categories.map(cat => (
                  <option key={cat._id} value={cat.name}>{cat.label}</option>
                ))}
              </select>
              <select value={programStatusFilter} onChange={e => setProgramStatusFilter(e.target.value)} className="rounded border px-3 py-2">
                <option value="">{locale === 'ko' ? '전체 상태' : 'All Status'}</option>
                <option value="upcoming">{t("programs.upcoming")}</option>
                <option value="open">{t("programs.open")}</option>
                <option value="closed">{t("programs.closed")}</option>
              </select>
            </div>
            <div className="grid gap-3">
              {filteredPrograms.map(program => (
                <div key={program._id} className="flex items-center justify-between border-b pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{program.name}</span>
                      <Badge tone={program.status === "open" ? "green" : program.status === "upcoming" ? "orange" : "gray"}>{program.status}</Badge>
                    </div>
                    <p className="text-sm text-gray-500">{getCategoryLabel(program.category)} | {new Date(program.startDate).toLocaleDateString()} - {new Date(program.endDate).toLocaleDateString()}</p>
                  </div>
                  <button onClick={() => handleDeleteProgram(program._id)} className="text-red-600 hover:underline text-sm">{t("programs.delete")}</button>
                </div>
              ))}
              {filteredPrograms.length === 0 && programs.length > 0 && (
                <p className="text-sm text-gray-500">{locale === 'ko' ? '검색 결과가 없습니다.' : 'No matching programs.'}</p>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Jobs Tab */}
      {activeTab === "jobs" && (
        <div className="grid gap-6">
          <Card>
            <h3 className="mb-4 font-semibold">{t("jobs.title")}</h3>
            <form onSubmit={handleCreateJob} className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input placeholder={t("jobs.company")} value={jobForm.company} onChange={e => setJobForm({...jobForm, company: e.target.value})} required />
                <Input placeholder={t("jobs.jobTitle")} value={jobForm.title} onChange={e => setJobForm({...jobForm, title: e.target.value})} required />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Input placeholder={t("jobs.location")} value={jobForm.location} onChange={e => setJobForm({...jobForm, location: e.target.value})} required />
                <select value={jobForm.employmentType} onChange={e => setJobForm({...jobForm, employmentType: e.target.value})} className="rounded border px-3 py-2">
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contract">Contract</option>
                </select>
                <Input placeholder={t("jobs.salary")} value={jobForm.salary} onChange={e => setJobForm({...jobForm, salary: e.target.value})} required />
              </div>
              <Textarea placeholder={t("jobs.requirements")} value={jobForm.requirements} onChange={e => setJobForm({...jobForm, requirements: e.target.value})} rows={2} required />
              <Input placeholder={t("jobs.applyUrl")} value={jobForm.applyUrl} onChange={e => setJobForm({...jobForm, applyUrl: e.target.value})} />
              <Button type="submit">{t("jobs.create")}</Button>
            </form>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">{t("jobs.jobsList")}</h3>
              <Input
                placeholder={locale === 'ko' ? '제목/회사 검색...' : 'Search title/company...'}
                value={jobSearch}
                onChange={e => setJobSearch(e.target.value)}
                className="max-w-xs"
              />
            </div>
            <div className="grid gap-3">
              {filteredJobs.map(job => (
                <div key={job._id} className="flex items-center justify-between border-b pb-3">
                  <div>
                    <span className="font-medium">{job.title}</span>
                    <span className="text-gray-600"> at {job.company}</span>
                    <p className="text-sm text-gray-500">{job.location} | {job.employmentType} | {job.salary}</p>
                  </div>
                  <button onClick={() => handleDeleteJob(job._id)} className="text-red-600 hover:underline text-sm">{t("jobs.delete")}</button>
                </div>
              ))}
              {filteredJobs.length === 0 && jobs.length > 0 && (
                <p className="text-sm text-gray-500">{locale === 'ko' ? '검색 결과가 없습니다.' : 'No matching jobs.'}</p>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Courses Tab */}
      {activeTab === "courses" && (
        <Card>
          <h3 className="mb-4 font-semibold">{t("courses.title")}</h3>
          <p className="text-sm text-gray-600 mb-4">{t("courses.createdByInstructors")}</p>
          <div className="flex flex-wrap gap-3 mb-4">
            <Input
              placeholder={locale === 'ko' ? '제목 검색...' : 'Search title...'}
              value={courseSearch}
              onChange={e => setCourseSearch(e.target.value)}
              className="max-w-xs"
            />
            <select value={courseCategoryFilter} onChange={e => setCourseCategoryFilter(e.target.value)} className="rounded border px-3 py-2">
              <option value="">{locale === 'ko' ? '전체 카테고리' : 'All Categories'}</option>
              {categories.map(cat => (
                <option key={cat._id} value={cat.name}>{cat.label}</option>
              ))}
            </select>
          </div>
          {filteredCourses.length === 0 ? (
            <p className="text-gray-500">{courses.length === 0 ? t("courses.noCourses") : (locale === 'ko' ? '검색 결과가 없습니다.' : 'No matching courses.')}</p>
          ) : (
            <div className="grid gap-3">
              {filteredCourses.map(course => (
                <div key={course._id} className="border-b pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{course.title}</span>
                        <Badge tone="blue">{getCategoryLabel(course.category)}</Badge>
                      </div>
                      <p className="text-sm text-gray-500">
                        {course.durationMinutes} min | {course.views} views | By {course.instructor?.name || "Unknown"}
                      </p>
                      {course.videoUrl && (
                        <p className="text-xs text-gray-400 truncate max-w-md">{course.videoUrl}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (editingCourse === course._id) {
                            setEditingCourse(null);
                          } else {
                            setEditingCourse(course._id);
                            setCourseEditForm({
                              title: course.title,
                              category: course.category,
                              description: course.description || "",
                              durationMinutes: course.durationMinutes,
                              thumbnailUrl: course.thumbnailUrl || "",
                              videoUrl: course.videoUrl,
                            });
                          }
                        }}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        {t("courses.edit")}
                      </button>
                      <button onClick={() => handleDeleteCourse(course._id)} className="text-red-600 hover:underline text-sm">{t("courses.delete")}</button>
                    </div>
                  </div>

                  {editingCourse === course._id && (
                    <div className="mt-4 pt-4 border-t bg-gray-50 p-4 rounded">
                      <h4 className="font-medium mb-3">{t("courses.edit")} - {course.title}</h4>
                      <div className="grid gap-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="text-sm text-gray-600">Title</label>
                            <Input value={courseEditForm.title} onChange={e => setCourseEditForm({...courseEditForm, title: e.target.value})} />
                          </div>
                          <div>
                            <label className="text-sm text-gray-600">Category</label>
                            <select value={courseEditForm.category} onChange={e => setCourseEditForm({...courseEditForm, category: e.target.value})} className="w-full rounded border px-3 py-2">
                              {categories.map(cat => (
                                <option key={cat._id} value={cat.name}>{cat.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-600">Description</label>
                          <Textarea value={courseEditForm.description} onChange={e => setCourseEditForm({...courseEditForm, description: e.target.value})} rows={2} />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div>
                            <label className="text-sm text-gray-600">Duration (minutes)</label>
                            <Input type="number" value={courseEditForm.durationMinutes} onChange={e => setCourseEditForm({...courseEditForm, durationMinutes: parseInt(e.target.value) || 0})} />
                          </div>
                          <div>
                            <label className="text-sm text-gray-600">Thumbnail URL</label>
                            <Input value={courseEditForm.thumbnailUrl} onChange={e => setCourseEditForm({...courseEditForm, thumbnailUrl: e.target.value})} />
                          </div>
                          <div>
                            <label className="text-sm text-gray-600">Video URL</label>
                            <Input value={courseEditForm.videoUrl} onChange={e => setCourseEditForm({...courseEditForm, videoUrl: e.target.value})} />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={() => handleUpdateCourse(course._id)}>{t("courses.save")}</Button>
                          <button onClick={() => { setEditingCourse(null); setCourseEditForm({ title: "", category: "finance", description: "", durationMinutes: 30, thumbnailUrl: "", videoUrl: "" }); }} className="text-gray-600 hover:underline">
                            {t("courses.cancel")}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* FAQs Tab */}
      {activeTab === "faqs" && (
        <div className="grid gap-6">
          <Card>
            <h3 className="mb-4 font-semibold">{t("faqs.title")}</h3>
            <form onSubmit={handleCreateFaq} className="grid gap-3">
              <Input placeholder={t("faqs.question")} value={faqForm.question} onChange={e => setFaqForm({...faqForm, question: e.target.value})} required />
              <Textarea placeholder={t("faqs.answer")} value={faqForm.answer} onChange={e => setFaqForm({...faqForm, answer: e.target.value})} rows={3} required />
              <Button type="submit">{t("faqs.addFaq")}</Button>
            </form>
          </Card>

          <Card>
            <h3 className="mb-4 font-semibold">{t("faqs.faqsList")}</h3>
            <div className="grid gap-3">
              {faqs.map(faq => (
                <div key={faq._id} className="border-b pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{faq.question}</p>
                      <p className="text-sm text-gray-600 mt-1">{faq.answer}</p>
                    </div>
                    <button onClick={() => handleDeleteFaq(faq._id)} className="text-red-600 hover:underline text-sm">{t("faqs.delete")}</button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Inquiries Tab */}
      {activeTab === "inquiries" && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Support Inquiries</h3>
            <Input
              placeholder={locale === 'ko' ? '제목 검색...' : 'Search subject...'}
              value={inquirySearch}
              onChange={e => setInquirySearch(e.target.value)}
              className="max-w-xs"
            />
          </div>
          {filteredInquiries.length === 0 ? (
            <p className="text-gray-500">{inquiries.length === 0 ? 'No inquiries yet.' : (locale === 'ko' ? '검색 결과가 없습니다.' : 'No matching inquiries.')}</p>
          ) : (
            <div className="grid gap-4">
              {filteredInquiries.map(inquiry => (
                <div key={inquiry._id} className="border-b pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{inquiry.subject}</span>
                        <Badge tone={inquiry.status === "answered" ? "green" : inquiry.status === "open" ? "orange" : "gray"}>
                          {inquiry.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500">From: {inquiry.userId?.name} ({inquiry.userId?.email})</p>
                      <p className="text-sm text-gray-700 mt-2">{inquiry.message}</p>
                      {inquiry.reply && (
                        <div className="mt-2 bg-green-50 p-2 rounded text-sm">
                          <strong>Response:</strong> {inquiry.reply}
                        </div>
                      )}
                      {respondingInquiry === inquiry._id && (
                        <div className="mt-3 grid gap-2">
                          <Textarea
                            value={inquiryResponse}
                            onChange={e => setInquiryResponse(e.target.value)}
                            placeholder="Type your response..."
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <Button onClick={() => handleRespondInquiry(inquiry._id)}>Send Response</Button>
                            <button onClick={() => setRespondingInquiry(null)} className="text-gray-600 hover:underline">Cancel</button>
                          </div>
                        </div>
                      )}
                    </div>
                    {inquiry.status !== "answered" && respondingInquiry !== inquiry._id && (
                      <button
                        onClick={() => { setRespondingInquiry(inquiry._id); setInquiryResponse(""); }}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        Respond
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Consultations Tab */}
      {activeTab === "consultations" && (
        <div className="grid gap-4">
          <Card>
            <h3 className="mb-4 font-semibold">Create Slots</h3>
            <form onSubmit={handleCreateSlot} className="grid gap-3 sm:grid-cols-4">
              <select value={slotForm.instructorId} onChange={e => setSlotForm({...slotForm, instructorId: e.target.value})} className="rounded border px-3 py-2">
                <option value="">{locale === 'ko' ? '강사 선택' : 'Select Instructor'}</option>
                {instructors.map(ins => <option key={ins._id} value={ins._id}>{ins.name} ({ins.email})</option>)}
              </select>
              <Input type="date" value={slotForm.date} onChange={e => setSlotForm({...slotForm, date: e.target.value})} required />
              <TimeSelect value={slotForm.startTime} onChange={(v) => setSlotForm({...slotForm, startTime: v})} className="rounded border px-3 py-2" hour12={false} locale={locale} />
              <TimeSelect value={slotForm.endTime} onChange={(v) => setSlotForm({...slotForm, endTime: v})} className="rounded border px-3 py-2" hour12={false} locale={locale} />
              <Input placeholder="Topic" value={slotForm.topic} onChange={e => setSlotForm({...slotForm, topic: e.target.value})} />
              <Button type="submit">Create Slots</Button>
            </form>
          </Card>

          <Card>
            <h3 className="mb-4 font-semibold">Slots ({slots.length})</h3>
            {slots.length === 0 ? (
              <p className="text-gray-500">No slots available.</p>
            ) : (
              <div className="grid gap-2">
                {slots.map(slot => (
                  <div key={slot._id} className="flex items-start justify-between border-b py-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{slot.topic}</span>
                        <Badge tone={slot.isBooked ? "gray" : "green"}>{slot.isBooked ? "Booked" : "Available"}</Badge>
                      </div>
                      <p className="text-sm text-gray-600">Instructor: {slot.instructorId?.name || '—'}</p>
                      <p className="text-sm text-gray-700">{new Date(slot.startsAt).toLocaleDateString(locale)} {new Date(slot.startsAt).toLocaleTimeString(locale, {hour: '2-digit', minute: '2-digit', hour12: false})} — {new Date(slot.endsAt).toLocaleTimeString(locale, {hour: '2-digit', minute: '2-digit', hour12: false})}</p>
                    </div>
                    <div className="space-x-2">
                      <button onClick={() => { setEditingSlot(editingSlot === slot._id ? null : slot._id); setSlotEditForm({ startsAt: new Date(slot.startsAt).toISOString(), endsAt: new Date(slot.endsAt).toISOString(), topic: slot.topic }); }} className="text-blue-600 hover:underline text-sm">Edit</button>
                      {!slot.isBooked && <button onClick={() => handleDeleteSlot(slot._id)} className="text-red-600 hover:underline text-sm">Delete</button>}
                    </div>
                  </div>
                ))}

                {editingSlot && (
                  <div className="mt-2">
                    <h4 className="font-medium">Edit Slot</h4>
                    <div className="grid gap-2 sm:grid-cols-3 mt-2">
                      <Input type="datetime-local" value={slotEditForm.startsAt} onChange={e => setSlotEditForm({...slotEditForm, startsAt: e.target.value})} />
                      <Input type="datetime-local" value={slotEditForm.endsAt} onChange={e => setSlotEditForm({...slotEditForm, endsAt: e.target.value})} />
                      <Input placeholder="Topic" value={slotEditForm.topic} onChange={e => setSlotEditForm({...slotEditForm, topic: e.target.value})} />
                    </div>
                    <div className="mt-2">
                      <Button onClick={handleEditSlot}>Save changes</Button>
                      <button onClick={() => { setEditingSlot(null); setSlotEditForm({ startsAt: '', endsAt: '', topic: '' }); }} className="ml-2 text-gray-600 hover:underline">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Bookings ({filteredBookings.length})</h3>
              <Input
                placeholder={locale === 'ko' ? '주제/강사 검색...' : 'Search topic/instructor...'}
                value={consultationSearch}
                onChange={e => setConsultationSearch(e.target.value)}
                className="max-w-xs"
              />
            </div>
            {filteredBookings.length === 0 ? (
              <p className="text-gray-500">{bookings.length === 0 ? 'No bookings yet.' : (locale === 'ko' ? '검색 결과가 없습니다.' : 'No matching bookings.')}</p>
            ) : (
              <div className="grid gap-2">
                {filteredBookings.map(b => (
                  <div key={b._id} className="border-b py-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{b.userId?.name} → {b.instructorId?.name}</span>
                          <Badge tone={b.status === 'approved' ? 'green' : b.status === 'pending' ? 'orange' : 'gray'}>{b.status}</Badge>
                        </div>
                        <p className="text-sm text-gray-600">Slot: {b.slotId?.startsAt ? new Date(b.slotId.startsAt).toLocaleString() : '—'}</p>
                        {b.meetingLink && <p className="text-sm text-blue-700">Link: {b.meetingLink}</p>}
                      </div>
                      <div className="space-x-2">
                        <button onClick={() => { setEditingBooking(editingBooking === b._id ? null : b._id); setBookingEditForm({ status: b.status || '', meetingLink: b.meetingLink || '', instructorId: b.instructorId?._id || '', slotId: b.slotId?._id || '' }); }} className="text-blue-600 hover:underline text-sm">Edit</button>
                      </div>
                    </div>

                    {editingBooking === b._id && (
                      <div className="mt-2 grid gap-2">
                        <div className="grid gap-2 sm:grid-cols-3">
                          <select value={bookingEditForm.status} onChange={e => setBookingEditForm({...bookingEditForm, status: e.target.value})} className="rounded border px-3 py-2">
                            <option value="pending">pending</option>
                            <option value="approved">approved</option>
                            <option value="rejected">rejected</option>
                          </select>
                          <Input placeholder="Meeting link" value={bookingEditForm.meetingLink} onChange={e => setBookingEditForm({...bookingEditForm, meetingLink: e.target.value})} />
                          <select value={bookingEditForm.slotId || ''} onChange={e => setBookingEditForm({...bookingEditForm, slotId: e.target.value})} className="rounded border px-3 py-2">
                            <option value="">Keep slot</option>
                            {slots.filter(s => !s.isBooked || s._id === b.slotId?._id).map(s => (
                              <option key={s._id} value={s._id}>{s.topic} - {new Date(s.startsAt).toLocaleString()} ({s.instructorId?.name || '—'})</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={() => handleUpdateBooking(b._id, bookingEditForm)}>Save</Button>
                          <button onClick={() => setEditingBooking(null)} className="text-gray-600 hover:underline">Cancel</button>
                        </div>
                      </div>
                    )}

                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
