"use client";

import React, { useState } from "react";
import {
  Search,
  Plus,
  ChevronRight,
  X,
  Calendar,
  Building2,
  MapPin,
  Clock,
} from "lucide-react";
import { initialApplications, TrackedApplication } from "@/lib/mockData";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default function ApplicationsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [applications] = useState<TrackedApplication[]>(initialApplications);
  const [selectedApp, setSelectedApp] = useState<TrackedApplication | null>(null);

  const filteredApps = applications.filter((app) => {
    const matchesSearch =
      app.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.platform.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "All" || app.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const counts = {
    all: applications.length,
    interviewing: applications.filter((a) => a.status === "Interviewing").length,
    inReview: applications.filter((a) => a.status === "In Review").length,
    offer: applications.filter((a) => a.status === "Offer").length,
    applied: applications.filter((a) => a.status === "Applied").length,
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200/80 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Application History
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Track and manage all job applications filled automatically by your Safari Extension.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            <span>Track Application</span>
          </Button>
        </div>
      </div>

      {/* Summary Stat Strips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-xs uppercase font-semibold tracking-wider text-zinc-500">
            Total Tracked
          </div>
          <div className="text-2xl font-bold mt-1 text-zinc-900 dark:text-zinc-100">
            {counts.all}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase font-semibold tracking-wider text-blue-600 dark:text-blue-400">
            Interviewing
          </div>
          <div className="text-2xl font-bold mt-1 text-blue-600 dark:text-blue-400">
            {counts.interviewing}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase font-semibold tracking-wider text-purple-600 dark:text-purple-400">
            In Review
          </div>
          <div className="text-2xl font-bold mt-1 text-purple-600 dark:text-purple-400">
            {counts.inReview}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase font-semibold tracking-wider text-emerald-600 dark:text-emerald-400">
            Active Offers
          </div>
          <div className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
            {counts.offer}
          </div>
        </Card>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search company, role or platform..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
          {["All", "Interviewing", "In Review", "Applied", "Offer"].map((status) => (
            <button
              key={status}
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

      {/* Applications Table / Cards */}
      <Card className="overflow-hidden">
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
          {filteredApps.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 text-sm">
              No applications found matching your search criteria.
            </div>
          ) : (
            filteredApps.map((app) => (
              <div
                key={app.id}
                onClick={() => setSelectedApp(app)}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30 transition-colors cursor-pointer"
              >
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="h-11 w-11 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-base text-zinc-700 dark:text-zinc-300 shrink-0">
                    {app.company.slice(0, 2).toUpperCase()}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                        {app.company}
                      </h3>
                      <Badge variant="outline" className="text-[10px]">
                        {app.platform}
                      </Badge>
                      {app.autofillTimeSeconds && (
                        <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200/50 dark:border-emerald-800/40">
                          Autofilled in {app.autofillTimeSeconds}s
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                      {app.position} &bull; {app.location}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                  <div className="text-right">
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
                    <div className="text-[11px] text-zinc-400 mt-1">
                      Applied {app.appliedDate}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-400" />
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Selected Application Details Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-lg w-full p-6 shadow-xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-lg">
                  {selectedApp.company.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100">
                    {selectedApp.company}
                  </h3>
                  <p className="text-xs text-zinc-500">{selectedApp.position}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                className="p-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 py-2 border-y border-zinc-100 dark:border-zinc-800 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" /> Platform
                </span>
                <span className="font-semibold">{selectedApp.platform}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> Location
                </span>
                <span className="font-semibold">{selectedApp.location}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Date Applied
                </span>
                <span className="font-semibold">{selectedApp.appliedDate}</span>
              </div>
              {selectedApp.autofillTimeSeconds && (
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Safari Autofill Speed
                  </span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {selectedApp.autofillTimeSeconds} seconds
                  </span>
                </div>
              )}
              {selectedApp.salaryRange && (
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">Target Range</span>
                  <span className="font-semibold">{selectedApp.salaryRange}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-1">
              <Badge
                variant={
                  selectedApp.status === "Interviewing"
                    ? "info"
                    : selectedApp.status === "Offer"
                    ? "success"
                    : "default"
                }
              >
                Current Status: {selectedApp.status}
              </Badge>
              <Button size="sm" onClick={() => setSelectedApp(null)}>
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
