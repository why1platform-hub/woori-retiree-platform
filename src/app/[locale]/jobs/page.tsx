"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { Badge, Input, Card } from "@/components/UI";

interface Job {
  _id: string; company: string; title: string; location: string; employmentType: string;
  salary: string; requirements: string; description?: string; companyLogo?: string; applyUrl?: string; createdAt: string;
}
interface Bookmark { _id: string; job: string; }

export default function JobsPage() {
  const t = useTranslations("jobs");
  const locale = useLocale();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookmarking, setBookmarking] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const [jobsRes, bkRes] = await Promise.all([fetch("/api/jobs"), fetch("/api/bookmarks")]);
        if (jobsRes.ok) setJobs((await jobsRes.json()).jobs || []);
        if (bkRes.ok) setBookmarks((await bkRes.json()).bookmarks || []);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    }
    fetchData();
  }, []);

  const locations = useMemo(() => [...new Set(jobs.map(j => j.location).filter(Boolean))], [jobs]);

  const filteredJobs = useMemo(() => {
    let list = jobs;
    if (search) { const q = search.toLowerCase(); list = list.filter(j => j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q) || j.requirements.toLowerCase().includes(q)); }
    if (typeFilter) list = list.filter(j => j.employmentType === typeFilter);
    if (locationFilter) list = list.filter(j => j.location === locationFilter);
    return list;
  }, [jobs, search, typeFilter, locationFilter]);

  const isBookmarked = (id: string) => bookmarks.some(b => b.job === id);

  const handleBookmark = async (jobId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setBookmarking(jobId);
    try {
      if (isBookmarked(jobId)) {
        const res = await fetch(`/api/bookmarks?jobId=${jobId}`, { method: "DELETE" });
        if (res.ok) setBookmarks(prev => prev.filter(b => b.job !== jobId));
      } else {
        const res = await fetch("/api/bookmarks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobId }) });
        if (res.ok) { const d = await res.json(); setBookmarks(prev => [...prev, d.bookmark]); }
      }
    } catch (err) { console.error(err); } finally { setBookmarking(null); }
  };

  const getTypeLabel = (type: string) => {
    if (locale !== 'ko') return type;
    return type === 'Full-time' ? '정규직' : type === 'Part-time' ? '파트타임' : type === 'Contract' ? '계약직' : type;
  };

  const getTypeTone = (type: string): "green" | "blue" | "orange" | "gray" => {
    switch (type.toLowerCase()) {
      case "full-time": return "green"; case "part-time": return "blue"; case "contract": return "orange"; default: return "gray";
    }
  };

  const getTimeAgo = (d: string) => {
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
    if (diff === 0) return locale === 'ko' ? '오늘' : 'Today';
    if (diff === 1) return locale === 'ko' ? '어제' : 'Yesterday';
    if (diff < 7) return locale === 'ko' ? `${diff}일 전` : `${diff}d ago`;
    if (diff < 30) return locale === 'ko' ? `${Math.floor(diff / 7)}주 전` : `${Math.floor(diff / 7)}w ago`;
    return new Date(d).toLocaleDateString(locale);
  };

  const bookmarkedJobs = useMemo(() => jobs.filter(j => isBookmarked(j._id)).slice(0, 3), [jobs, bookmarks]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600" />
    </div>
  );

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {filteredJobs.length} {locale === 'ko' ? '개의 채용공고' : 'positions available'}
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3 p-4 bg-gray-50 rounded-lg border">
        <Input
          placeholder={locale === 'ko' ? '회사명, 직무 검색...' : 'Search company, position...'}
          value={search} onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-[180px] bg-white"
        />
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="rounded border px-3 py-2 bg-white text-sm">
          <option value="">{locale === 'ko' ? '전체 유형' : 'All Types'}</option>
          <option value="Full-time">{locale === 'ko' ? '정규직' : 'Full-time'}</option>
          <option value="Part-time">{locale === 'ko' ? '파트타임' : 'Part-time'}</option>
          <option value="Contract">{locale === 'ko' ? '계약직' : 'Contract'}</option>
        </select>
        <select value={locationFilter} onChange={e => setLocationFilter(e.target.value)} className="rounded border px-3 py-2 bg-white text-sm">
          <option value="">{locale === 'ko' ? '전체 지역' : 'All Locations'}</option>
          {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
        </select>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Main: 2-col job grid */}
        <div className="lg:col-span-3">
          {filteredJobs.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-lg border">
              <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <p className="text-gray-500 text-sm">{locale === 'ko' ? '채용 공고가 없습니다.' : 'No jobs found.'}</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filteredJobs.map(job => (
                <div key={job._id} onClick={() => setSelectedJob(job)}
                  className="bg-white rounded-xl border hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group overflow-hidden">
                  <div className="p-4 border-b bg-gradient-to-r from-gray-50 to-white">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-white border flex items-center justify-center overflow-hidden flex-shrink-0">
                        {job.companyLogo
                          ? <img src={job.companyLogo} alt={job.company} className="w-full h-full object-contain p-1" />
                          : <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white font-bold">{job.company.charAt(0)}</div>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-gray-900 group-hover:text-blue-600 line-clamp-1">{job.company}</p>
                        <p className="text-xs text-gray-500">{job.location || '—'}</p>
                      </div>
                      <button onClick={e => handleBookmark(job._id, e)} disabled={bookmarking === job._id}
                        className={`p-1.5 rounded-full transition-colors ${isBookmarked(job._id) ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-400'}`}>
                        {isBookmarked(job._id)
                          ? <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                          : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                        }
                      </button>
                    </div>
                  </div>
                  <div className="p-4">
                    <h4 className="font-semibold text-gray-800 text-sm line-clamp-2">{job.title}</h4>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge tone={getTypeTone(job.employmentType)}>{getTypeLabel(job.employmentType)}</Badge>
                      {job.salary && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{job.salary}</span>}
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                      <span>{getTimeAgo(job.createdAt)}</span>
                      <span className="text-blue-500">{locale === 'ko' ? '상세보기 →' : 'Details →'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="grid gap-4 content-start">
          {/* Bookmarked Jobs */}
          <Card>
            <h3 className="font-bold text-gray-900 mb-3">
              {locale === 'ko' ? '관심 채용' : 'Saved Jobs'}
              {bookmarkedJobs.length > 0 && <span className="ml-1.5 text-xs text-gray-500">({bookmarkedJobs.length})</span>}
            </h3>
            {bookmarkedJobs.length === 0 ? (
              <p className="text-xs text-gray-400">{locale === 'ko' ? '관심 채용을 추가해보세요.' : 'Save jobs for later.'}</p>
            ) : (
              <div className="space-y-2">
                {bookmarkedJobs.map(job => (
                  <button key={job._id} onClick={() => setSelectedJob(job)} className="w-full text-left p-2 rounded hover:bg-gray-50 transition-colors">
                    <p className="text-sm font-medium text-gray-800 line-clamp-1">{job.title}</p>
                    <p className="text-xs text-gray-500">{job.company}</p>
                  </button>
                ))}
              </div>
            )}
          </Card>

          {/* Resume */}
          <Card>
            <h3 className="font-bold text-gray-900 mb-2">{locale === 'ko' ? '이력서 관리' : 'My Resume'}</h3>
            <p className="text-xs text-gray-500 mb-3">{locale === 'ko' ? '이력서를 최신 상태로 유지하세요.' : 'Keep your resume up to date.'}</p>
            <Link href={`/${locale}/my-activity`} className="text-sm text-blue-600 hover:underline font-medium">
              {locale === 'ko' ? '이력서 편집 →' : 'Edit Resume →'}
            </Link>
          </Card>
        </div>
      </div>

      {/* Job Detail Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setSelectedJob(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="relative bg-gradient-to-r from-blue-700 to-blue-600 text-white p-6">
              <button onClick={() => setSelectedJob(null)} className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/20">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-white flex items-center justify-center overflow-hidden">
                  {selectedJob.companyLogo
                    ? <img src={selectedJob.companyLogo} alt={selectedJob.company} className="w-full h-full object-contain p-1" />
                    : <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-xl">{selectedJob.company.charAt(0)}</div>
                  }
                </div>
                <div>
                  <h2 className="text-xl font-bold">{selectedJob.company}</h2>
                  <p className="text-blue-100 text-sm">{selectedJob.location || '—'}</p>
                </div>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-240px)]">
              <h3 className="text-lg font-bold text-gray-900 mb-3">{selectedJob.title}</h3>
              <div className="flex flex-wrap gap-2 mb-5">
                <Badge tone={getTypeTone(selectedJob.employmentType)}>{getTypeLabel(selectedJob.employmentType)}</Badge>
                {selectedJob.salary && <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm">💰 {selectedJob.salary}</span>}
                <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-sm">📅 {getTimeAgo(selectedJob.createdAt)}</span>
              </div>
              <div className="mb-4">
                <h4 className="font-semibold text-gray-900 mb-2 text-sm">{locale === 'ko' ? '자격 요건' : 'Requirements'}</h4>
                <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap">{selectedJob.requirements || '—'}</div>
              </div>
              {selectedJob.description && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2 text-sm">{locale === 'ko' ? '상세 설명' : 'Description'}</h4>
                  <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: selectedJob.description }} />
                </div>
              )}
            </div>
            <div className="border-t p-4 bg-gray-50 flex items-center justify-between">
              <button onClick={e => handleBookmark(selectedJob._id, e)} disabled={bookmarking === selectedJob._id}
                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 ${isBookmarked(selectedJob._id) ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                {isBookmarked(selectedJob._id) ? '★' : '☆'}
                {isBookmarked(selectedJob._id) ? (locale === 'ko' ? '북마크됨' : 'Saved') : (locale === 'ko' ? '저장' : 'Save')}
              </button>
              {selectedJob.applyUrl
                ? <a href={selectedJob.applyUrl} target="_blank" rel="noopener noreferrer" className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-1.5">
                    {locale === 'ko' ? '지원하기' : 'Apply Now'}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </a>
                : <span className="text-gray-400 text-sm">{locale === 'ko' ? '지원 링크 없음' : 'No apply link'}</span>
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
