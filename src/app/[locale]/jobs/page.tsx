"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, Badge, Button } from "@/components/UI";

interface Job {
  _id: string;
  company: string;
  title: string;
  location: string;
  employmentType: string;
  salary: string;
  requirements: string;
  applyUrl?: string;
  createdAt: string;
}

interface Bookmark {
  _id: string;
  job: string;
}

export default function JobsPage() {
  const t = useTranslations("jobs");
  const tAdmin = useTranslations("admin.jobs");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookmarking, setBookmarking] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [jobsRes, bookmarksRes] = await Promise.all([
          fetch("/api/jobs"),
          fetch("/api/bookmarks"),
        ]);

        if (jobsRes.ok) {
          const data = await jobsRes.json();
          setJobs(data.jobs || []);
        }

        if (bookmarksRes.ok) {
          const data = await bookmarksRes.json();
          setBookmarks(data.bookmarks || []);
        }
      } catch (error) {
        console.error("Error fetching jobs:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const isBookmarked = (jobId: string) => {
    return bookmarks.some((b) => b.job === jobId);
  };

  const getBookmarkId = (jobId: string) => {
    const bookmark = bookmarks.find((b) => b.job === jobId);
    return bookmark?._id;
  };

  const handleBookmark = async (jobId: string) => {
    setBookmarking(jobId);
    try {
      if (isBookmarked(jobId)) {
        const bookmarkId = getBookmarkId(jobId);
        const res = await fetch(`/api/bookmarks?id=${bookmarkId}`, {
          method: "DELETE",
        });
        if (res.ok) {
          setBookmarks(bookmarks.filter((b) => b.job !== jobId));
        }
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

  const getEmploymentTypeBadge = (type: string): "green" | "blue" | "orange" | "gray" => {
    switch (type.toLowerCase()) {
      case "full-time":
        return "green";
      case "part-time":
        return "blue";
      case "contract":
        return "orange";
      default:
        return "gray";
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-gray-600">Loading jobs...</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      {jobs.length === 0 ? (
        <Card>
          <p className="text-gray-500">No job listings available at this time.</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {jobs.map((job) => (
            <Card key={job._id}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-lg">{job.title}</h3>
                    <Badge tone={getEmploymentTypeBadge(job.employmentType)}>
                      {job.employmentType}
                    </Badge>
                  </div>
                  <p className="mt-1 font-medium text-blue-700">{job.company}</p>
                  <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
                    <span>{tAdmin("location")}: {job.location}</span>
                    <span>{tAdmin("salary")}: {job.salary}</span>
                  </div>
                  <div className="mt-3">
                    <p className="text-sm font-medium text-gray-700">{tAdmin("requirements")}:</p>
                    <p className="mt-1 text-sm text-gray-600">{job.requirements}</p>
                  </div>
                  <p className="mt-3 text-xs text-gray-400">
                    Posted: {new Date(job.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex gap-3 border-t pt-3">
                <button
                  onClick={() => handleBookmark(job._id)}
                  disabled={bookmarking === job._id}
                  className={`rounded px-4 py-2 text-sm font-medium transition-colors ${
                    isBookmarked(job._id)
                      ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                      : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                  }`}
                >
                  {bookmarking === job._id
                    ? "..."
                    : isBookmarked(job._id)
                    ? "★ Bookmarked"
                    : "☆ Bookmark"}
                </button>
                {job.applyUrl && (
                  <a
                    href={job.applyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
                  >
                    Apply Now
                  </a>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
