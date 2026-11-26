"use client";

import React, { useEffect, useState } from "react";
import {
  Search,
  Plus,
  Calendar,
  FileText,
  ExternalLink,
  CheckCircle2,
  Pencil,
  Trash2,
  Clock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  APPLICATION_STATUSES,
  type ApplicationActivityItem,
  type ApplicationStatus,
  type TrackedJobApplication,
} from "@/types/application";
import {
  applicationStorage,
  computeApplicationStats,
  filterApplications,
  type NewApplicationInput,
} from "@/lib/storage/applicationStorage";
import { ApplicationFormModal } from "@/components/applications/ApplicationFormModal";

const STATUS_BADGE_VARIANT: Record<
  ApplicationStatus,
  "default" | "info" | "success" | "warning" | "outline"
> = {
  Interested: "outline",
  Preparing: "warning",
  Applied: "info",
  Interview: "info",
  Rejected: "default",
  Offer: "success",
};

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<TrackedJobApplication[]>([]);
  const [activity, setActivity] = useState<ApplicationActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "All">(
    "All"
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<TrackedJobApplication | null>(
    null
  );

  const refreshData = async () => {
    const [apps, acts] = await Promise.all([
      applicationStorage.listApplications(),
      applicationStorage.getRecentActivity(),
    ]);
    setApplications(apps);
    setActivity(acts);
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      applicationStorage.listApplications(),
      applicationStorage.getRecentActivity(),
    ])
      .then(([apps, acts]) => {
        if (!active) return;
        setApplications(apps);
        setActivity(acts);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSave = async (data: NewApplicationInput) => {
    if (editingApp) {
      await applicationStorage.updateApplication(editingApp.id, data);
    } else {
      await applicationStorage.addApplication(data);
    }
    await refreshData();
  };

  const handleConfirmSubmission = async (id: string) => {
    await applicationStorage.confirmSubmission(id);
    await refreshData();
  };

  const handleDelete = async (id: string) => {
    await applicationStorage.deleteApplication(id);
    await refreshData();
  };

  const filteredApps = filterApplications(applications, searchTerm, statusFilter);
  const stats = computeApplicationStats(applications);

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200/80 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Application Tracker
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Track job opportunities locally, confirm submissions explicitly, and monitor your pipeline.
          </p>
        </div>

        <Button
          onClick={() => {
            setEditingApp(null);
            setIsModalOpen(true);
          }}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Track Application</span>
        </Button>
      </div>

      {/* Application Statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-4">
          <div className="text-[11px] uppercase font-semibold tracking-wider text-zinc-500">
            Total Tracked
          </div>
          <div className="text-2xl font-bold mt-1 text-zinc-900 dark:text-zinc-100">
            {stats.total}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-[11px] uppercase font-semibold tracking-wider text-blue-600 dark:text-blue-400">
            Confirmed Applied
          </div>
          <div className="text-2xl font-bold mt-1 text-blue-600 dark:text-blue-400">
            {stats.confirmedSubmissions}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-[11px] uppercase font-semibold tracking-wider text-amber-600 dark:text-amber-400">
            Preparing
          </div>
          <div className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">
            {stats.byStatus.Interested + stats.byStatus.Preparing}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-[11px] uppercase font-semibold tracking-wider text-indigo-600 dark:text-indigo-400">
            Interview
          </div>
          <div className="text-2xl font-bold mt-1 text-indigo-600 dark:text-indigo-400">
            {stats.byStatus.Interview}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-[11px] uppercase font-semibold tracking-wider text-emerald-600 dark:text-emerald-400">
            Offer
          </div>
          <div className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
            {stats.byStatus.Offer}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-[11px] uppercase font-semibold tracking-wider text-zinc-500">
            Rejected
          </div>
          <div className="text-2xl font-bold mt-1 text-zinc-600 dark:text-zinc-400">
            {stats.byStatus.Rejected}
          </div>
        </Card>
      </div>

      {/* Search & Status Filters */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search company, job title, resume, or notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 text-xs">
          {(["All", ...APPLICATION_STATUSES] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-xl font-medium transition-colors cursor-pointer whitespace-nowrap ${
                statusFilter === status
                  ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-xs"
                  : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Grid: Applications List + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="overflow-hidden">
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {isLoading ? (
                <div className="p-10 text-center text-sm text-zinc-500">
                  Loading tracked applications…
                </div>
              ) : filteredApps.length === 0 ? (
                <div className="p-12 text-center space-y-2">
                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {applications.length === 0
                      ? "No applications tracked yet"
                      : "No applications match your filter"}
                  </p>
                  <p className="text-xs text-zinc-500">
                    Click &ldquo;Track Application&rdquo; to log a role and confirm when you submit.
                  </p>
                </div>
              ) : (
                filteredApps.map((app) => (
                  <div
                    key={app.id}
                    className="p-5 flex flex-col gap-3 hover:bg-zinc-50/70 dark:hover:bg-zinc-800/20 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                            {app.jobTitle}
                          </h3>
                          <Badge variant={STATUS_BADGE_VARIANT[app.status]}>
                            {app.status}
                          </Badge>
                          {app.submittedConfirmed && (
                            <Badge variant="success" className="text-[10px]">
                              Submission Confirmed
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                          {app.companyName}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-zinc-500 flex-wrap pt-0.5">
                          {app.applicationDate && (
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {app.applicationDate}
                            </span>
                          )}
                          {app.resumeUsed && (
                            <span className="inline-flex items-center gap-1">
                              <FileText className="w-3.5 h-3.5" />
                              {app.resumeUsed}
                            </span>
                          )}
                          {app.applicationUrl && (
                            <a
                              href={app.applicationUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Posting
                            </a>
                          )}
                        </div>
                        {app.notes && (
                          <p className="text-xs text-zinc-600 dark:text-zinc-400 pt-1">
                            {app.notes}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                        {!app.submittedConfirmed && (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="gap-1 text-xs"
                            onClick={() => handleConfirmSubmission(app.id)}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Confirm Submitted
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingApp(app);
                            setIsModalOpen(true);
                          }}
                          title="Edit application"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                          onClick={() => handleDelete(app.id)}
                          title="Delete application"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Recent Activity */}
        <div>
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-zinc-500" />
                <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Recent Activity
                </h2>
              </div>

              {activity.length === 0 ? (
                <p className="text-xs text-zinc-500">
                  No activity recorded yet. Add or update an application to see your timeline.
                </p>
              ) : (
                <div className="space-y-3">
                  {activity.slice(0, 8).map((item) => (
                    <div
                      key={item.id}
                      className="text-xs border-l-2 border-zinc-200 dark:border-zinc-700 pl-3 py-0.5 space-y-0.5"
                    >
                      <p className="font-medium text-zinc-800 dark:text-zinc-200">
                        {item.detail}
                      </p>
                      <p className="text-[11px] text-zinc-400">
                        {new Date(item.timestamp).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {isModalOpen && (
        <ApplicationFormModal
          initial={editingApp}
          onSave={handleSave}
          onClose={() => {
            setIsModalOpen(false);
            setEditingApp(null);
          }}
        />
      )}
    </div>
  );
}
