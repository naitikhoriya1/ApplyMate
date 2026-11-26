"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  FileText,
  Briefcase,
  CheckCircle2,
  Clock,
  ShieldCheck,
  PenTool,
  FileUp,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import {
  useProfile,
  useSetupCompleted,
  computeCompletion,
} from "@/lib/storage/profileStorage";
import { resumeStorage, formatFileSize } from "@/lib/storage/resumeStorage";
import {
  applicationStorage,
  computeApplicationStats,
} from "@/lib/storage/applicationStorage";
import type { StoredResumeMetadata } from "@/types/resume";
import type {
  ApplicationActivityItem,
  TrackedJobApplication,
} from "@/types/application";

export default function DashboardPage() {
  const [profile] = useProfile();
  const [setupCompleted] = useSetupCompleted();
  const [resumes, setResumes] = useState<StoredResumeMetadata[]>([]);
  const [applications, setApplications] = useState<TrackedJobApplication[]>([]);
  const [activity, setActivity] = useState<ApplicationActivityItem[]>([]);

  useEffect(() => {
    let active = true;
    Promise.all([
      resumeStorage.listResumes().catch(() => []),
      applicationStorage.listApplications().catch(() => []),
      applicationStorage.getRecentActivity(6).catch(() => []),
    ]).then(([resList, appList, actList]) => {
      if (!active) return;
      setResumes(resList);
      setApplications(appList);
      setActivity(actList);
    });
    return () => {
      active = false;
    };
  }, []);

  const completion = computeCompletion(profile);
  const activeResume = resumes.find((r) => r.isDefault) ?? resumes[0] ?? null;
  const appStats = computeApplicationStats(applications);
  const hasProfileName = Boolean(profile.personal.firstName.trim());

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-200">
      {/* First-Time Initial Setup Banner (shown until user completes setup) */}
      {!setupCompleted && (
        <Card className="border-blue-300/80 dark:border-blue-800/60 bg-blue-50/40 dark:bg-blue-950/20">
          <CardContent className="p-6 sm:p-8 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <Badge variant="info">Initial Setup Required</Badge>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                  Set up ApplyMate from scratch
                </h2>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-xl">
                  Choose how you want to initialize your local autofill profile — fill it out manually step by step, or import details directly from your PDF resume.
                </p>
              </div>
              <div className="flex flex-wrap gap-2.5 shrink-0">
                <Link href="/setup?mode=manual">
                  <Button size="sm" className="gap-1.5">
                    <PenTool className="w-3.5 h-3.5" />
                    <span>Setup Manually</span>
                  </Button>
                </Link>
                <Link href="/setup?mode=resume">
                  <Button size="sm" variant="secondary" className="gap-1.5">
                    <FileUp className="w-3.5 h-3.5" />
                    <span>Setup from Resume</span>
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-linear-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-md shadow-blue-500/10">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 text-white backdrop-blur-xs border border-white/20">
            <Sparkles className="w-3.5 h-3.5 text-blue-200" />
            <span>Safari Extension v1.0.0</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {hasProfileName
              ? `Welcome back, ${profile.personal.firstName}`
              : "Welcome to ApplyMate"}
          </h1>
          <p className="text-blue-100 text-sm max-w-xl leading-relaxed">
            {setupCompleted
              ? "Your local autofill profile is saved and ready for supported job portals."
              : "Complete initial setup to save your personal details and resume locally for Safari autofill."}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link href={setupCompleted ? "/profile" : "/setup"}>
            <Button
              variant="secondary"
              className="bg-white text-blue-900 hover:bg-blue-50 border-0 shadow-sm font-semibold"
            >
              {setupCompleted ? "Update Profile" : "Start Initial Setup"}
            </Button>
          </Link>
          <Link href="/applications">
            <Button
              variant="outline"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              View History
            </Button>
          </Link>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        <Card className="p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Profile Strength
              </span>
              <Badge variant={completion >= 80 ? "success" : "info"}>
                {completion}%
              </Badge>
            </div>
            <div className="mt-4">
              <ProgressBar
                value={completion}
                color={completion >= 80 ? "emerald" : "blue"}
              />
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-3 leading-relaxed">
              {profile.skills.length} skills &bull; {profile.experience.length} experience &bull; {profile.education.length} education
            </p>
          </div>
          <Link
            href={setupCompleted ? "/profile" : "/setup"}
            className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:gap-2 transition-all"
          >
            <span>{setupCompleted ? "Edit details" : "Complete setup"}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </Card>

        <Card className="p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Active Resume
              </span>
              <Badge variant={activeResume ? "success" : "outline"}>
                {activeResume ? "Stored" : "None"}
              </Badge>
            </div>
            <div className="mt-4 flex items-start gap-2.5">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate text-zinc-900 dark:text-zinc-100">
                  {activeResume ? activeResume.fileName : "No PDF uploaded"}
                </div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  {activeResume
                    ? `${formatFileSize(activeResume.fileSize)} in IndexedDB`
                    : "Upload a PDF in Resume Manager"}
                </div>
              </div>
            </div>
          </div>
          <Link
            href="/resume"
            className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:gap-2 transition-all"
          >
            <span>Manage resumes</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </Card>

        <Card className="p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Applications Tracked
              </span>
              <div className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                <Briefcase className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
                {appStats.total}
              </span>
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                {appStats.confirmedSubmissions} confirmed
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
              {appStats.byStatus.Interview} interviewing &bull; {appStats.byStatus.Offer} offers
            </p>
          </div>
          <Link
            href="/applications"
            className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:gap-2 transition-all"
          >
            <span>Open application tracker</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </Card>

        <Card className="p-6 flex flex-col justify-between bg-linear-to-b from-white to-zinc-50/70 dark:from-zinc-900 dark:to-zinc-900/60">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Quick Autofill Status
              </span>
              <ShieldCheck
                className={`w-4 h-4 ${setupCompleted ? "text-emerald-500" : "text-zinc-400"}`}
              />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  setupCompleted ? "bg-emerald-500" : "bg-amber-400"
                }`}
              />
              <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {setupCompleted ? "Ready for Safari" : "Setup Needed"}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">
              Supports LinkedIn, Naukri, Indeed, Greenhouse, Lever, Workday, SmartRecruiters &amp; custom sites.
            </p>
          </div>
          <Link
            href="/settings"
            className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:gap-2 transition-all"
          >
            <span>Extension settings</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </Card>
      </div>

      {/* Bottom Two-Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Recent Applications</CardTitle>
              <CardDescription className="mt-1">
                Confirmed and in-progress roles stored locally in ApplyMate
              </CardDescription>
            </div>
            <Link href="/applications">
              <Button variant="ghost" size="sm" className="gap-1">
                <span>View All ({applications.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {applications.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500">
                No applications tracked yet. Visit Application History to log a role.
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {applications.slice(0, 4).map((app) => (
                  <div
                    key={app.id}
                    className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30 transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="h-10 w-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-sm text-zinc-700 dark:text-zinc-300 shrink-0">
                        {app.companyName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                          {app.jobTitle}
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                          {app.companyName}
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant={
                        app.status === "Offer"
                          ? "success"
                          : app.status === "Interview"
                            ? "info"
                            : "outline"
                      }
                    >
                      {app.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Real-time local tracker updates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {activity.length === 0 ? (
              <p className="text-xs text-zinc-500">
                No recent activity yet.
              </p>
            ) : (
              activity.map((act) => (
                <div key={act.id} className="flex gap-3">
                  <div className="mt-0.5 p-1.5 rounded-lg h-7 w-7 flex items-center justify-center shrink-0 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                    {act.action === "submission_confirmed" ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <Clock className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      {act.detail}
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      {new Date(act.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
