"use client";

import { useEffect, useState, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card, Badge, Button, Input, Textarea, ToastContainer, showToast } from "@/components/UI";
import TimeSelect from "@/components/TimeSelect";
import RichTextEditor from "@/components/RichTextEditor";
import ImageUploader from "@/components/ImageUploader";
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
    name: "", category: "", description: "", imageUrl: "", startDate: "", endDate: "", status: "upcoming"
  });
  const [programImagePreview, setProgramImagePreview] = useState<string | null>(null);
  const [jobForm, setJobForm] = useState({
    company: "", title: "", location: "", employmentType: "Full-time", salary: "", requirements: "", description: "", companyLogo: "", applyUrl: ""
  });
  const [faqForm, setFaqForm] = useState({ question: "", answer: "" });

  // Slot form state
  const [slotForm, setSlotForm] = useState({
    instructorId: "", date: "", endDate: "", startTime: "09:00", endTime: "17:00", topic: "General"
  });
  const [adminSlotDays, setAdminSlotDays] = useState<number[]>([]);

  // Course edit state
  const [editingCourse, setEditingCourse] = useState<string | null>(null);
  const [courseEditForm, setCourseEditForm] = useState({
    title: "", category: "finance", description: "", durationMinutes: 30, thumbnailUrl: "", videoUrl: ""
  });

  // Edit states
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [userEditForm, setUserEditForm] = useState({ name: "", email: "", phone: "", bio: "", organization: "", role: "" });
  const [chatUser, setChatUser] = useState<string | null>(null);
  const [editingProgram, setEditingProgram] = useState<string | null>(null);
  const [programEditForm, setProgramEditForm] = useState({
    name: "", category: "", description: "", imageUrl: "", startDate: "", endDate: "", status: "upcoming"
  });
  const [editingJob, setEditingJob] = useState<string | null>(null);
  const [editingFaq, setEditingFaq] = useState<string | null>(null);
  const [respondingInquiry, setRespondingInquiry] = useState<string | null>(null);
  const [inquiryResponse, setInquiryResponse] = useState("");
  const [editingBooking, setEditingBooking] = useState<string | null>(null);
  const [editingSlot, setEditingSlot] = useState<string | null>(null);
  const [slotEditForm, setSlotEditForm] = useState({ startsAt: "", endsAt: "", topic: "", instructorId: "" });
  const [bookingEditForm, setBookingEditForm] = useState({ status: "", meetingLink: "", instructorId: "", slotId: "" });
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const [deletingSlots, setDeletingSlots] = useState(false);

  // Bulk selection states for other sections
  const [selectedNotices, setSelectedNotices] = useState<Set<string>>(new Set());
  const [deletingNotices, setDeletingNotices] = useState(false);
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
  const [deletingJobs, setDeletingJobs] = useState(false);
  const [selectedCourses, setSelectedCourses] = useState<Set<string>>(new Set());
  const [deletingCourses, setDeletingCourses] = useState(false);
  const [selectedFaqs, setSelectedFaqs] = useState<Set<string>>(new Set());
  const [deletingFaqs, setDeletingFaqs] = useState(false);
  const [selectedInquiries, setSelectedInquiries] = useState<Set<string>>(new Set());
  const [deletingInquiries, setDeletingInquiries] = useState(false);

  const [loadedTabs, setLoadedTabs] = useState<Set<Tab>>(new Set());

  // Fetch categories on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchCategories(); }, []);

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
      showToast(t("users.userCreated"), "success");
    } else {
      const err = await res.json().catch(() => null);
      showToast(err?.message || "Failed to create user", "error");
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
      showToast(t("users.passwordResetSuccess", { password: data.newPassword }), "success");
    } else {
      showToast(locale === 'ko' ? '비밀번호 재설정에 실패했습니다' : 'Failed to reset password', "error");
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
      setProgramForm({ name: "", category: categories[0]?.name || "", description: "", imageUrl: "", startDate: "", endDate: "", status: "upcoming" });
      setProgramImagePreview(null);
    }
  };

  const handleProgramImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) {
      alert(locale === 'ko' ? '이미지 크기는 5MB 이하여야 합니다' : 'Image size must be less than 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setProgramForm({...programForm, imageUrl: base64});
      setProgramImagePreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteProgram = async (id: string) => {
    if (!confirm("Delete this program?")) return;
    const res = await fetch(`/api/programs?id=${id}`, { method: "DELETE" });
    if (res.ok) setPrograms(programs.filter(p => p._id !== id));
  };

  const handleUpdateProgram = async (id: string) => {
    const res = await fetch("/api/programs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...programEditForm }),
    });
    if (res.ok) {
      const updated = await res.json();
      setPrograms(programs.map(p => p._id === id ? { ...p, ...updated } : p));
      setEditingProgram(null);
      setProgramEditForm({ name: "", category: "", description: "", imageUrl: "", startDate: "", endDate: "", status: "upcoming" });
    } else {
      const err = await res.json().catch(() => null);
      alert(err?.message || "Failed to update program");
    }
  };

  const handleProgramEditImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) {
      alert(locale === 'ko' ? '이미지 크기는 5MB 이하여야 합니다' : 'Image size must be less than 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setProgramEditForm({...programEditForm, imageUrl: base64});
    };
    reader.readAsDataURL(file);
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
      setJobForm({ company: "", title: "", location: "", employmentType: "Full-time", salary: "", requirements: "", description: "", companyLogo: "", applyUrl: "" });
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
    if (slotForm.endDate) payload.endDate = slotForm.endDate;
    if (adminSlotDays.length > 0) payload.days = adminSlotDays;
    const res = await fetch('/api/consultation/slots', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (res.ok) {
      const data = await res.json();
      setSlots([...data.slots, ...slots]);
      setSlotForm({ instructorId: '', date: '', endDate: '', startTime: '09:00', endTime: '17:00', topic: 'General' });
      setAdminSlotDays([]);
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

  const handleBulkDeleteSlots = async () => {
    if (selectedSlots.size === 0) return;
    const toDelete = slots.filter(s => selectedSlots.has(s._id));
    const bookedCount = toDelete.filter(s => s.isBooked).length;
    const msg = bookedCount > 0
      ? `Delete ${selectedSlots.size} slot(s)? ${bookedCount} are booked — those will also be deleted.`
      : `Delete ${selectedSlots.size} slot(s)?`;
    if (!confirm(msg)) return;
    setDeletingSlots(true);
    try {
      await Promise.all([...selectedSlots].map(id =>
        fetch(`/api/consultation/slots?id=${id}`, { method: 'DELETE' })
      ));
      setSlots(prev => prev.filter(s => !selectedSlots.has(s._id)));
      setSelectedSlots(new Set());
    } catch (err) {
      alert('Some slots could not be deleted.');
    } finally {
      setDeletingSlots(false);
    }
  };

  const handleBulkDeleteNotices = async () => {
    if (selectedNotices.size === 0) return;
    if (!confirm(`Delete ${selectedNotices.size} notice(s)?`)) return;
    setDeletingNotices(true);
    try {
      await Promise.all([...selectedNotices].map(id => fetch(`/api/notices?id=${id}`, { method: 'DELETE' })));
      setNotices(prev => prev.filter(n => !selectedNotices.has(n._id)));
      setSelectedNotices(new Set());
    } catch { alert('Some notices could not be deleted.'); }
    finally { setDeletingNotices(false); }
  };

  const handleBulkDeleteJobs = async () => {
    if (selectedJobs.size === 0) return;
    if (!confirm(`Delete ${selectedJobs.size} job(s)?`)) return;
    setDeletingJobs(true);
    try {
      await Promise.all([...selectedJobs].map(id => fetch(`/api/jobs?id=${id}`, { method: 'DELETE' })));
      setJobs(prev => prev.filter(j => !selectedJobs.has(j._id)));
      setSelectedJobs(new Set());
    } catch { alert('Some jobs could not be deleted.'); }
    finally { setDeletingJobs(false); }
  };

  const handleBulkDeleteCourses = async () => {
    if (selectedCourses.size === 0) return;
    if (!confirm(`Delete ${selectedCourses.size} course(s)?`)) return;
    setDeletingCourses(true);
    try {
      await Promise.all([...selectedCourses].map(id => fetch(`/api/courses?id=${id}`, { method: 'DELETE' })));
      setCourses(prev => prev.filter(c => !selectedCourses.has(c._id)));
      setSelectedCourses(new Set());
    } catch { alert('Some courses could not be deleted.'); }
    finally { setDeletingCourses(false); }
  };

  const handleBulkDeleteFaqs = async () => {
    if (selectedFaqs.size === 0) return;
    if (!confirm(`Delete ${selectedFaqs.size} FAQ(s)?`)) return;
    setDeletingFaqs(true);
    try {
      await Promise.all([...selectedFaqs].map(id => fetch(`/api/support/faq?id=${id}`, { method: 'DELETE' })));
      setFaqs(prev => prev.filter(f => !selectedFaqs.has(f._id)));
      setSelectedFaqs(new Set());
    } catch { alert('Some FAQs could not be deleted.'); }
    finally { setDeletingFaqs(false); }
  };

  const handleBulkDeleteInquiries = async () => {
    if (selectedInquiries.size === 0) return;
    if (!confirm(`Delete ${selectedInquiries.size} inquiry/inquiries?`)) return;
    setDeletingInquiries(true);
    try {
      await Promise.all([...selectedInquiries].map(id => fetch(`/api/support/inquiries?id=${id}`, { method: 'DELETE' })));
      setInquiries(prev => prev.filter(i => !selectedInquiries.has(i._id)));
      setSelectedInquiries(new Set());
    } catch { alert('Some inquiries could not be deleted.'); }
    finally { setDeletingInquiries(false); }
  };

  const handleEditSlot = async () => {
    if (!editingSlot) return;
    const body: any = { id: editingSlot };
    // Convert datetime-local string (browser local time) → UTC ISO for correct storage
    if (slotEditForm.startsAt) body.startsAt = new Date(slotEditForm.startsAt).toISOString();
    if (slotEditForm.endsAt) body.endsAt = new Date(slotEditForm.endsAt).toISOString();
    if (slotEditForm.topic) body.topic = slotEditForm.topic;
    if (slotEditForm.instructorId) body.instructorId = slotEditForm.instructorId;
    const res = await fetch('/api/consultation/slots', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (res.ok) {
      const data = await res.json();
      setSlots(slots.map(s => s._id === data.slot._id ? data.slot : s));
      setEditingSlot(null);
      setSlotEditForm({ startsAt: '', endsAt: '', topic: '', instructorId: '' });
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
    <>
      <ToastContainer />
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
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold">{t("notices.noticesList")}</h3>
                {filteredNotices.length > 0 && (
                  <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={filteredNotices.length > 0 && filteredNotices.every(n => selectedNotices.has(n._id))}
                      onChange={() => {
                        if (filteredNotices.every(n => selectedNotices.has(n._id))) {
                          setSelectedNotices(new Set());
                        } else {
                          setSelectedNotices(new Set(filteredNotices.map(n => n._id)));
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    {locale === 'ko' ? '전체 선택' : 'Select All'}
                  </label>
                )}
                {selectedNotices.size > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">{selectedNotices.size} {locale === 'ko' ? '개 선택됨' : 'selected'}</span>
                    <button onClick={handleBulkDeleteNotices} disabled={deletingNotices} className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700 disabled:opacity-50">
                      {deletingNotices ? '...' : (locale === 'ko' ? '선택 삭제' : 'Delete Selected')}
                    </button>
                    <button onClick={() => setSelectedNotices(new Set())} className="rounded border px-3 py-1 text-sm text-gray-600 hover:bg-gray-50">
                      {locale === 'ko' ? '해제' : 'Clear'}
                    </button>
                  </div>
                )}
              </div>
              <Input
                placeholder={locale === 'ko' ? '제목 검색...' : 'Search title...'}
                value={noticeSearch}
                onChange={e => setNoticeSearch(e.target.value)}
                className="max-w-xs"
              />
            </div>
            <div className="grid gap-3">
              {filteredNotices.map(notice => (
                <div key={notice._id} className={`flex items-start gap-3 border-b pb-3 ${selectedNotices.has(notice._id) ? 'bg-blue-50 -mx-2 px-2 rounded' : ''}`}>
                  <input
                    type="checkbox"
                    checked={selectedNotices.has(notice._id)}
                    onChange={() => setSelectedNotices(prev => { const s = new Set(prev); s.has(notice._id) ? s.delete(notice._id) : s.add(notice._id); return s; })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 mt-1 cursor-pointer flex-shrink-0"
                  />
                  <div className="flex-1 flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{notice.title}</span>
                        <Badge tone={notice.badge === "urgent" ? "orange" : "blue"}>{notice.badge}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{notice.body}</p>
                    </div>
                    <button onClick={() => handleDeleteNotice(notice._id)} className="text-red-600 hover:underline text-sm flex-shrink-0 ml-2">{t("notices.delete")}</button>
                  </div>
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
              <div>
                <label className="text-sm text-gray-600 mb-1 block">{t("programs.description")}</label>
                <RichTextEditor
                  value={programForm.description}
                  onChange={(val) => setProgramForm({...programForm, description: val})}
                  placeholder={t("programs.description")}
                  rows={4}
                  locale={locale}
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">{locale === 'ko' ? '대표 이미지' : 'Cover Image'}</label>
                <div className="flex items-start gap-4">
                  {programImagePreview ? (
                    <div className="relative">
                      <img src={programImagePreview} alt="Preview" className="w-32 h-24 object-cover rounded border" />
                      <button
                        type="button"
                        onClick={() => { setProgramImagePreview(null); setProgramForm({...programForm, imageUrl: ''}); }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs"
                      >×</button>
                    </div>
                  ) : (
                    <div className="w-32 h-24 border-2 border-dashed rounded flex items-center justify-center text-gray-400 text-sm">
                      {locale === 'ko' ? '이미지 없음' : 'No image'}
                    </div>
                  )}
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProgramImageSelect}
                      className="text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">{locale === 'ko' ? 'PNG, JPG (최대 5MB)' : 'PNG, JPG (max 5MB)'}</p>
                  </div>
                </div>
              </div>
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
                <div key={program._id} className="border-b pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {(program as any).imageUrl && (
                        <img src={(program as any).imageUrl} alt="" className="w-12 h-12 object-cover rounded" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{program.name}</span>
                          <Badge tone={program.status === "open" ? "green" : program.status === "upcoming" ? "orange" : "gray"}>{program.status}</Badge>
                        </div>
                        <p className="text-sm text-gray-500">{getCategoryLabel(program.category)} | {new Date(program.startDate).toLocaleDateString()} - {new Date(program.endDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (editingProgram === program._id) {
                            setEditingProgram(null);
                          } else {
                            setEditingProgram(program._id);
                            setProgramEditForm({
                              name: program.name,
                              category: program.category,
                              description: program.description,
                              imageUrl: (program as any).imageUrl || "",
                              startDate: new Date(program.startDate).toISOString().split('T')[0],
                              endDate: new Date(program.endDate).toISOString().split('T')[0],
                              status: program.status
                            });
                          }
                        }}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        {locale === 'ko' ? '편집' : 'Edit'}
                      </button>
                      <button onClick={() => handleDeleteProgram(program._id)} className="text-red-600 hover:underline text-sm">{t("programs.delete")}</button>
                    </div>
                  </div>

                  {/* Edit Form */}
                  {editingProgram === program._id && (
                    <div className="mt-4 pt-4 border-t bg-gray-50 p-4 rounded">
                      <h4 className="font-medium mb-3">{locale === 'ko' ? '프로그램 편집' : 'Edit Program'}</h4>
                      <div className="grid gap-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="text-sm text-gray-600">{t("programs.name")}</label>
                            <Input value={programEditForm.name} onChange={e => setProgramEditForm({...programEditForm, name: e.target.value})} />
                          </div>
                          <div>
                            <label className="text-sm text-gray-600">{t("programs.category")}</label>
                            <select value={programEditForm.category} onChange={e => setProgramEditForm({...programEditForm, category: e.target.value})} className="w-full rounded border px-3 py-2">
                              {categories.map(cat => (
                                <option key={cat._id} value={cat.name}>{cat.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-600">{t("programs.description")}</label>
                          <RichTextEditor
                            value={programEditForm.description}
                            onChange={(val) => setProgramEditForm({...programEditForm, description: val})}
                            rows={3}
                            locale={locale}
                          />
                        </div>
                        <div>
                          <label className="text-sm text-gray-600 mb-1 block">{locale === 'ko' ? '대표 이미지' : 'Cover Image'}</label>
                          <div className="flex items-start gap-4">
                            {programEditForm.imageUrl ? (
                              <div className="relative">
                                <img src={programEditForm.imageUrl} alt="Preview" className="w-24 h-18 object-cover rounded border" />
                                <button
                                  type="button"
                                  onClick={() => setProgramEditForm({...programEditForm, imageUrl: ''})}
                                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs"
                                >×</button>
                              </div>
                            ) : (
                              <div className="w-24 h-18 border-2 border-dashed rounded flex items-center justify-center text-gray-400 text-xs">
                                {locale === 'ko' ? '없음' : 'None'}
                              </div>
                            )}
                            <input type="file" accept="image/*" onChange={handleProgramEditImageSelect} className="text-sm" />
                          </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div>
                            <label className="text-sm text-gray-600">{t("programs.startDate")}</label>
                            <Input type="date" value={programEditForm.startDate} onChange={e => setProgramEditForm({...programEditForm, startDate: e.target.value})} />
                          </div>
                          <div>
                            <label className="text-sm text-gray-600">{t("programs.endDate")}</label>
                            <Input type="date" value={programEditForm.endDate} onChange={e => setProgramEditForm({...programEditForm, endDate: e.target.value})} />
                          </div>
                          <div>
                            <label className="text-sm text-gray-600">{t("programs.status")}</label>
                            <select value={programEditForm.status} onChange={e => setProgramEditForm({...programEditForm, status: e.target.value})} className="w-full rounded border px-3 py-2">
                              <option value="upcoming">{t("programs.upcoming")}</option>
                              <option value="open">{t("programs.open")}</option>
                              <option value="closed">{t("programs.closed")}</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={() => handleUpdateProgram(program._id)}>{t("programs.saveChanges")}</Button>
                          <button onClick={() => { setEditingProgram(null); setProgramEditForm({ name: "", category: "", description: "", imageUrl: "", startDate: "", endDate: "", status: "upcoming" }); }} className="text-gray-600 hover:underline">
                            {locale === 'ko' ? '취소' : 'Cancel'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
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
                  <option value="Full-time">{locale === 'ko' ? '정규직' : 'Full-time'}</option>
                  <option value="Part-time">{locale === 'ko' ? '파트타임' : 'Part-time'}</option>
                  <option value="Contract">{locale === 'ko' ? '계약직' : 'Contract'}</option>
                </select>
                <Input placeholder={t("jobs.salary")} value={jobForm.salary} onChange={e => setJobForm({...jobForm, salary: e.target.value})} required />
              </div>
              <Textarea placeholder={t("jobs.requirements")} value={jobForm.requirements} onChange={e => setJobForm({...jobForm, requirements: e.target.value})} rows={2} required />
              <div>
                <label className="text-sm text-gray-600 mb-1 block">{locale === 'ko' ? '상세 설명' : 'Description'}</label>
                <RichTextEditor
                  value={jobForm.description}
                  onChange={(val) => setJobForm({...jobForm, description: val})}
                  placeholder={locale === 'ko' ? '채용 상세 설명...' : 'Job description...'}
                  rows={4}
                  locale={locale}
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">{locale === 'ko' ? '회사 로고' : 'Company Logo'}</label>
                <ImageUploader
                  value={jobForm.companyLogo}
                  onChange={(val) => setJobForm({...jobForm, companyLogo: val})}
                  locale={locale}
                  maxWidth={200}
                  maxHeight={200}
                />
              </div>
              <Input placeholder={t("jobs.applyUrl")} value={jobForm.applyUrl} onChange={e => setJobForm({...jobForm, applyUrl: e.target.value})} />
              <Button type="submit">{t("jobs.create")}</Button>
            </form>
          </Card>

          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold">{t("jobs.jobsList")}</h3>
                {filteredJobs.length > 0 && (
                  <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={filteredJobs.length > 0 && filteredJobs.every(j => selectedJobs.has(j._id))}
                      onChange={() => {
                        if (filteredJobs.every(j => selectedJobs.has(j._id))) {
                          setSelectedJobs(new Set());
                        } else {
                          setSelectedJobs(new Set(filteredJobs.map(j => j._id)));
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    {locale === 'ko' ? '전체 선택' : 'Select All'}
                  </label>
                )}
                {selectedJobs.size > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">{selectedJobs.size} {locale === 'ko' ? '개 선택됨' : 'selected'}</span>
                    <button onClick={handleBulkDeleteJobs} disabled={deletingJobs} className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700 disabled:opacity-50">
                      {deletingJobs ? '...' : (locale === 'ko' ? '선택 삭제' : 'Delete Selected')}
                    </button>
                    <button onClick={() => setSelectedJobs(new Set())} className="rounded border px-3 py-1 text-sm text-gray-600 hover:bg-gray-50">
                      {locale === 'ko' ? '해제' : 'Clear'}
                    </button>
                  </div>
                )}
              </div>
              <Input
                placeholder={locale === 'ko' ? '제목/회사 검색...' : 'Search title/company...'}
                value={jobSearch}
                onChange={e => setJobSearch(e.target.value)}
                className="max-w-xs"
              />
            </div>
            <div className="grid gap-3">
              {filteredJobs.map(job => (
                <div key={job._id} className={`flex items-center gap-3 border-b pb-3 ${selectedJobs.has(job._id) ? 'bg-blue-50 -mx-2 px-2 rounded' : ''}`}>
                  <input
                    type="checkbox"
                    checked={selectedJobs.has(job._id)}
                    onChange={() => setSelectedJobs(prev => { const s = new Set(prev); s.has(job._id) ? s.delete(job._id) : s.add(job._id); return s; })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer flex-shrink-0"
                  />
                  <div className="flex-1 flex items-center justify-between">
                    <div>
                      <span className="font-medium">{job.title}</span>
                      <span className="text-gray-600"> at {job.company}</span>
                      <p className="text-sm text-gray-500">{job.location} | {job.employmentType} | {job.salary}</p>
                    </div>
                    <button onClick={() => handleDeleteJob(job._id)} className="text-red-600 hover:underline text-sm flex-shrink-0 ml-2">{t("jobs.delete")}</button>
                  </div>
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
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="font-semibold">{t("courses.title")}</h3>
              <p className="text-sm text-gray-600 mt-1">{t("courses.createdByInstructors")}</p>
            </div>
            {selectedCourses.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">{selectedCourses.size} {locale === 'ko' ? '개 선택됨' : 'selected'}</span>
                <button onClick={handleBulkDeleteCourses} disabled={deletingCourses} className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700 disabled:opacity-50">
                  {deletingCourses ? '...' : (locale === 'ko' ? '선택 삭제' : 'Delete Selected')}
                </button>
                <button onClick={() => setSelectedCourses(new Set())} className="rounded border px-3 py-1 text-sm text-gray-600 hover:bg-gray-50">
                  {locale === 'ko' ? '해제' : 'Clear'}
                </button>
              </div>
            )}
          </div>
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
            {filteredCourses.length > 0 && (
              <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={filteredCourses.length > 0 && filteredCourses.every(c => selectedCourses.has(c._id))}
                  onChange={() => {
                    if (filteredCourses.every(c => selectedCourses.has(c._id))) {
                      setSelectedCourses(new Set());
                    } else {
                      setSelectedCourses(new Set(filteredCourses.map(c => c._id)));
                    }
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                {locale === 'ko' ? '전체 선택' : 'Select All'}
              </label>
            )}
          </div>
          {filteredCourses.length === 0 ? (
            <p className="text-gray-500">{courses.length === 0 ? t("courses.noCourses") : (locale === 'ko' ? '검색 결과가 없습니다.' : 'No matching courses.')}</p>
          ) : (
            <div className="grid gap-3">
              {filteredCourses.map(course => (
                <div key={course._id} className={`border-b pb-3 ${selectedCourses.has(course._id) ? 'bg-blue-50 -mx-2 px-2 rounded' : ''}`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedCourses.has(course._id)}
                      onChange={() => setSelectedCourses(prev => { const s = new Set(prev); s.has(course._id) ? s.delete(course._id) : s.add(course._id); return s; })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer flex-shrink-0"
                    />
                    <div className="flex-1 flex items-center justify-between">
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
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="text-sm text-gray-600">{locale === 'ko' ? '길이 (분)' : 'Duration (minutes)'}</label>
                            <Input type="number" value={courseEditForm.durationMinutes} onChange={e => setCourseEditForm({...courseEditForm, durationMinutes: parseInt(e.target.value) || 0})} />
                          </div>
                          <div>
                            <label className="text-sm text-gray-600">{locale === 'ko' ? '비디오 URL' : 'Video URL'}</label>
                            <Input value={courseEditForm.videoUrl} onChange={e => setCourseEditForm({...courseEditForm, videoUrl: e.target.value})} />
                          </div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-600 mb-1 block">{locale === 'ko' ? '썸네일 이미지' : 'Thumbnail Image'}</label>
                          <ImageUploader
                            value={courseEditForm.thumbnailUrl}
                            onChange={(val) => setCourseEditForm({...courseEditForm, thumbnailUrl: val})}
                            locale={locale}
                            maxWidth={400}
                            maxHeight={300}
                          />
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
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold">{t("faqs.faqsList")}</h3>
                {faqs.length > 0 && (
                  <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={faqs.length > 0 && faqs.every(f => selectedFaqs.has(f._id))}
                      onChange={() => {
                        if (faqs.every(f => selectedFaqs.has(f._id))) {
                          setSelectedFaqs(new Set());
                        } else {
                          setSelectedFaqs(new Set(faqs.map(f => f._id)));
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    {locale === 'ko' ? '전체 선택' : 'Select All'}
                  </label>
                )}
                {selectedFaqs.size > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">{selectedFaqs.size} {locale === 'ko' ? '개 선택됨' : 'selected'}</span>
                    <button onClick={handleBulkDeleteFaqs} disabled={deletingFaqs} className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700 disabled:opacity-50">
                      {deletingFaqs ? '...' : (locale === 'ko' ? '선택 삭제' : 'Delete Selected')}
                    </button>
                    <button onClick={() => setSelectedFaqs(new Set())} className="rounded border px-3 py-1 text-sm text-gray-600 hover:bg-gray-50">
                      {locale === 'ko' ? '해제' : 'Clear'}
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="grid gap-3">
              {faqs.map(faq => (
                <div key={faq._id} className={`border-b pb-3 ${selectedFaqs.has(faq._id) ? 'bg-blue-50 -mx-2 px-2 rounded' : ''}`}>
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedFaqs.has(faq._id)}
                      onChange={() => setSelectedFaqs(prev => { const s = new Set(prev); s.has(faq._id) ? s.delete(faq._id) : s.add(faq._id); return s; })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 mt-1 cursor-pointer flex-shrink-0"
                    />
                    <div className="flex-1 flex items-start justify-between">
                      <div>
                        <p className="font-medium">{faq.question}</p>
                        <p className="text-sm text-gray-600 mt-1">{faq.answer}</p>
                      </div>
                      <button onClick={() => handleDeleteFaq(faq._id)} className="text-red-600 hover:underline text-sm flex-shrink-0 ml-2">{t("faqs.delete")}</button>
                    </div>
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
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold">Support Inquiries</h3>
              {filteredInquiries.length > 0 && (
                <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={filteredInquiries.length > 0 && filteredInquiries.every(i => selectedInquiries.has(i._id))}
                    onChange={() => {
                      if (filteredInquiries.every(i => selectedInquiries.has(i._id))) {
                        setSelectedInquiries(new Set());
                      } else {
                        setSelectedInquiries(new Set(filteredInquiries.map(i => i._id)));
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  {locale === 'ko' ? '전체 선택' : 'Select All'}
                </label>
              )}
              {selectedInquiries.size > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">{selectedInquiries.size} {locale === 'ko' ? '개 선택됨' : 'selected'}</span>
                  <button onClick={handleBulkDeleteInquiries} disabled={deletingInquiries} className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700 disabled:opacity-50">
                    {deletingInquiries ? '...' : (locale === 'ko' ? '선택 삭제' : 'Delete Selected')}
                  </button>
                  <button onClick={() => setSelectedInquiries(new Set())} className="rounded border px-3 py-1 text-sm text-gray-600 hover:bg-gray-50">
                    {locale === 'ko' ? '해제' : 'Clear'}
                  </button>
                </div>
              )}
            </div>
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
                <div key={inquiry._id} className={`border-b pb-4 ${selectedInquiries.has(inquiry._id) ? 'bg-blue-50 -mx-2 px-2 rounded' : ''}`}>
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedInquiries.has(inquiry._id)}
                      onChange={() => setSelectedInquiries(prev => { const s = new Set(prev); s.has(inquiry._id) ? s.delete(inquiry._id) : s.add(inquiry._id); return s; })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 mt-1 cursor-pointer flex-shrink-0"
                    />
                  <div className="flex-1 flex items-start justify-between">
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
            <h3 className="mb-4 font-semibold">{locale === 'ko' ? '상담 슬롯 생성' : 'Create Consultation Slots'}</h3>
            <form onSubmit={handleCreateSlot} className="grid gap-3">
              {/* Instructor selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{locale === 'ko' ? '강사 선택' : 'Instructor'}</label>
                <select value={slotForm.instructorId} onChange={e => setSlotForm({...slotForm, instructorId: e.target.value})} className="rounded border px-3 py-2 w-full">
                  <option value="">{locale === 'ko' ? '강사를 선택하세요' : 'Select Instructor'}</option>
                  {instructors.map(ins => <option key={ins._id} value={ins._id}>{ins.name} ({ins.email})</option>)}
                </select>
              </div>
              {/* Date range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{locale === 'ko' ? '시작 날짜' : 'Start Date'}</label>
                  <Input type="date" value={slotForm.date} onChange={e => setSlotForm({...slotForm, date: e.target.value})} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{locale === 'ko' ? '종료 날짜 (선택)' : 'End Date (optional)'}</label>
                  <Input type="date" value={slotForm.endDate} onChange={e => setSlotForm({...slotForm, endDate: e.target.value})} min={slotForm.date} />
                </div>
              </div>
              {/* Time range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{locale === 'ko' ? '시작 시간' : 'Start Time'}</label>
                  <TimeSelect value={slotForm.startTime} onChange={(v) => setSlotForm({...slotForm, startTime: v})} className="rounded border px-3 py-2 w-full" hour12={false} locale={locale} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{locale === 'ko' ? '종료 시간' : 'End Time'}</label>
                  <TimeSelect value={slotForm.endTime} onChange={(v) => setSlotForm({...slotForm, endTime: v})} className="rounded border px-3 py-2 w-full" hour12={false} locale={locale} />
                </div>
              </div>
              {/* Topic */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{locale === 'ko' ? '주제' : 'Topic'}</label>
                <Input placeholder={locale === 'ko' ? '예: 취업 상담' : 'e.g. Career Advice'} value={slotForm.topic} onChange={e => setSlotForm({...slotForm, topic: e.target.value})} />
              </div>
              {/* Day of week selector (only shown when endDate is set) */}
              {slotForm.endDate && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {locale === 'ko' ? '반복 요일 (비어있으면 매일)' : 'Repeat on days (empty = every day)'}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { v: 0, ko: '일', en: 'Sun' },
                      { v: 1, ko: '월', en: 'Mon' },
                      { v: 2, ko: '화', en: 'Tue' },
                      { v: 3, ko: '수', en: 'Wed' },
                      { v: 4, ko: '목', en: 'Thu' },
                      { v: 5, ko: '금', en: 'Fri' },
                      { v: 6, ko: '토', en: 'Sat' },
                    ].map(day => (
                      <button key={day.v} type="button"
                        onClick={() => setAdminSlotDays(prev => prev.includes(day.v) ? prev.filter(d => d !== day.v) : [...prev, day.v])}
                        className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${adminSlotDays.includes(day.v) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'}`}
                      >
                        {locale === 'ko' ? day.ko : day.en}
                      </button>
                    ))}
                  </div>
                  {slotForm.date && slotForm.endDate && (
                    <p className="text-xs text-gray-500 mt-2">
                      {locale === 'ko'
                        ? `${slotForm.date} ~ ${slotForm.endDate} 기간 동안 ${adminSlotDays.length > 0 ? '선택된 요일에' : '매일'} 슬롯이 생성됩니다.`
                        : `Slots will be created ${adminSlotDays.length > 0 ? 'on selected days' : 'every day'} from ${slotForm.date} to ${slotForm.endDate}.`}
                    </p>
                  )}
                </div>
              )}
              <Button type="submit">{locale === 'ko' ? '슬롯 생성' : 'Create Slots'}</Button>
            </form>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold">Slots ({slots.length})</h3>
                {slots.length > 0 && (
                  <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={slots.length > 0 && slots.every(s => selectedSlots.has(s._id))}
                      onChange={() => {
                        if (slots.every(s => selectedSlots.has(s._id))) {
                          setSelectedSlots(new Set());
                        } else {
                          setSelectedSlots(new Set(slots.map(s => s._id)));
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    {locale === 'ko' ? '전체 선택' : 'Select All'}
                  </label>
                )}
              </div>
              {selectedSlots.size > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">{selectedSlots.size} {locale === 'ko' ? '개 선택됨' : 'selected'}</span>
                  <button
                    onClick={handleBulkDeleteSlots}
                    disabled={deletingSlots}
                    className="rounded bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {deletingSlots ? (locale === 'ko' ? '삭제 중...' : 'Deleting...') : (locale === 'ko' ? '선택 삭제' : 'Delete Selected')}
                  </button>
                  <button
                    onClick={() => setSelectedSlots(new Set())}
                    className="rounded border px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    {locale === 'ko' ? '해제' : 'Clear'}
                  </button>
                </div>
              )}
            </div>

            {slots.length === 0 ? (
              <p className="text-gray-500">No slots available.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="px-3 py-2 w-10"></th>
                      <th className="text-left px-3 py-2 font-semibold text-gray-700">{locale === 'ko' ? '주제' : 'Topic'}</th>
                      <th className="text-left px-3 py-2 font-semibold text-gray-700">{locale === 'ko' ? '강사' : 'Instructor'}</th>
                      <th className="text-left px-3 py-2 font-semibold text-gray-700">{locale === 'ko' ? '날짜/시간' : 'Date / Time'}</th>
                      <th className="text-left px-3 py-2 font-semibold text-gray-700">{locale === 'ko' ? '상태' : 'Status'}</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {slots.map(slot => {
                      const isSelected = selectedSlots.has(slot._id);
                      const toLocalDT = (iso: string) => {
                        const d = new Date(iso);
                        const pad = (n: number) => String(n).padStart(2, '0');
                        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
                      };
                      return (
                        <>
                          <tr key={slot._id} className={`hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}>
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => setSelectedSlots(prev => {
                                  const s = new Set(prev);
                                  s.has(slot._id) ? s.delete(slot._id) : s.add(slot._id);
                                  return s;
                                })}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                              />
                            </td>
                            <td className="px-3 py-2 font-medium text-gray-900">{slot.topic}</td>
                            <td className="px-3 py-2 text-gray-600">{slot.instructorId?.name || '—'}</td>
                            <td className="px-3 py-2 text-gray-700 whitespace-nowrap">
                              {new Date(slot.startsAt).toLocaleDateString(locale)}{' '}
                              {new Date(slot.startsAt).toLocaleTimeString(locale, {hour: '2-digit', minute: '2-digit', hour12: false})}
                              {' — '}
                              {new Date(slot.endsAt).toLocaleTimeString(locale, {hour: '2-digit', minute: '2-digit', hour12: false})}
                            </td>
                            <td className="px-3 py-2">
                              <Badge tone={slot.isBooked ? "gray" : "green"}>{slot.isBooked ? "Booked" : "Available"}</Badge>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    setEditingSlot(editingSlot === slot._id ? null : slot._id);
                                    setSlotEditForm({ startsAt: toLocalDT(slot.startsAt), endsAt: toLocalDT(slot.endsAt), topic: slot.topic, instructorId: String(slot.instructorId?._id || slot.instructorId || '') });
                                  }}
                                  className="text-blue-600 hover:underline text-sm"
                                >Edit</button>
                                <button onClick={() => handleDeleteSlot(slot._id)} className="text-red-600 hover:underline text-sm">Delete</button>
                              </div>
                            </td>
                          </tr>
                          {editingSlot === slot._id && (
                            <tr key={`${slot._id}-edit`}>
                              <td colSpan={6} className="px-3 py-3 bg-gray-50 border-b">
                                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                                  <div>
                                    <label className="block text-xs text-gray-500 mb-1">{locale === 'ko' ? '강사 (변경 시)' : 'Instructor (reassign)'}</label>
                                    <select value={slotEditForm.instructorId} onChange={e => setSlotEditForm({...slotEditForm, instructorId: e.target.value})} className="rounded border px-2 py-1.5 text-sm w-full">
                                      <option value="">{locale === 'ko' ? '변경 안 함' : 'Keep current'}</option>
                                      {instructors.map(ins => <option key={ins._id} value={ins._id}>{ins.name}</option>)}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-500 mb-1">{locale === 'ko' ? '시작 시간' : 'Starts at'}</label>
                                    <Input type="datetime-local" value={slotEditForm.startsAt} onChange={e => setSlotEditForm({...slotEditForm, startsAt: e.target.value})} />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-500 mb-1">{locale === 'ko' ? '종료 시간' : 'Ends at'}</label>
                                    <Input type="datetime-local" value={slotEditForm.endsAt} onChange={e => setSlotEditForm({...slotEditForm, endsAt: e.target.value})} />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-500 mb-1">{locale === 'ko' ? '주제' : 'Topic'}</label>
                                    <Input placeholder="Topic" value={slotEditForm.topic} onChange={e => setSlotEditForm({...slotEditForm, topic: e.target.value})} />
                                  </div>
                                </div>
                                <div className="mt-2 flex gap-2">
                                  <Button onClick={handleEditSlot}>Save</Button>
                                  <button onClick={() => { setEditingSlot(null); setSlotEditForm({ startsAt: '', endsAt: '', topic: '', instructorId: '' }); }} className="text-gray-600 hover:underline text-sm">Cancel</button>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
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
    </>
  );
}
