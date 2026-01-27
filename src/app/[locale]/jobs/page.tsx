"use client";

import { useEffect, useState, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Badge, Input } from "@/components/UI";

interface Job {
  _id: string;
  company: string;
  title: string;
  location: string;
  employmentType: string;
  salary: string;
  requirements: string;
  description?: string;
  companyLogo?: string;
  applyUrl?: string;
  createdAt: string;
}

interface Bookmark {
  _id: string;
  job: string;
}

export default function JobsPage() {
  const t = useTranslations("jobs");
  const locale = useLocale();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookmarking, setBookmarking] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const [jobsRes, bookmarksRes] = await Promise.all([
          fetch("/api/jobs"),
          fetch("/api/bookmarks"),
        ]);
        if (jobsRes.ok) setJobs((await jobsRes.json()).jobs || []);
        if (bookmarksRes.ok) setBookmarks((await bookmarksRes.json()).bookmarks || []);
      } catch (error) {
        console.error("Error fetching jobs:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const locations = useMemo(() => [...new Set(jobs.map(j => j.location).filter(Boolean))], [jobs]);

  const filteredJobs = useMemo(() => {
    let list = jobs;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(j => j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q) || j.requirements.toLowerCase().includes(q));
    }
    if (typeFilter) list = list.filter(j => j.employmentType === typeFilter);
    if (locationFilter) list = list.filter(j => j.location === locationFilter);
    return list;
  }, [jobs, search, typeFilter, locationFilter]);

  const isBookmarked = (jobId: string) => bookmarks.some((b) => b.job === jobId);
  const getBookmarkId = (jobId: string) => bookmarks.find((b) => b.job === jobId)?._id;

  const handleBookmark = async (jobId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setBookmarking(jobId);
    try {
      if (isBookmarked(jobId)) {
        const res = await fetch(`/api/bookmarks?id=${getBookmarkId(jobId)}`, { method: "DELETE" });
        if (res.ok) setBookmarks(bookmarks.filter((b) => b.job !== jobId));
      } else {
        const res = await fetch("/api/bookmarks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId }),
        });
        if (res.ok) {
          const data = await res.json();
          setBookmarks([...bookmarks, data.bookmark]);
        }
      }
    } catch (error) {
      console.error("Error bookmarking:", error);
    } finally {
      setBookmarking(null);
    }
  };

  const getEmploymentTypeLabel = (type: string) => {
    if (locale === 'ko') {
      switch (type.toLowerCase()) {
        case "full-time": return "정규직";
        case "part-time": return "파트타임";
        case "contract": return "계약직";
        default: return type;
      }
    }
    return type;
  };

  const getEmploymentTypeBadge = (type: string): "green" | "blue" | "orange" | "gray" => {
    switch (type.toLowerCase()) {
      case "full-time": return "green";
      case "part-time": return "blue";
      case "contract": return "orange";
      default: return "gray";
    }
  };

  const getTimeAgo = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return locale === 'ko' ? '오늘' : 'Today';
    if (diffDays === 1) return locale === 'ko' ? '어제' : 'Yesterday';
    if (diffDays < 7) return locale === 'ko' ? `${diffDays}일 전` : `${diffDays}d ago`;
    if (diffDays < 30) return locale === 'ko' ? `${Math.floor(diffDays / 7)}주 전` : `${Math.floor(diffDays / 7)}w ago`;
    return date.toLocaleDateString(locale);
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <span className="text-sm text-gray-500">
          {filteredJobs.length} {locale === 'ko' ? '개의 채용공고' : 'jobs'}
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 p-4 bg-gray-50 rounded-lg">
        <Input
          placeholder={locale === 'ko' ? '회사명, 직무 검색...' : 'Search company, position...'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px]"
        />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rounded border px-3 py-2 bg-white">
          <option value="">{locale === 'ko' ? '전체 유형' : 'All Types'}</option>
          <option value="Full-time">{locale === 'ko' ? '정규직' : 'Full-time'}</option>
          <option value="Part-time">{locale === 'ko' ? '파트타임' : 'Part-time'}</option>
          <option value="Contract">{locale === 'ko' ? '계약직' : 'Contract'}</option>
        </select>
        <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} className="rounded border px-3 py-2 bg-white">
          <option value="">{locale === 'ko' ? '전체 지역' : 'All Locations'}</option>
          {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
        </select>
      </div>

      {filteredJobs.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <p className="text-gray-500">{locale === 'ko' ? '채용 공고가 없습니다.' : 'No jobs available.'}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredJobs.map((job) => (
            <div
              key={job._id}
              onClick={() => setSelectedJob(job)}
              className="bg-white rounded-xl border hover:border-blue-300 hover:shadow-lg transition-all cursor-pointer overflow-hidden group"
            >
              {/* Card Header with Logo */}
              <div className="p-4 border-b bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-center gap-3">
                  {/* Company Logo */}
                  <div className="w-14 h-14 rounded-lg bg-white border flex items-center justify-center overflow-hidden flex-shrink-0">
                    {job.companyLogo ? (
                      <img src={job.companyLogo} alt={job.company} className="w-full h-full object-contain p-1" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
                        {job.company.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                      {job.company}
                    </h3>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {job.location || (locale === 'ko' ? '위치 미정' : 'Location TBD')}
                    </p>
                  </div>
                  {/* Bookmark Button */}
                  <button
                    onClick={(e) => handleBookmark(job._id, e)}
                    disabled={bookmarking === job._id}
                    className={`p-2 rounded-full transition-colors ${
                      isBookmarked(job._id) ? 'text-yellow-500 bg-yellow-50' : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50'
                    }`}
                  >
                    {isBookmarked(job._id) ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4">
                <h4 className="font-semibold text-gray-800 line-clamp-2 min-h-[48px]">{job.title}</h4>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge tone={getEmploymentTypeBadge(job.employmentType)}>
                    {getEmploymentTypeLabel(job.employmentType)}
                  </Badge>
                  {job.salary && (
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                      {job.salary}
                    </span>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
                  <span>{getTimeAgo(job.createdAt)}</span>
                  <span className="text-blue-500 group-hover:underline">
                    {locale === 'ko' ? '상세보기 →' : 'View Details →'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Job Detail Modal */}
      {selectedJob && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedJob(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="relative bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
              <button
                onClick={() => setSelectedJob(null)}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/20 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-xl bg-white flex items-center justify-center overflow-hidden">
                  {selectedJob.companyLogo ? (
                    <img src={selectedJob.companyLogo} alt={selectedJob.company} className="w-full h-full object-contain p-2" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-600 font-bold text-2xl">
                      {selectedJob.company.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{selectedJob.company}</h2>
                  <p className="text-blue-100 flex items-center gap-1 mt-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    {selectedJob.location || (locale === 'ko' ? '위치 미정' : 'Location TBD')}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-280px)]">
              <h3 className="text-xl font-bold text-gray-900 mb-4">{selectedJob.title}</h3>

              <div className="flex flex-wrap gap-3 mb-6">
                <Badge tone={getEmploymentTypeBadge(selectedJob.employmentType)}>
                  {getEmploymentTypeLabel(selectedJob.employmentType)}
                </Badge>
                {selectedJob.salary && (
                  <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                    💰 {selectedJob.salary}
                  </span>
                )}
                <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm">
                  📅 {getTimeAgo(selectedJob.createdAt)}
                </span>
              </div>

              {/* Requirements */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {locale === 'ko' ? '자격 요건' : 'Requirements'}
                </h4>
                <div className="bg-gray-50 rounded-lg p-4 text-gray-700 whitespace-pre-wrap">
                  {selectedJob.requirements || (locale === 'ko' ? '상세 요건은 문의해주세요.' : 'Please inquire for details.')}
                </div>
              </div>

              {/* Description if available */}
              {selectedJob.description && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h12" />
                    </svg>
                    {locale === 'ko' ? '상세 설명' : 'Description'}
                  </h4>
                  <div
                    className="bg-gray-50 rounded-lg p-4 text-gray-700 prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: selectedJob.description }}
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t p-4 bg-gray-50 flex items-center justify-between">
              <button
                onClick={(e) => handleBookmark(selectedJob._id, e)}
                disabled={bookmarking === selectedJob._id}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  isBookmarked(selectedJob._id)
                    ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {isBookmarked(selectedJob._id) ? '★' : '☆'}
                {isBookmarked(selectedJob._id)
                  ? (locale === 'ko' ? '북마크됨' : 'Bookmarked')
                  : (locale === 'ko' ? '북마크' : 'Bookmark')
                }
              </button>

              {selectedJob.applyUrl ? (
                <a
                  href={selectedJob.applyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  {locale === 'ko' ? '지원하기' : 'Apply Now'}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              ) : (
                <span className="text-gray-400 text-sm">{locale === 'ko' ? '지원 링크 없음' : 'No apply link'}</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
