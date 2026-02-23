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

interface Application { _id: string; program: string; status: string; }
interface CategoryItem { _id: string; name: string; label: string; }

type StatusTab = "all" | "open" | "upcoming" | "closed";

export default function ProgramsPage() {
  const t = useTranslations("programs");
  const tAdmin = useTranslations("admin.programs");
  const locale = useLocale();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<StatusTab>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

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
      } catch (err) {
        console.error("Error fetching programs:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const getCategoryLabel = (name: string) => categories.find(c => c.name === name)?.label || name;

  const filteredPrograms = useMemo(() => {
    let list = programs;
    if (activeTab !== "all") list = list.filter(p => p.status === activeTab);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
    }
    return list;
  }, [programs, activeTab, search]);

  const counts = useMemo(() => ({
    all: programs.length,
    open: programs.filter(p => p.status === 'open').length,
    upcoming: programs.filter(p => p.status === 'upcoming').length,
    closed: programs.filter(p => p.status === 'closed').length,
  }), [programs]);

  const hasApplied = (id: string) => applications.some(a => a.program === id);
  const getAppStatus = (id: string) => applications.find(a => a.program === id)?.status;

  const allSelected = filteredPrograms.length > 0 && filteredPrograms.every(p => selected.has(p._id));
  const toggleAll = () => {
    if (allSelected) {
      setSelected(prev => { const s = new Set(prev); filteredPrograms.forEach(p => s.delete(p._id)); return s; });
    } else {
      setSelected(prev => { const s = new Set(prev); filteredPrograms.forEach(p => s.add(p._id)); return s; });
    }
  };
  const toggleOne = (id: string) => setSelected(prev => {
    const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s;
  });

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    const confirm = window.confirm(
      locale === 'ko'
        ? `선택한 ${selected.size}개의 프로그램을 삭제하시겠습니까?`
        : `Delete ${selected.size} selected program${selected.size > 1 ? 's' : ''}?`
    );
    if (!confirm) return;
    setDeleting(true);
    try {
      await Promise.all([...selected].map(id =>
        fetch(`/api/programs?id=${id}`, { method: 'DELETE' })
      ));
      setPrograms(prev => prev.filter(p => !selected.has(p._id)));
      setSelected(new Set());
    } catch (err) {
      console.error('Bulk delete error:', err);
    } finally {
      setDeleting(false);
    }
  };

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
        setApplications(prev => [...prev, data.application]);
      }
    } catch (err) {
      console.error("Apply error:", err);
    } finally {
      setApplying(null);
    }
  };

  const TABS: { key: StatusTab; label: string }[] = [
    { key: "all", label: locale === 'ko' ? '전체' : 'All' },
    { key: "open", label: locale === 'ko' ? '모집중' : 'Ongoing' },
    { key: "upcoming", label: locale === 'ko' ? '마감예정' : 'Closing Soon' },
    { key: "closed", label: locale === 'ko' ? '종료' : 'Ended' },
  ];

  const statusColor: Record<string, string> = {
    open: 'text-green-700 bg-green-50',
    upcoming: 'text-orange-700 bg-orange-50',
    closed: 'text-gray-500 bg-gray-100',
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600" />
    </div>
  );

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
        <p className="text-sm text-gray-500 mt-1">{locale === 'ko' ? '참여 가능한 프로그램을 확인하고 신청하세요.' : 'Browse and apply for available programs.'}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Main content */}
        <div className="lg:col-span-3 grid gap-4">
          {/* Status Tabs */}
          <div className="flex border-b">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                {tab.label}
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                  {counts[tab.key]}
                </span>
              </button>
            ))}
          </div>

          {/* Search + Bulk Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <Input
              placeholder={locale === 'ko' ? '프로그램 검색...' : 'Search programs...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
            {selected.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  {locale === 'ko' ? `${selected.size}개 선택됨` : `${selected.size} selected`}
                </span>
                <button
                  onClick={handleBulkDelete}
                  disabled={deleting}
                  className="rounded bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {deleting
                    ? (locale === 'ko' ? '삭제 중...' : 'Deleting...')
                    : (locale === 'ko' ? '선택 삭제' : 'Delete Selected')}
                </button>
                <button
                  onClick={() => setSelected(new Set())}
                  className="rounded border px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  {locale === 'ko' ? '선택 해제' : 'Clear'}
                </button>
              </div>
            )}
          </div>

          {/* Table */}
          {filteredPrograms.length === 0 ? (
            <Card>
              <p className="text-center text-gray-400 py-8">{locale === 'ko' ? '프로그램이 없습니다.' : 'No programs found.'}</p>
            </Card>
          ) : (
            <div className="overflow-x-auto rounded-lg border bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleAll}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        title={locale === 'ko' ? '전체 선택' : 'Select all'}
                      />
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">{locale === 'ko' ? '프로그램명' : 'Program'}</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">{locale === 'ko' ? '분야' : 'Field'}</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">{locale === 'ko' ? '모집기간' : 'Period'}</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">{locale === 'ko' ? '상태' : 'Status'}</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">{locale === 'ko' ? '신청' : 'Apply'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredPrograms.map(p => {
                    const applied = hasApplied(p._id);
                    const appStatus = getAppStatus(p._id);
                    const isSelected = selected.has(p._id);
                    return (
                      <tr key={p._id} className={`hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleOne(p._id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700">
                            {getCategoryLabel(p.category)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {new Date(p.startDate).toLocaleDateString(locale)} ~ {new Date(p.endDate).toLocaleDateString(locale)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${statusColor[p.status] || 'bg-gray-100 text-gray-600'}`}>
                            {tAdmin(p.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {applied ? (
                            <Badge tone={appStatus === 'approved' ? 'green' : appStatus === 'rejected' ? 'gray' : 'orange'}>
                              {appStatus || '—'}
                            </Badge>
                          ) : p.status === "open" ? (
                            <Button
                              onClick={() => handleApply(p._id)}
                              disabled={applying === p._id}
                              className="text-xs px-3 py-1 h-auto"
                            >
                              {applying === p._id ? '...' : t("apply")}
                            </Button>
                          ) : (
                            <span className="text-xs text-gray-400">{t("unavailable")}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="grid gap-4 content-start">
          <Card>
            <h3 className="font-bold text-gray-900 mb-3">{locale === 'ko' ? '신청 안내' : 'How to Apply'}</h3>
            <ol className="space-y-4">
              {[
                { step: '01', title: locale === 'ko' ? '프로그램 선택' : 'Select Program', desc: locale === 'ko' ? '원하는 프로그램을 찾으세요.' : 'Find your desired program.' },
                { step: '02', title: locale === 'ko' ? '신청서 작성' : 'Fill Application', desc: locale === 'ko' ? '신청 버튼을 눌러 접수하세요.' : 'Click Apply to submit.' },
                { step: '03', title: locale === 'ko' ? '승인 대기' : 'Await Approval', desc: locale === 'ko' ? '담당자 검토 후 승인됩니다.' : 'Review and approval by staff.' },
              ].map(s => (
                <li key={s.step} className="flex gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">{s.step}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{s.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>

          <Card>
            <h3 className="font-bold text-gray-900 mb-2">{locale === 'ko' ? '문의하기' : 'Contact Us'}</h3>
            <p className="text-sm text-gray-600 mb-3">{locale === 'ko' ? '프로그램 관련 문의는 고객지원을 이용하세요.' : 'For program inquiries, please use our support center.'}</p>
            <a href={`/${locale}/support`} className="inline-block text-sm text-blue-600 hover:underline font-medium">
              {locale === 'ko' ? '고객지원 바로가기 →' : 'Go to Support →'}
            </a>
          </Card>
        </div>
      </div>
    </div>
  );
}
