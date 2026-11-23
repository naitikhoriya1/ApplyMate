"use client";

import React from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  FileText,
  Briefcase,
  CheckCircle2,
  Clock,
  ShieldCheck,
} from "lucide-react";
import {
  initialProfile,
  initialApplications,
  initialResumes,
  initialActivities,
} from "@/lib/mockData";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";

export default function DashboardPage() {
  const defaultResume = initialResumes.find((r) => r.isDefault) || initialResumes[0];
  const interviewingCount = initialApplications.filter(
    (a) => a.status === "Interviewing"
  ).length;

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-200">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-linear-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-md shadow-blue-500/10">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 text-white backdrop-blur-xs border border-white/20">
            <Sparkles className="w-3.5 h-3.5 text-blue-200" />
            <span>Safari Extension v1.0.0 Active</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {initialProfile.firstName}
          </h1>
          <p className="text-blue-100 text-sm max-w-xl leading-relaxed">
            Your autofill profile is primed and ready. We’ve saved you an estimated 42 minutes of repetitive form-filling this week.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link href="/profile">
            <Button
              variant="secondary"
              className="bg-white text-blue-900 hover:bg-blue-50 border-0 shadow-sm font-semibold"
            >
              Update Profile
            </Button>
          </Link>
          <Link href="/applications">
            <Button
              variant="outline"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              Track Applications
            </Button>
          </Link>
        </div>
      </div>

      {/* Top 4 Core Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Metric 1: Profile Completion */}
        <Card className="hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
          <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Profile Completion
              </span>
              <div className="h-8 w-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  {initialProfile.completionRate}%
                </span>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  +12% this week
                </span>
              </div>
              <div className="mt-2.5">
                <ProgressBar
                  value={initialProfile.completionRate}
                  color="blue"
                  height="sm"
                />
              </div>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Personal, experience & education fields populated.
            </p>
          </CardContent>
        </Card>

        {/* Metric 2: Current Resume Status */}
        <Card className="hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
          <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Current Resume
              </span>
              <div className="h-8 w-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-base font-bold text-zinc-900 dark:text-zinc-100 truncate" title={defaultResume.fileName}>
                {defaultResume.fileName}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="success">Active Default</Badge>
                <span className="text-xs text-zinc-500">
                  ATS: {defaultResume.atsScore}/100
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span>{defaultResume.extractedSkillsCount} extracted skills</span>
              <Link href="/resume" className="text-blue-600 hover:underline">
                Manage &rarr;
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Metric 3: Total Applications Tracked */}
        <Card className="hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
          <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Tracked Applications
              </span>
              <div className="h-8 w-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Briefcase className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  {initialApplications.length}
                </span>
                <span className="text-xs text-zinc-500">total active</span>
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <Badge variant="info">{interviewingCount} Interviewing</Badge>
                <Badge variant="default">1 Offer</Badge>
              </div>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Across Greenhouse, Lever & Workday.
            </p>
          </CardContent>
        </Card>

        {/* Metric 4: Quick Autofill Status */}
        <Card className="hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
          <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Quick Autofill Status
              </span>
              <div className="h-8 w-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  Ready & Paired
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Content script floating button injected on job application pages.
              </p>
            </div>
            <Link
              href="/settings"
              className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline inline-flex items-center gap-1"
            >
              Configure permissions &rarr;
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Main Two-Column Activity & Readiness Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Recent Applications & Activity */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle>Recent Applications</CardTitle>
                <CardDescription>
                  Jobs applied using ApplyMate Safari Autofill
                </CardDescription>
              </div>
              <Link href="/applications">
                <Button variant="ghost" size="sm" className="text-xs">
                  <span>View All ({initialApplications.length})</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="divide-y divide-zinc-100 dark:divide-zinc-800/60 p-0">
              {initialApplications.slice(0, 4).map((app) => (
                <div
                  key={app.id}
                  className="p-5 flex items-center justify-between hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30 transition-colors"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="h-10 w-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-sm text-zinc-700 dark:text-zinc-300">
                      {app.company.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                          {app.company}
                        </span>
                        <span className="text-xs text-zinc-400">&bull;</span>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          {app.platform}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                        {app.position}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {app.autofillTimeSeconds && (
                      <span className="hidden sm:inline-flex text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200/50 dark:border-emerald-800/40">
                        Autofilled in {app.autofillTimeSeconds}s
                      </span>
                    )}
                    <Badge
                      variant={
                        app.status === "Interviewing"
                          ? "info"
                          : app.status === "Offer"
                          ? "success"
                          : "default"
                      }
                    >
                      {app.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Live log of autofill interactions and profile events
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {initialActivities.map((act) => (
                <div
                  key={act.id}
                  className="flex items-start gap-3.5 pb-3 border-b border-zinc-100 dark:border-zinc-800/60 last:border-0 last:pb-0"
                >
                  <div className="mt-0.5 h-8 w-8 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {act.title}
                      </span>
                      <span className="text-[11px] text-zinc-400 shrink-0">
                        {act.timestamp}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      {act.description}
                    </p>
                  </div>
                  {act.badge && (
                    <Badge variant={act.badgeVariant || "default"} className="shrink-0 text-[10px]">
                      {act.badge}
                    </Badge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Autofill Readiness & Quick Actions */}
        <div className="space-y-6">
          {/* Readiness Checklist */}
          <Card>
            <CardHeader>
              <CardTitle>Autofill Readiness</CardTitle>
              <CardDescription>
                Ensure high accuracy across application form fields
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Personal Information
                </span>
                <Badge variant="success">100%</Badge>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Work Experience (3 roles)
                </span>
                <Badge variant="success">100%</Badge>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Education & Degrees
                </span>
                <Badge variant="success">100%</Badge>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Primary Resume Uploaded
                </span>
                <Badge variant="success">PDF Attached</Badge>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-amber-400 flex items-center justify-center text-[10px] text-amber-500 font-bold">
                    !
                  </span>
                  Custom Demographic & Salary Q&A
                </span>
                <Badge variant="warning">Optional</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Quick Shortcuts */}
          <Card className="bg-zinc-50/50 dark:bg-zinc-900/40 border-dashed">
            <CardHeader>
              <CardTitle className="text-base">Quick Shortcuts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/profile" className="block">
                <div className="p-3 rounded-xl bg-white dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700 hover:border-blue-500/50 transition-colors flex items-center justify-between text-xs font-medium">
                  <span>Edit Contact & Links</span>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
                </div>
              </Link>
              <Link href="/resume" className="block">
                <div className="p-3 rounded-xl bg-white dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700 hover:border-blue-500/50 transition-colors flex items-center justify-between text-xs font-medium">
                  <span>Upload Newer Resume Version</span>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
                </div>
              </Link>
              <Link href="/settings" className="block">
                <div className="p-3 rounded-xl bg-white dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700 hover:border-blue-500/50 transition-colors flex items-center justify-between text-xs font-medium">
                  <span>Safari Extension Settings</span>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
                </div>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
