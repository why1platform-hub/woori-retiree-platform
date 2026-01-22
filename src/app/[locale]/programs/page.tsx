"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, Badge, Button } from "@/components/UI";

interface Program {
  _id: string;
  name: string;
  category: string;
  description: string;
  startDate: string;
  endDate: string;
  status: "upcoming" | "open" | "closed";
}

interface Application {
  _id: string;
  program: string;
  status: string;
}

export default function ProgramsPage() {
  const t = useTranslations("programs");
  const tAdmin = useTranslations("admin.programs");
  const [programs, setPrograms] = useState<Program[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [programsRes, appsRes] = await Promise.all([
          fetch("/api/programs"),
          fetch("/api/applications"),
        ]);

        if (programsRes.ok) {
          const data = await programsRes.json();
          setPrograms(data.programs || []);
        }

        if (appsRes.ok) {
          const data = await appsRes.json();
          setApplications(data.applications || []);
        }
      } catch (error) {
        console.error("Error fetching programs:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const hasApplied = (programId: string) => {
    return applications.some((app) => app.program === programId);
  };

  const getApplicationStatus = (programId: string) => {
    const app = applications.find((app) => app.program === programId);
    return app?.status;
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
        setApplications([...applications, data.application]);
      } else {
        const error = await res.json();
        alert(error.message || "Failed to apply");
      }
    } catch (error) {
      console.error("Error applying:", error);
      alert("Failed to apply");
    } finally {
      setApplying(null);
    }
  };

  const getStatusTone = (status: string): "green" | "orange" | "gray" => {
    switch (status) {
      case "open":
        return "green";
      case "upcoming":
        return "orange";
      default:
        return "gray";
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      finance: "Finance",
      realestate: "Real Estate",
      startup: "Startup",
      social: "Social",
    };
    return labels[category] || category;
  };

  if (loading) {
    return (
      <div className="grid gap-4">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-gray-600">Loading programs...</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      {programs.length === 0 ? (
        <Card>
          <p className="text-gray-500">No programs available at this time.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {programs.map((program) => (
            <Card key={program._id}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg">{program.name}</h3>
                    <Badge tone={getStatusTone(program.status)}>
                      {tAdmin(program.status)}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    {getCategoryLabel(program.category)}
                  </p>
                  <p className="mt-2 text-sm text-gray-700">
                    {program.description}
                  </p>
                  <div className="mt-3 text-xs text-gray-500">
                    <p>
                      {tAdmin("startDate")}: {new Date(program.startDate).toLocaleDateString()}
                    </p>
                    <p>
                      {tAdmin("endDate")}: {new Date(program.endDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 border-t pt-3">
                {hasApplied(program._id) ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Applied:</span>
                    <Badge
                      tone={
                        getApplicationStatus(program._id) === "approved"
                          ? "green"
                          : getApplicationStatus(program._id) === "rejected"
                          ? "gray"
                          : "orange"
                      }
                    >
                      {getApplicationStatus(program._id)}
                    </Badge>
                  </div>
                ) : program.status === "open" ? (
                  <Button
                    onClick={() => handleApply(program._id)}
                    disabled={applying === program._id}
                  >
                    {applying === program._id ? "Applying..." : t("apply")}
                  </Button>
                ) : (
                  <span className="text-sm text-gray-500">{t("unavailable")}</span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
