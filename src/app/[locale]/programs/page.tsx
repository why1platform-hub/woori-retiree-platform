"use client";

import { useEffect, useState, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card, Badge, Button, Input } from "@/components/UI";

interface Program {
  _id: string;
  name: string;
  category: string;
  description: string;
  imageUrl?: string;
  startDate: string;
  endDate: string;
  status: "upcoming" | "open" | "closed";
}

interface Application {
  _id: string;
  program: string;
  status: string;
}

interface CategoryItem {
  _id: string;
  name: string;
  label: string;
}

export default function ProgramsPage() {
  const t = useTranslations("programs");
  const tAdmin = useTranslations("admin.programs");
  const locale = useLocale();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const [programsRes, appsRes, catRes] = await Promise.all([
          fetch("/api/programs"),
          fetch("/api/applications"),
          fetch("/api/categories"),
        ]);

        if (programsRes.ok) setPrograms((await programsRes.json()).programs || []);
        if (appsRes.ok) setApplications((await appsRes.json()).applications || []);
        if (catRes.ok) setCategories((await catRes.json()).categories || []);
      } catch (error) {
        console.error("Error fetching programs:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const filteredPrograms = useMemo(() => {
    let list = programs;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
    }
    if (categoryFilter) list = list.filter(p => p.category === categoryFilter);
    if (statusFilter) list = list.filter(p => p.status === statusFilter);
    return list;
  }, [programs, search, categoryFilter, statusFilter]);

  const hasApplied = (programId: string) => applications.some((app) => app.program === programId);
  const getApplicationStatus = (programId: string) => applications.find((app) => app.program === programId)?.status;

  const handleApply = async (programId: string) => {
    setApplying(programId);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programId }),
      });
      if (res.ok) {
        const data = await res.json();
        setApplications([...applications, data.application]);
      }
    } catch (error) {
      console.error("Error applying:", error);
    } finally {
      setApplying(null);
    }
  };

  const getStatusTone = (status: string): "green" | "orange" | "gray" => {
    switch (status) {
      case "open": return "green";
      case "upcoming": return "orange";
      default: return "gray";
    }
  };

  const getCategoryLabel = (category: string) => {
    const cat = categories.find(c => c.name === category);
    return cat?.label || category;
  };

  if (loading) {
    return (
      <div className="grid gap-4">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-gray-600">{locale === 'ko' ? '로딩 중...' : 'Loading...'}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder={locale === 'ko' ? '검색...' : 'Search...'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="rounded border px-3 py-2">
          <option value="">{locale === 'ko' ? '전체 카테고리' : 'All Categories'}</option>
          {categories.map(cat => <option key={cat._id} value={cat.name}>{cat.label}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded border px-3 py-2">
          <option value="">{locale === 'ko' ? '전체 상태' : 'All Status'}</option>
          <option value="upcoming">{tAdmin("upcoming")}</option>
          <option value="open">{tAdmin("open")}</option>
          <option value="closed">{tAdmin("closed")}</option>
        </select>
      </div>

      {filteredPrograms.length === 0 ? (
        <Card>
          <p className="text-gray-500">{locale === 'ko' ? '프로그램이 없습니다.' : 'No programs available.'}</p>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPrograms.map((program) => (
            <div key={program._id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow">
              {/* Cover Image */}
              <div className="relative h-40 bg-gradient-to-br from-blue-100 to-blue-200">
                {program.imageUrl ? (
                  <img
                    src={program.imageUrl}
                    alt={program.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-blue-400">
                    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                )}
                {/* Status Badge */}
                <div className="absolute top-3 right-3">
                  <Badge tone={getStatusTone(program.status)}>{tAdmin(program.status)}</Badge>
                </div>
                {/* Category */}
                <div className="absolute bottom-3 left-3">
                  <span className="bg-white/90 backdrop-blur px-2 py-1 rounded text-xs font-medium text-gray-700">
                    {getCategoryLabel(program.category)}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-bold text-lg text-gray-900 line-clamp-1">{program.name}</h3>
                <p className="mt-2 text-sm text-gray-500">
                  {new Date(program.startDate).toLocaleDateString(locale)} ~ {new Date(program.endDate).toLocaleDateString(locale)}
                </p>

                {/* Action */}
                <div className="mt-4">
                  {hasApplied(program._id) ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">{locale === 'ko' ? '신청됨' : 'Applied'}</span>
                      <Badge tone={getApplicationStatus(program._id) === "approved" ? "green" : getApplicationStatus(program._id) === "rejected" ? "gray" : "orange"}>
                        {getApplicationStatus(program._id)}
                      </Badge>
                    </div>
                  ) : program.status === "open" ? (
                    <Button onClick={() => handleApply(program._id)} disabled={applying === program._id} className="w-full">
                      {applying === program._id ? "..." : t("apply")}
                    </Button>
                  ) : (
                    <span className="text-sm text-gray-400">{t("unavailable")}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
