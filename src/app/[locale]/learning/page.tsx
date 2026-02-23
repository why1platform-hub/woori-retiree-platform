"use client";

import { useEffect, useState, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card, Badge, Input } from "@/components/UI";

interface CategoryItem { _id: string; name: string; label: string; order: number; }

interface Course {
  _id: string;
  title: string;
  category: string;
  description: string;
  durationMinutes: number;
  thumbnailUrl?: string;
  videoUrl: string;
  instructor: { _id: string; name: string };
  views: number;
  createdAt: string;
}

interface Resource {
  _id: string;
  title: string;
  category: string;
  description: string;
  fileUrl: string;
  fileSize: number;
  downloadCount: number;
  createdAt: string;
}

export default function LearningPage() {
  const t = useTranslations("learning");
  const tAdmin = useTranslations("admin.courses");
  const locale = useLocale();
  const [courses, setCourses] = useState<Course[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"courses" | "resources">("courses");
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [darkMode, setDarkMode] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const [coursesRes, resourcesRes, categoriesRes] = await Promise.all([
          fetch("/api/courses"),
          fetch("/api/resources"),
          fetch("/api/categories"),
        ]);
        if (coursesRes.ok) setCourses((await coursesRes.json()).courses || []);
        if (resourcesRes.ok) setResources((await resourcesRes.json()).resources || []);
        if (categoriesRes.ok) setCategories((await categoriesRes.json()).categories || []);
      } catch (err) {
        console.error("Error fetching learning data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const getCategoryLabel = (category: string) => categories.find(c => c.name === category)?.label || category;

  const getCategoryTone = (category: string): "green" | "blue" | "orange" | "gray" => {
    const tones: ("green" | "blue" | "orange" | "gray")[] = ["green", "blue", "orange", "gray"];
    const cat = categories.find(c => c.name === category);
    return tones[(cat?.order ?? 3) % tones.length];
  };

  const filteredCourses = useMemo(() => {
    let list = courses;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c => c.title.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q));
    }
    if (categoryFilter) list = list.filter(c => c.category === categoryFilter);
    return list;
  }, [courses, search, categoryFilter]);

  const filteredResources = useMemo(() => {
    let list = resources;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r => r.title.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q));
    }
    if (categoryFilter) list = list.filter(r => r.category === categoryFilter);
    return list;
  }, [resources, search, categoryFilter]);

  // Sidebar data
  const recentCourses = useMemo(() =>
    [...courses].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 2)
  , [courses]);

  const popularResources = useMemo(() =>
    [...resources].sort((a, b) => b.downloadCount - a.downloadCount).slice(0, 3)
  , [resources]);

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60), m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getEmbedUrl = (url: string) => {
    if (!url) return "";
    url = url.trim();
    if (url.includes("/embed/")) return url;
    let videoId: string | null = null;
    const watchMatch = url.match(/(?:youtube\.com|www\.youtube\.com)\/watch\?(?:.*&)?v=([^&]+)/);
    if (watchMatch) videoId = watchMatch[1];
    if (!videoId) { const m = url.match(/youtu\.be\/([^?&#]+)/); if (m) videoId = m[1]; }
    if (!videoId) { const m = url.match(/youtube\.com\/v\/([^?&#]+)/); if (m) videoId = m[1]; }
    if (!videoId) { const m = url.match(/youtube\.com\/shorts\/([^?&#]+)/); if (m) videoId = m[1]; }
    if (!videoId) { const m = url.match(/youtube\.com\/live\/([^?&#]+)/); if (m) videoId = m[1]; }
    if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    if (url.includes("drive.google.com") && url.includes("/view")) return url.replace("/view", "/preview");
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    return url;
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600" />
    </div>
  );

  // Video player view (full-width)
  if (selectedCourse) {
    const embedUrl = getEmbedUrl(selectedCourse.videoUrl);
    const isValidEmbed = embedUrl && (
      embedUrl.includes("/embed/") ||
      embedUrl.includes("player.vimeo.com") ||
      embedUrl.includes("drive.google.com")
    );

    return (
      <div className={`min-h-screen -m-4 p-4 transition-colors duration-300 ${darkMode ? "bg-gray-900" : "bg-white"}`}>
        <div className="grid gap-6 max-w-5xl mx-auto">
          <div className="flex items-center justify-between">
            <button onClick={() => setSelectedCourse(null)}
              className={`hover:underline text-sm ${darkMode ? "text-blue-400" : "text-blue-600"}`}>
              ← {locale === 'ko' ? '강좌 목록으로' : 'Back to courses'}
            </button>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${darkMode ? "bg-gray-700 text-yellow-300 hover:bg-gray-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
            >
              {darkMode ? (
                <><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg><span className="text-sm">Light</span></>
              ) : (
                <><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg><span className="text-sm">Dark</span></>
              )}
            </button>
          </div>

          <div className={`rounded-lg p-6 transition-colors duration-300 ${darkMode ? "bg-gray-800" : "bg-white shadow-lg border"}`}>
            <h2 className={`text-xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>{selectedCourse.title}</h2>
            <p className={`mt-1 text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
              {locale === 'ko' ? '강사' : 'By'} {selectedCourse.instructor?.name || 'Unknown'}
            </p>

            <div className="mt-4">
              {isValidEmbed ? (
                <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black shadow-xl">
                  <iframe src={embedUrl} className="absolute inset-0 h-full w-full" allowFullScreen loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
                </div>
              ) : (
                <div className={`aspect-video w-full rounded-lg flex flex-col items-center justify-center ${darkMode ? "bg-gray-700" : "bg-gray-100"}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-16 w-16 ${darkMode ? "text-gray-500" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <p className={`mt-4 text-center ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                    {locale === 'ko' ? '동영상을 임베드할 수 없습니다.' : 'Video URL not valid for embedding'}
                  </p>
                  {selectedCourse.videoUrl && (
                    <a href={selectedCourse.videoUrl} target="_blank" rel="noopener noreferrer"
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
                      {locale === 'ko' ? 'YouTube에서 열기' : 'Open in YouTube'}
                    </a>
                  )}
                </div>
              )}
            </div>

            <div className="mt-4">
              <p className={darkMode ? "text-gray-300 text-sm" : "text-gray-700 text-sm"}>{selectedCourse.description}</p>
              <div className={`mt-3 flex gap-4 text-xs ${darkMode ? "text-gray-500" : "text-gray-500"}`}>
                <span>{formatDuration(selectedCourse.durationMinutes)}</span>
                <span>{selectedCourse.views} {locale === 'ko' ? '조회' : 'views'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
        <p className="text-sm text-gray-500 mt-1">{locale === 'ko' ? '강좌와 학습 자료를 탐색하세요.' : 'Explore courses and learning resources.'}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Main Content */}
        <div className="lg:col-span-3 grid gap-4">
          {/* Filters + Tabs */}
          <div className="flex flex-wrap items-center gap-3">
            <Input
              placeholder={locale === 'ko' ? '검색...' : 'Search...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">{locale === 'ko' ? '전체 카테고리' : 'All Categories'}</option>
              {categories.map(cat => <option key={cat._id} value={cat.name}>{cat.label}</option>)}
            </select>
          </div>

          {/* Tabs */}
          <div className="flex border-b">
            {[
              { key: "courses" as const, label: locale === 'ko' ? '강좌' : 'Courses', count: filteredCourses.length },
              { key: "resources" as const, label: locale === 'ko' ? '자료' : 'Resources', count: filteredResources.length },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === tab.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                {tab.label}
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Courses Grid */}
          {activeTab === "courses" && (
            filteredCourses.length === 0 ? (
              <Card><p className="text-gray-400 text-center py-8">{tAdmin("noCourses")}</p></Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {filteredCourses.map(course => (
                  <Card key={course._id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <div onClick={() => setSelectedCourse(course)}>
                      {course.thumbnailUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={course.thumbnailUrl} alt={course.title}
                          className="mb-3 h-36 w-full rounded object-cover" loading="lazy" />
                      ) : (
                        <div className="mb-3 flex h-36 w-full items-center justify-center rounded bg-gray-100">
                          <span className="text-4xl">🎬</span>
                        </div>
                      )}
                      <div className="flex items-start gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900 flex-1 min-w-0 line-clamp-1">{course.title}</h3>
                        <Badge tone={getCategoryTone(course.category)}>{getCategoryLabel(course.category)}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-gray-600 line-clamp-2">{course.description}</p>
                      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                        <span>{course.instructor?.name || 'Unknown'}</span>
                        <span>{formatDuration(course.durationMinutes)}</span>
                      </div>
                      <p className="mt-1 text-xs text-gray-400">{course.views} {locale === 'ko' ? '조회' : 'views'}</p>
                    </div>
                  </Card>
                ))}
              </div>
            )
          )}

          {/* Resources List */}
          {activeTab === "resources" && (
            filteredResources.length === 0 ? (
              <Card><p className="text-gray-400 text-center py-8">{locale === 'ko' ? '자료가 없습니다.' : 'No resources available.'}</p></Card>
            ) : (
              <div className="grid gap-3">
                {filteredResources.map(resource => (
                  <Card key={resource._id}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xl">📄</span>
                          <h3 className="font-semibold text-gray-900 line-clamp-1">{resource.title}</h3>
                          <Badge tone={getCategoryTone(resource.category)}>{getCategoryLabel(resource.category)}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-gray-600 line-clamp-2">{resource.description}</p>
                        <div className="mt-2 flex gap-4 text-xs text-gray-500">
                          <span>{formatFileSize(resource.fileSize)}</span>
                          <span>{resource.downloadCount} {locale === 'ko' ? '다운로드' : 'downloads'}</span>
                        </div>
                      </div>
                      <a href={resource.fileUrl} target="_blank" rel="noopener noreferrer"
                        className="flex-shrink-0 rounded bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 border border-blue-100">
                        {locale === 'ko' ? '다운로드' : 'Download'}
                      </a>
                    </div>
                  </Card>
                ))}
              </div>
            )
          )}
        </div>

        {/* Right Sidebar */}
        <div className="grid gap-4 content-start">
          {/* Recent Courses */}
          <Card>
            <h3 className="font-bold text-gray-900 mb-3">{locale === 'ko' ? '최신 강좌' : 'Latest Courses'}</h3>
            {recentCourses.length === 0 ? (
              <p className="text-sm text-gray-400">{locale === 'ko' ? '강좌가 없습니다.' : 'No courses yet.'}</p>
            ) : (
              <div className="grid gap-3">
                {recentCourses.map(course => (
                  <button key={course._id} onClick={() => setSelectedCourse(course)}
                    className="flex items-center gap-3 text-left hover:bg-gray-50 rounded-lg p-2 -mx-2 transition-colors w-full">
                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                      {course.thumbnailUrl
                        ? <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
                        : <span className="text-xl">🎬</span>
                      }
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 line-clamp-1">{course.title}</p>
                      <p className="text-xs text-gray-500">{formatDuration(course.durationMinutes)}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>

          {/* Popular Resources */}
          <Card>
            <h3 className="font-bold text-gray-900 mb-3">{locale === 'ko' ? '인기 자료' : 'Popular Resources'}</h3>
            {popularResources.length === 0 ? (
              <p className="text-sm text-gray-400">{locale === 'ko' ? '자료가 없습니다.' : 'No resources yet.'}</p>
            ) : (
              <div className="grid gap-2">
                {popularResources.map((res, i) => (
                  <a key={res._id} href={res.fileUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 line-clamp-1">{res.title}</p>
                      <p className="text-xs text-gray-500">{res.downloadCount} {locale === 'ko' ? '다운로드' : 'downloads'}</p>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </Card>

          {/* Category Quick Filter */}
          {categories.length > 0 && (
            <Card>
              <h3 className="font-bold text-gray-900 mb-3">{locale === 'ko' ? '카테고리' : 'Categories'}</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setCategoryFilter('')}
                  className={`text-xs px-2.5 py-1 rounded-full transition-colors ${!categoryFilter ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {locale === 'ko' ? '전체' : 'All'}
                </button>
                {categories.map(cat => (
                  <button key={cat._id}
                    onClick={() => setCategoryFilter(cat.name === categoryFilter ? '' : cat.name)}
                    className={`text-xs px-2.5 py-1 rounded-full transition-colors ${categoryFilter === cat.name ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
