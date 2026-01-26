"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, Badge } from "@/components/UI";

interface CategoryItem {
  _id: string;
  name: string;
  label: string;
  order: number;
}

interface Course {
  _id: string;
  title: string;
  category: string;
  description: string;
  durationMinutes: number;
  thumbnailUrl?: string;
  videoUrl: string;
  instructor: {
    _id: string;
    name: string;
  };
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
  const [courses, setCourses] = useState<Course[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"courses" | "resources">("courses");
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [darkMode, setDarkMode] = useState(true); // Default to dark for video viewing

  useEffect(() => {
    async function fetchData() {
      try {
        const [coursesRes, resourcesRes, categoriesRes] = await Promise.all([
          fetch("/api/courses"),
          fetch("/api/resources"),
          fetch("/api/categories"),
        ]);

        if (coursesRes.ok) {
          const data = await coursesRes.json();
          setCourses(data.courses || []);
        }

        if (resourcesRes.ok) {
          const data = await resourcesRes.json();
          setResources(data.resources || []);
        }

        if (categoriesRes.ok) {
          const data = await categoriesRes.json();
          setCategories(data.categories || []);
        }
      } catch (error) {
        console.error("Error fetching learning data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const getCategoryLabel = (category: string) => {
    const cat = categories.find(c => c.name === category);
    return cat?.label || category;
  };

  const getCategoryTone = (category: string): "green" | "blue" | "orange" | "gray" => {
    const cat = categories.find(c => c.name === category);
    const tones: ("green" | "blue" | "orange" | "gray")[] = ["green", "blue", "orange", "gray"];
    const index = cat ? cat.order % tones.length : 3;
    return tones[index];
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Convert YouTube URL to embed format
  const getEmbedUrl = (url: string) => {
    if (!url) return "";

    // Trim whitespace
    url = url.trim();

    // Already an embed URL
    if (url.includes("/embed/")) return url;

    // Extract YouTube video ID from various formats
    let videoId: string | null = null;

    // Format: youtube.com/watch?v=VIDEO_ID or youtube.com/watch?...&v=VIDEO_ID
    const watchMatch = url.match(/(?:youtube\.com|www\.youtube\.com)\/watch\?(?:.*&)?v=([^&]+)/);
    if (watchMatch) videoId = watchMatch[1];

    // Format: youtu.be/VIDEO_ID
    if (!videoId) {
      const shortMatch = url.match(/youtu\.be\/([^?&#]+)/);
      if (shortMatch) videoId = shortMatch[1];
    }

    // Format: youtube.com/v/VIDEO_ID (old embed format)
    if (!videoId) {
      const oldMatch = url.match(/youtube\.com\/v\/([^?&#]+)/);
      if (oldMatch) videoId = oldMatch[1];
    }

    // Format: youtube.com/shorts/VIDEO_ID
    if (!videoId) {
      const shortsMatch = url.match(/youtube\.com\/shorts\/([^?&#]+)/);
      if (shortsMatch) videoId = shortsMatch[1];
    }

    // Format: youtube.com/live/VIDEO_ID
    if (!videoId) {
      const liveMatch = url.match(/youtube\.com\/live\/([^?&#]+)/);
      if (liveMatch) videoId = liveMatch[1];
    }

    // If we found a YouTube video ID, return embed URL
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}`;
    }

    // Google Drive: drive.google.com/file/d/ID/view -> /preview
    if (url.includes("drive.google.com") && url.includes("/view")) {
      return url.replace("/view", "/preview");
    }

    // Vimeo: vimeo.com/VIDEO_ID
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;

    return url;
  };

  if (loading) {
    return (
      <div className="grid gap-4">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-gray-600">Loading learning resources...</p>
      </div>
    );
  }

  // Video modal
  if (selectedCourse) {
    return (
      <div className={`min-h-screen -m-4 p-4 transition-colors duration-300 ${darkMode ? "bg-gray-900" : "bg-white"}`}>
        <div className="grid gap-6 max-w-5xl mx-auto">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSelectedCourse(null)}
              className={`text-left hover:underline ${darkMode ? "text-blue-400" : "text-blue-600"}`}
            >
              ← Back to courses
            </button>

            {/* Light/Dark Mode Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
                darkMode
                  ? "bg-gray-700 text-yellow-300 hover:bg-gray-600"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {darkMode ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <span className="text-sm font-medium">Light</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                  <span className="text-sm font-medium">Dark</span>
                </>
              )}
            </button>
          </div>

          <div className={`rounded-lg p-6 transition-colors duration-300 ${darkMode ? "bg-gray-800" : "bg-white shadow-lg border"}`}>
            <h2 className={`text-xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>{selectedCourse.title}</h2>
            <p className={`mt-1 text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
              By {selectedCourse.instructor?.name || "Unknown"}
            </p>

            <div className="mt-4">
              {(() => {
                const embedUrl = getEmbedUrl(selectedCourse.videoUrl);
                const isValidEmbed = embedUrl && (
                  embedUrl.includes("/embed/") ||
                  embedUrl.includes("player.vimeo.com") ||
                  embedUrl.includes("drive.google.com")
                );

                if (!isValidEmbed) {
                  return (
                    <div className={`aspect-video w-full rounded-lg flex flex-col items-center justify-center ${darkMode ? "bg-gray-700" : "bg-gray-100"}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" className={`h-16 w-16 ${darkMode ? "text-gray-500" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <p className={`mt-4 text-center ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                        Video URL not valid for embedding
                      </p>
                      <p className={`mt-2 text-sm ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                        Use format: https://www.youtube.com/watch?v=VIDEO_ID
                      </p>
                      {selectedCourse.videoUrl && (
                        <a
                          href={selectedCourse.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Open in YouTube
                        </a>
                      )}
                    </div>
                  );
                }

                return (
                  <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black shadow-xl">
                    <iframe
                      src={embedUrl}
                      className="absolute inset-0 h-full w-full"
                      allowFullScreen
                      loading="lazy"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    />
                  </div>
                );
              })()}
            </div>

            <div className="mt-4">
              <p className={darkMode ? "text-gray-300" : "text-gray-700"}>{selectedCourse.description}</p>
              <div className={`mt-3 flex gap-4 text-sm ${darkMode ? "text-gray-500" : "text-gray-500"}`}>
                <span>{formatDuration(selectedCourse.durationMinutes)}</span>
                <span>{selectedCourse.views} views</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab("courses")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "courses"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Courses ({courses.length})
        </button>
        <button
          onClick={() => setActiveTab("resources")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "resources"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Resources ({resources.length})
        </button>
      </div>

      {/* Courses Tab */}
      {activeTab === "courses" && (
        <>
          {courses.length === 0 ? (
            <Card>
              <p className="text-gray-500">{tAdmin("noCourses")}</p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => (
                <Card key={course._id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <div onClick={() => setSelectedCourse(course)}>
                    {course.thumbnailUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={course.thumbnailUrl}
                        alt={course.title}
                        className="mb-3 h-40 w-full rounded object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="mb-3 flex h-40 w-full items-center justify-center rounded bg-gray-100">
                        <span className="text-4xl">🎬</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{course.title}</h3>
                      <Badge tone={getCategoryTone(course.category)}>
                        {getCategoryLabel(course.category)}
                      </Badge>
                    </div>

                    <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                      {course.description}
                    </p>

                    <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                      <span>{course.instructor?.name || "Unknown"}</span>
                      <span>{formatDuration(course.durationMinutes)}</span>
                    </div>

                    <div className="mt-2 text-xs text-gray-400">
                      {course.views} views
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Resources Tab */}
      {activeTab === "resources" && (
        <>
          {resources.length === 0 ? (
            <Card>
              <p className="text-gray-500">No resources available yet.</p>
            </Card>
          ) : (
            <div className="grid gap-4">
              {resources.map((resource) => (
                <Card key={resource._id}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">📄</span>
                        <h3 className="font-semibold">{resource.title}</h3>
                        <Badge tone={getCategoryTone(resource.category)}>
                          {getCategoryLabel(resource.category)}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm text-gray-600">{resource.description}</p>
                      <div className="mt-2 flex gap-4 text-xs text-gray-500">
                        <span>Size: {formatFileSize(resource.fileSize)}</span>
                        <span>{resource.downloadCount} downloads</span>
                      </div>
                    </div>
                    <a
                      href={resource.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded bg-blue-100 px-4 py-2 text-sm font-medium text-blue-800 hover:bg-blue-200"
                    >
                      Download
                    </a>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
