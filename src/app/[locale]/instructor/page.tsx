"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card, Badge, Button, Input, Textarea } from "@/components/UI";
import TimeSelect from "@/components/TimeSelect";
import DateRangePicker from "@/components/DateRangePicker";

type Tab = "courses" | "resources" | "slots" | "bookings";

interface Course {
  _id: string;
  title: string;
  category: string;
  description: string;
  durationMinutes: number;
  thumbnailUrl?: string;
  videoUrl: string;
  views: number;
}

interface Resource {
  _id: string;
  title: string;
  category: string;
  description: string;
  fileUrl: string;
  fileSize: number;
  downloadCount: number;
}

interface ConsultationSlot {
  _id: string;
  startsAt: string;
  endsAt: string;
  topic: string;
  isBooked: boolean;
}

interface Booking {
  _id: string;
  user: { name: string; email: string };
  slotId: {
    _id: string;
    startsAt: string;
    endsAt: string;
    topic: string;
  };
  status: string;
  meetingLink?: string;
  createdAt: string;
}

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export default function InstructorPage() {
  const tCourses = useTranslations("admin.courses");
  const [activeTab, setActiveTab] = useState<Tab>("courses");
  const [loading, setLoading] = useState(true);

  // Data states
  const [courses, setCourses] = useState<Course[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [slots, setSlots] = useState<ConsultationSlot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  // Form states
  const [courseForm, setCourseForm] = useState({
    title: "", category: "finance", description: "", durationMinutes: 30, thumbnailUrl: "", videoUrl: ""
  });
  const [resourceForm, setResourceForm] = useState({
    title: "", category: "finance", description: "", fileUrl: "", fileSize: 0
  });
  const [slotForm, setSlotForm] = useState({
    date: "", endDate: "", startTime: "09:00", endTime: "12:00", topic: "General", days: [] as number[], weeks: 1
  });

  // Edit states
  const [editingCourse, setEditingCourse] = useState<string | null>(null);
  const [courseEditForm, setCourseEditForm] = useState({
    title: "", category: "finance", description: "", durationMinutes: 30, thumbnailUrl: "", videoUrl: ""
  });
  const [managingBooking, setManagingBooking] = useState<string | null>(null);
  const [meetingLink, setMeetingLink] = useState("");

  // Slot selection states
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedDays, setExpandedDays] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [coursesRes, resourcesRes, slotsRes, bookingsRes] = await Promise.all([
        fetch("/api/courses?mine=true"),
        fetch("/api/resources?mine=true"),
        fetch("/api/consultation/slots?mine=true"),
        fetch("/api/consultation/bookings?instructor=true"),
      ]);

      if (coursesRes.ok) setCourses((await coursesRes.json()).courses || []);
      if (resourcesRes.ok) setResources((await resourcesRes.json()).resources || []);
      if (slotsRes.ok) setSlots((await slotsRes.json()).slots || []);
      if (bookingsRes.ok) setBookings((await bookingsRes.json()).bookings || []);
    } catch (error) {
      console.error("Error fetching instructor data:", error);
    } finally {
      setLoading(false);
    }
  }

  // Course handlers
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(courseForm),
    });
    if (res.ok) {
      const data = await res.json();
      setCourses([...courses, data.course]);
      setCourseForm({ title: "", category: "finance", description: "", durationMinutes: 30, thumbnailUrl: "", videoUrl: "" });
    } else {
      const error = await res.json();
      alert(error.message || "Failed to create course");
    }
  };

  const handleDeleteCourse = async (id: string) => {
    if (!confirm("Delete this course?")) return;
    const res = await fetch(`/api/courses?id=${id}`, { method: "DELETE" });
    if (res.ok) setCourses(courses.filter(c => c._id !== id));
  };

  const handleUpdateCourse = async (id: string) => {
    // Build update payload, only include fields with valid values
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

  // Resource handlers
  const handleCreateResource = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/resources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(resourceForm),
    });
    if (res.ok) {
      const data = await res.json();
      setResources([...resources, data.resource]);
      setResourceForm({ title: "", category: "finance", description: "", fileUrl: "", fileSize: 0 });
    } else {
      const error = await res.json();
      alert(error.message || "Failed to create resource");
    }
  };

  const handleDeleteResource = async (id: string) => {
    if (!confirm("Delete this resource?")) return;
    const res = await fetch(`/api/resources?id=${id}`, { method: "DELETE" });
    if (res.ok) setResources(resources.filter(r => r._id !== id));
  };

  // Slot handlers
  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/consultation/slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(slotForm),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.slots && data.slots.length > 0) {
        setSlots([...slots, ...data.slots]);
        alert(`Created ${data.count} consultation slot(s)`);
      }
      setSlotForm({ date: "", endDate: "", startTime: "09:00", endTime: "12:00", topic: "General", days: [], weeks: 1 });
    } else {
      const error = await res.json();
      alert(error.message || "Failed to create slots");
    }
  };

  const handleDeleteSlot = async (id: string) => {
    if (!confirm("Delete this slot?")) return;
    const res = await fetch(`/api/consultation/slots?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setSlots(slots.filter(s => s._id !== id));
      setSelectedSlots(selectedSlots.filter(s => s !== id));
    } else {
      const error = await res.json();
      alert(error.message || "Failed to delete slot");
    }
  };

  // Slot selection handlers
  const handleSelectSlot = (slotId: string) => {
    if (selectedSlots.includes(slotId)) {
      setSelectedSlots(selectedSlots.filter(id => id !== slotId));
    } else {
      setSelectedSlots([...selectedSlots, slotId]);
    }
  };

  const handleSelectAll = () => {
    const availableSlotIds = slots.filter(s => !s.isBooked).map(s => s._id);
    if (selectedSlots.length === availableSlotIds.length && availableSlotIds.length > 0) {
      setSelectedSlots([]);
    } else {
      setSelectedSlots(availableSlotIds);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedSlots.length === 0) {
      alert(t('slots.selectAtLeastOne'));
      return;
    }
    if (!confirm(t('slots.confirmBulkDelete'))) return;

    setIsDeleting(true);
    let deleted = 0;
    const errors: string[] = [];

    for (const slotId of selectedSlots) {
      const res = await fetch(`/api/consultation/slots?id=${slotId}`, { method: "DELETE" });
      if (res.ok) {
        deleted++;
      } else {
        const error = await res.json().catch(() => null);
        errors.push(error?.message || `Failed to delete slot ${slotId}`);
      }
    }

    setSlots(slots.filter(s => !selectedSlots.includes(s._id) || errors.length > 0));
    setSelectedSlots([]);
    setIsDeleting(false);

    if (errors.length > 0) {
      alert(`Deleted ${deleted} slots. Errors: ${errors.join(', ')}`);
    } else {
      alert(t('slots.deletedCount'));
    }
    fetchData(); // Refresh to get accurate state
  };

  // Toggle day expansion
  const toggleDayExpansion = (dateKey: string) => {
    if (expandedDays.includes(dateKey)) {
      setExpandedDays(expandedDays.filter(d => d !== dateKey));
    } else {
      setExpandedDays([...expandedDays, dateKey]);
    }
  };

  // Group slots by date
  const groupSlotsByDate = () => {
    const grouped: { [key: string]: ConsultationSlot[] } = {};
    slots.forEach(slot => {
      const dateKey = new Date(slot.startsAt).toISOString().split('T')[0];
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(slot);
    });
    // Sort slots within each day by time
    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    });
    return grouped;
  };

  // Get booking info for a slot
  const getBookingForSlot = (slotId: string) => {
    return bookings.find(b => b.slotId?._id === slotId);
  };

  const toggleDay = (day: number) => {
    if (slotForm.days.includes(day)) {
      setSlotForm({ ...slotForm, days: slotForm.days.filter(d => d !== day) });
    } else {
      setSlotForm({ ...slotForm, days: [...slotForm.days, day] });
    }
  };

  // Booking handlers
  const handleUpdateBooking = async (bookingId: string, action: string) => {
    const body: { bookingId: string; action: string; meetingLink?: string } = { bookingId, action };
    if (action === "approve" && meetingLink) {
      body.meetingLink = meetingLink;
    }
    const res = await fetch("/api/consultation/bookings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setBookings(bookings.map(b =>
        b._id === bookingId ? { ...b, status: action === "approve" ? "approved" : "rejected", meetingLink: body.meetingLink || b.meetingLink } : b
      ));
      setManagingBooking(null);
      setMeetingLink("");
    }
  };

  const locale = useLocale();
  const t = useTranslations("instructor");

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      finance: t('categories.finance'),
      realestate: t('categories.realestate'),
      startup: t('categories.startup'),
      social: t('categories.social'),
    };
    return labels[category] || category;
  };

  const formatSlotTime = (startsAt: string, endsAt: string) => {
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    const dateStr = start.toLocaleDateString(locale);
    const startTime = start.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", hour12: false });
    const endTime = end.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", hour12: false });
    return `${dateStr} | ${startTime} - ${endTime}`;
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "courses", label: t('tabs.courses', { count: courses.length }) },
    { key: "resources", label: t('tabs.resources', { count: resources.length }) },
    { key: "slots", label: t('tabs.slots', { count: slots.length }) },
    { key: "bookings", label: t('tabs.bookings', { count: bookings.length }) },
  ];

  if (loading) {
    return (
      <div className="grid gap-4">
        <h1 className="text-2xl font-bold">{t('dashboard')}</h1>
        <p className="text-gray-600">{t('loading')}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold">{t('dashboard')}</h1>
        <p className="text-gray-600">{t('manageDescription')}</p>
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

      {/* Courses Tab */}
      {activeTab === "courses" && (
        <div className="grid gap-6">
          <Card>
            <h3 className="mb-4 font-semibold">{t('createCourse.title')}</h3>
            <form onSubmit={handleCreateCourse} className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input placeholder={t('placeholders.courseTitle')} value={courseForm.title} onChange={e => setCourseForm({...courseForm, title: e.target.value})} required />
                <select value={courseForm.category} onChange={e => setCourseForm({...courseForm, category: e.target.value})} className="rounded border px-3 py-2">
                  <option value="finance">{t('categories.finance')}</option>
                  <option value="realestate">{t('categories.realestate')}</option>
                  <option value="startup">{t('categories.startup')}</option>
                  <option value="social">{t('categories.social')}</option>
                </select>
              </div>
              <Textarea placeholder={t('placeholders.description')} value={courseForm.description} onChange={e => setCourseForm({...courseForm, description: e.target.value})} rows={2} required />
              <div className="grid gap-3 sm:grid-cols-3">
                <Input type="number" placeholder={t('placeholders.duration')} value={courseForm.durationMinutes} onChange={e => setCourseForm({...courseForm, durationMinutes: parseInt(e.target.value) || 0})} required />
                <Input placeholder={t('placeholders.thumbnailUrl')} value={courseForm.thumbnailUrl} onChange={e => setCourseForm({...courseForm, thumbnailUrl: e.target.value})} />
                <Input placeholder={t('placeholders.videoUrl')} value={courseForm.videoUrl} onChange={e => setCourseForm({...courseForm, videoUrl: e.target.value})} required />
              </div>
              <Button type="submit">{t('createCourse.button')}</Button>
            </form>
          </Card>

          <Card>
            <h3 className="mb-4 font-semibold">{t('myCourses.title')}</h3>
            {courses.length === 0 ? (
              <p className="text-gray-500">{tCourses("noCourses")}</p>
            ) : (
              <div className="grid gap-3">
                {courses.map(course => (
                  <div key={course._id} className="border-b pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{course.title}</span>
                          <Badge tone="blue">{getCategoryLabel(course.category)}</Badge>
                        </div>
                        <p className="text-sm text-gray-500">{course.durationMinutes} min | {course.views} views</p>
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
                          {tCourses('edit')}
                        </button>
                        <button onClick={() => handleDeleteCourse(course._id)} className="text-red-600 hover:underline text-sm">{tCourses('delete')}</button>
                      </div>
                    </div>

                    {editingCourse === course._id && (
                      <div className="mt-4 pt-4 border-t bg-gray-50 p-4 rounded">
                        <h4 className="font-medium mb-3">{tCourses('edit')} {course.title}</h4>
                        <div className="grid gap-3">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <label className="text-sm text-gray-600">{t('placeholders.courseTitle')}</label>
                              <Input value={courseEditForm.title} onChange={e => setCourseEditForm({...courseEditForm, title: e.target.value})} />
                            </div>
                            <div>
                              <label className="text-sm text-gray-600">{t('categories.finance')}</label>
                              <select value={courseEditForm.category} onChange={e => setCourseEditForm({...courseEditForm, category: e.target.value})} className="w-full rounded border px-3 py-2">
                                <option value="finance">{t('categories.finance')}</option>
                                <option value="realestate">{t('categories.realestate')}</option>
                                <option value="startup">{t('categories.startup')}</option>
                                <option value="social">{t('categories.social')}</option>
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className="text-sm text-gray-600">{t('placeholders.description')}</label>
                            <Textarea value={courseEditForm.description} onChange={e => setCourseEditForm({...courseEditForm, description: e.target.value})} rows={2} />
                          </div>
                          <div className="grid gap-3 sm:grid-cols-3">
                            <div>
                              <label className="text-sm text-gray-600">{t('placeholders.duration')}</label>
                              <Input type="number" value={courseEditForm.durationMinutes} onChange={e => setCourseEditForm({...courseEditForm, durationMinutes: parseInt(e.target.value) || 0})} />
                            </div>
                            <div>
                              <label className="text-sm text-gray-600">{t('placeholders.thumbnailUrl')}</label>
                              <Input value={courseEditForm.thumbnailUrl} onChange={e => setCourseEditForm({...courseEditForm, thumbnailUrl: e.target.value})} />
                            </div>
                            <div>
                              <label className="text-sm text-gray-600">{t('placeholders.videoUrl')}</label>
                              <Input value={courseEditForm.videoUrl} onChange={e => setCourseEditForm({...courseEditForm, videoUrl: e.target.value})} />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={() => handleUpdateCourse(course._id)}>{tCourses('save')}</Button>
                            <button onClick={() => { setEditingCourse(null); setCourseEditForm({ title: "", category: "finance", description: "", durationMinutes: 30, thumbnailUrl: "", videoUrl: "" }); }} className="text-gray-600 hover:underline">
                              {tCourses('cancel')}
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
        </div>
      )}

      {/* Resources Tab */}
      {activeTab === "resources" && (
        <div className="grid gap-6">
          <Card>
            <h3 className="mb-4 font-semibold">{t('resources.uploadTitle')}</h3>
            <form onSubmit={handleCreateResource} className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input placeholder={t('resources.resourceTitle')} value={resourceForm.title} onChange={e => setResourceForm({...resourceForm, title: e.target.value})} required />
                <select value={resourceForm.category} onChange={e => setResourceForm({...resourceForm, category: e.target.value})} className="rounded border px-3 py-2">
                  <option value="finance">{t('categories.finance')}</option>
                  <option value="realestate">{t('categories.realestate')}</option>
                  <option value="startup">{t('categories.startup')}</option>
                  <option value="social">{t('categories.social')}</option>
                </select>
              </div>
              <Textarea placeholder={t('resources.description')} value={resourceForm.description} onChange={e => setResourceForm({...resourceForm, description: e.target.value})} rows={2} required />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input placeholder={t('resources.fileUrl')} value={resourceForm.fileUrl} onChange={e => setResourceForm({...resourceForm, fileUrl: e.target.value})} required />
                <Input type="number" placeholder={t('resources.fileSize')} value={resourceForm.fileSize || ""} onChange={e => setResourceForm({...resourceForm, fileSize: parseInt(e.target.value) || 0})} />
              </div>
              <Button type="submit">{t('resources.upload')}</Button>
            </form>
          </Card>

          <Card>
            <h3 className="mb-4 font-semibold">{t('resources.myResources')}</h3>
            {resources.length === 0 ? (
              <p className="text-gray-500">{t('resources.noResources')}</p>
            ) : (
              <div className="grid gap-3">
                {resources.map(resource => (
                  <div key={resource._id} className="flex items-center justify-between border-b pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{resource.title}</span>
                        <Badge tone="green">{getCategoryLabel(resource.category)}</Badge>
                      </div>
                      <p className="text-sm text-gray-500">{resource.downloadCount} {t('resources.downloads')}</p>
                    </div>
                    <button onClick={() => handleDeleteResource(resource._id)} className="text-red-600 hover:underline text-sm">{tCourses('delete')}</button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Slots Tab */}
      {activeTab === "slots" && (
        <div className="grid gap-6">
          <Card>
            <h3 className="mb-4 font-semibold">{t('slots.createTitle')}</h3>
            <p className="text-sm text-gray-600 mb-4">{t('slots.createDescription')}</p>
            <form onSubmit={handleCreateSlot} className="grid gap-4">
              {/* Date Range Picker */}
              <div>
                <label className="text-sm text-gray-600 block mb-2">{t('slots.dateRange')}</label>
                <DateRangePicker
                  startDate={slotForm.date}
                  endDate={slotForm.endDate}
                  onStartDateChange={(date) => setSlotForm({...slotForm, date})}
                  onEndDateChange={(date) => setSlotForm({...slotForm, endDate: date})}
                  startLabel={t('slots.startDate')}
                  endLabel={t('slots.finishDate')}
                  locale={locale}
                />
              </div>

              {/* Time and Topic */}
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="text-sm text-gray-600">{t('slots.startTime')}</label>
                  <TimeSelect value={slotForm.startTime} onChange={(v) => setSlotForm({...slotForm, startTime: v})} className="rounded border px-3 py-2" hour12={false} locale={locale} />
                </div>
                <div>
                  <label className="text-sm text-gray-600">{t('slots.endTime')}</label>
                  <TimeSelect value={slotForm.endTime} onChange={(v) => setSlotForm({...slotForm, endTime: v})} className="rounded border px-3 py-2" hour12={false} locale={locale} />
                </div>
                <div>
                  <label className="text-sm text-gray-600">{t('slots.topic')}</label>
                  <Input placeholder={t('slots.topicPlaceholder')} value={slotForm.topic} onChange={e => setSlotForm({...slotForm, topic: e.target.value})} />
                </div>
              </div>

              {/* Repeat Days */}
              <div>
                <label className="text-sm text-gray-600 block mb-2">{t('slots.repeatDays')}</label>
                <div className="flex flex-wrap gap-2">
                  {DAY_KEYS.map((dayKey, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => toggleDay(index)}
                      className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                        slotForm.days.includes(index)
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      {t(`days.${dayKey}`)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Repeat Weeks */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-sm text-gray-600">{t('slots.repeatWeeks')}</label>
                  <select
                    value={slotForm.weeks}
                    onChange={e => setSlotForm({...slotForm, weeks: parseInt(e.target.value)})}
                    className="w-full rounded border px-3 py-2"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(w => (
                      <option key={w} value={w}>{w} {locale === 'ko' ? '주' : (w === 1 ? 'week' : 'weeks')}</option>
                    ))}
                  </select>
                </div>
              </div>

              <Button type="submit" disabled={!slotForm.date}>{t('slots.createButton')}</Button>
            </form>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">{t('slots.mySlots')}</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setExpandedDays(Object.keys(groupSlotsByDate()))}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {t('slots.expandAll')}
                </button>
                <button
                  onClick={() => setExpandedDays([])}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {t('slots.collapseAll')}
                </button>
                <span className="text-gray-300">|</span>
                <Button
                  onClick={handleDeleteSelected}
                  disabled={selectedSlots.length === 0 || isDeleting}
                  className={`${selectedSlots.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isDeleting ? t('slots.deleting') : t('slots.deleteSelected')} {selectedSlots.length > 0 && `(${selectedSlots.length})`}
                </Button>
              </div>
            </div>

            {/* Select All Row */}
            {slots.length > 0 && (
              <div className="flex items-center gap-3 pb-3 mb-3 border-b bg-gray-50 p-2 rounded">
                <input
                  type="checkbox"
                  checked={slots.filter(s => !s.isBooked).length > 0 && selectedSlots.length === slots.filter(s => !s.isBooked).length}
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded border-gray-300"
                  disabled={slots.filter(s => !s.isBooked).length === 0}
                />
                <span className="text-sm font-medium text-gray-700">{t('slots.selectAll')}</span>
                <span className="text-sm text-gray-500">
                  ({selectedSlots.length} / {slots.filter(s => !s.isBooked).length} {t('slots.selected')})
                </span>
              </div>
            )}

            {slots.length === 0 ? (
              <p className="text-gray-500">{t('slots.noSlots')}</p>
            ) : (
              <div className="grid gap-2">
                {Object.entries(groupSlotsByDate())
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([dateKey, daySlots]) => {
                    const isExpanded = expandedDays.includes(dateKey);
                    const bookedCount = daySlots.filter(s => s.isBooked).length;
                    const availableCount = daySlots.length - bookedCount;
                    const date = new Date(dateKey);
                    const dayName = date.toLocaleDateString(locale, { weekday: 'short' });
                    const dateDisplay = date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });

                    return (
                      <div key={dateKey} className="border rounded-lg overflow-hidden">
                        {/* Day Header - Clickable to expand/collapse */}
                        <div
                          onClick={() => toggleDayExpansion(dateKey)}
                          className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <svg
                              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            <span className="font-semibold">{dayName}</span>
                            <span className="text-gray-600">{dateDisplay}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">{daySlots.length} {t('slots.slotsCount')}</span>
                            {bookedCount > 0 && (
                              <Badge tone="orange">{bookedCount} {t('slots.booked')}</Badge>
                            )}
                            {availableCount > 0 && (
                              <Badge tone="green">{availableCount} {t('slots.available')}</Badge>
                            )}
                          </div>
                        </div>

                        {/* Expanded Slots */}
                        {isExpanded && (
                          <div className="divide-y">
                            {daySlots.map(slot => {
                              const booking = slot.isBooked ? getBookingForSlot(slot._id) : null;
                              const startTime = new Date(slot.startsAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false });
                              const endTime = new Date(slot.endsAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false });

                              return (
                                <div
                                  key={slot._id}
                                  className={`flex items-center gap-3 p-3 ${
                                    selectedSlots.includes(slot._id) ? 'bg-blue-50' : ''
                                  } ${slot.isBooked ? 'bg-orange-50' : 'hover:bg-gray-50'}`}
                                >
                                  {/* Checkbox */}
                                  <input
                                    type="checkbox"
                                    checked={selectedSlots.includes(slot._id)}
                                    onChange={() => handleSelectSlot(slot._id)}
                                    disabled={slot.isBooked}
                                    className={`w-4 h-4 rounded border-gray-300 ${slot.isBooked ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  />

                                  {/* Time */}
                                  <div className="w-28 flex-shrink-0">
                                    <span className="font-mono text-sm font-medium">
                                      {startTime} - {endTime}
                                    </span>
                                  </div>

                                  {/* Topic */}
                                  <div className="flex-1">
                                    <span className="text-sm text-gray-700">{slot.topic}</span>
                                  </div>

                                  {/* Booking Info or Status */}
                                  <div className="flex items-center gap-2">
                                    {slot.isBooked && booking ? (
                                      <>
                                        <div className="text-right">
                                          <div className="text-sm font-medium text-gray-800">
                                            {booking.user?.name || 'Unknown'}
                                          </div>
                                          <div className="text-xs text-gray-500">
                                            {booking.user?.email}
                                          </div>
                                        </div>
                                        <Badge tone={
                                          booking.status === 'approved' ? 'green' :
                                          booking.status === 'pending' ? 'orange' :
                                          booking.status === 'rejected' ? 'gray' : 'blue'
                                        }>
                                          {booking.status === 'approved' ? t('slots.statusApproved') :
                                           booking.status === 'pending' ? t('slots.statusPending') :
                                           booking.status}
                                        </Badge>
                                      </>
                                    ) : (
                                      <Badge tone="green">{t('slots.available')}</Badge>
                                    )}
                                  </div>

                                  {/* Delete Button */}
                                  {!slot.isBooked && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleDeleteSlot(slot._id); }}
                                      className="text-red-600 hover:underline text-sm ml-2"
                                    >
                                      {tCourses('delete')}
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Bookings Tab */}
      {activeTab === "bookings" && (
        <Card>
          <h3 className="mb-4 font-semibold">{t('bookings.title')}</h3>
          {bookings.length === 0 ? (
            <p className="text-gray-500">{t('bookings.noBookings')}</p>
          ) : (
            <div className="grid gap-4">
              {bookings.map(booking => (
                <div key={booking._id} className="border-b pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{booking.slotId?.topic || t('bookings.title')}</span>
                        <Badge tone={
                          booking.status === "approved" ? "green" :
                          booking.status === "pending" ? "orange" :
                          booking.status === "rejected" ? "gray" : "blue"
                        }>
                          {booking.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        {t('bookings.student')}: {booking.user?.name} ({booking.user?.email})
                      </p>
                      {booking.slotId && (
                        <p className="text-sm text-gray-500">
                          {formatSlotTime(booking.slotId.startsAt, booking.slotId.endsAt)}
                        </p>
                      )}
                      {booking.meetingLink && (
                        <p className="text-sm text-blue-600 mt-1">
                          {t('bookings.meeting')}: <a href={booking.meetingLink} target="_blank" rel="noopener noreferrer" className="hover:underline">{booking.meetingLink}</a>
                        </p>
                      )}

                      {managingBooking === booking._id && (
                        <div className="mt-3 grid gap-2">
                          <Input
                            placeholder={t('bookings.meetingLinkPlaceholder')}
                            value={meetingLink}
                            onChange={e => setMeetingLink(e.target.value)}
                          />
                          <div className="flex gap-2">
                            <Button onClick={() => handleUpdateBooking(booking._id, "approve")}>{t('bookings.approve')}</Button>
                            <button
                              onClick={() => handleUpdateBooking(booking._id, "reject")}
                              className="rounded bg-red-100 px-4 py-2 text-red-800 hover:bg-red-200"
                            >
                              {t('bookings.reject')}
                            </button>
                            <button onClick={() => setManagingBooking(null)} className="text-gray-600 hover:underline">{tCourses('cancel')}</button>
                          </div>
                        </div>
                      )}
                    </div>
                    {booking.status === "pending" && managingBooking !== booking._id && (
                      <button
                        onClick={() => { setManagingBooking(booking._id); setMeetingLink(""); }}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        {t('bookings.manage')}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
