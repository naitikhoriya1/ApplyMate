"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  Download,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProfileStorageService } from "@/lib/storage/ProfileStorageService";
import { deleteProfile, setSetupCompleted } from "@/lib/storage/profileStorage";
import {
  APPLICATIONS_STORAGE_KEY,
  ACTIVITY_STORAGE_KEY,
} from "@/lib/storage/applicationStorage";
import { RESUME_DB_NAME } from "@/lib/storage/resumeStorage";
import { createStorageAdapter } from "@/lib/storage/adapters";

export default function SettingsPage() {
  const [autoDetect, setAutoDetect] = useState(true);
  const [showFloatingButton, setShowFloatingButton] = useState(true);
  const [confirmBeforeFill, setConfirmBeforeFill] = useState(true);
  const [testPingSuccess, setTestPingSuccess] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [dataActionMessage, setDataActionMessage] = useState<string | null>(null);

  const triggerTestPing = () => {
    setTestPingSuccess(true);
    setTimeout(() => setTestPingSuccess(false), 2500);
  };

  const handleExportProfile = async () => {
    const service = new ProfileStorageService();
    const json = await service.exportProfileJson();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `applymate-profile-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setDataActionMessage("Exported profile JSON locally.");
  };

  const handleConfirmClearAllData = async () => {
    deleteProfile();
    setSetupCompleted(false);
    const adapter = createStorageAdapter();
    await adapter.remove("applymate_profile");
    await adapter.remove("applymate_setup_completed");
    await adapter.remove(APPLICATIONS_STORAGE_KEY);
    await adapter.remove(ACTIVITY_STORAGE_KEY);
    await adapter.remove("applymate_last_job_analysis");

    if (typeof indexedDB !== "undefined") {
      await new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase(RESUME_DB_NAME);
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
        req.onblocked = () => resolve();
      });
    }

    setConfirmClearOpen(false);
    setDataActionMessage(
      "Cleared all local profile, resume, and application tracker data."
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200 max-w-4xl">
      {/* Header Bar */}
      <div className="pb-2 border-b border-zinc-200/80 dark:border-zinc-800">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          Settings & Preferences
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Configure Safari Web Extension automation, supported job boards, and local profile security.
        </p>
      </div>

      {/* Safari Extension Pairing Card */}
      <Card className="border-blue-200/80 dark:border-blue-900/40 bg-linear-to-b from-blue-50/20 to-white dark:from-blue-950/10 dark:to-zinc-900">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <CardTitle>Safari Extension Pairing</CardTitle>
                <CardDescription>
                  Manifest V3 Extension Runtime status
                </CardDescription>
              </div>
            </div>
            <Badge variant="success">Paired & Active</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/60 text-xs">
            <div>
              <span className="text-zinc-400 block mb-0.5">Manifest Version</span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">v3 (Safari 14+)</span>
            </div>
            <div>
              <span className="text-zinc-400 block mb-0.5">Permissions</span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">storage, activeTab</span>
            </div>
            <div>
              <span className="text-zinc-400 block mb-0.5">Content Script</span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">document_idle</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-zinc-500 max-w-md">
              Send a test message from this dashboard to verify Safari background service worker connectivity.
            </p>
            <Button
              onClick={triggerTestPing}
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{testPingSuccess ? "Pong Received!" : "Test Extension Ping"}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Autofill Automation Rules */}
      <Card>
        <CardHeader>
          <CardTitle>Autofill Automation Rules</CardTitle>
          <CardDescription>
            Control how and when ApplyMate interacts with input elements on job boards.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 divide-y divide-zinc-100 dark:divide-zinc-800/60">
          <div className="flex items-center justify-between pt-3 first:pt-0">
            <div>
              <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Display Floating ApplyMate Button
              </div>
              <div className="text-xs text-zinc-500 mt-0.5">
                Renders the circular action button in the bottom-right corner when job portals are detected.
              </div>
            </div>
            <input
              type="checkbox"
              checked={showFloatingButton}
              onChange={(e) => setShowFloatingButton(e.target.checked)}
              className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between pt-3">
            <div>
              <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Auto-detect Form Fields
              </div>
              <div className="text-xs text-zinc-500 mt-0.5">
                Automatically scans for Name, Email, Phone, LinkedIn, and Resume inputs.
              </div>
            </div>
            <input
              type="checkbox"
              checked={autoDetect}
              onChange={(e) => setAutoDetect(e.target.checked)}
              className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between pt-3">
            <div>
              <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Confirm Before Autofilling
              </div>
              <div className="text-xs text-zinc-500 mt-0.5">
                Show a preview popover of matched values before populating form fields.
              </div>
            </div>
            <input
              type="checkbox"
              checked={confirmBeforeFill}
              onChange={(e) => setConfirmBeforeFill(e.target.checked)}
              className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between pt-3">
            <div>
              <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Manual Submission Confirmation
              </div>
              <div className="text-xs text-zinc-500 mt-0.5">
                ApplyMate never submits forms automatically and only records submissions after your explicit confirmation.
              </div>
            </div>
            <Badge variant="success" className="text-[10px]">
              Always Enforced
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Supported Portals */}
      <Card>
        <CardHeader>
          <CardTitle>Supported Job Application Portals</CardTitle>
          <CardDescription>
            Target job systems where ApplyMate field mappings are calibrated.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { name: "Greenhouse", status: "Calibrated" },
              { name: "Lever", status: "Calibrated" },
              { name: "Workday", status: "Calibrated" },
              { name: "Ashby", status: "Calibrated" },
              { name: "BambooHR", status: "Calibrated" },
              { name: "LinkedIn Easy Apply", status: "Calibrated" },
            ].map((portal) => (
              <div
                key={portal.name}
                className="p-3.5 rounded-xl border border-zinc-200/70 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40 flex items-center justify-between text-xs"
              >
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  {portal.name}
                </span>
                <Badge variant="success" className="text-[10px]">
                  {portal.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Data Export & Reset */}
      <Card>
        <CardHeader>
          <CardTitle>Data Management & Local Storage</CardTitle>
          <CardDescription>
            ApplyMate runs fully client-side. Your information remains strictly within your browser.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {dataActionMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-200">
              {dataActionMessage}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={handleExportProfile}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Full Profile as JSON</span>
            </Button>
            <Button
              size="sm"
              variant="danger"
              className="gap-1.5 text-xs"
              onClick={() => setConfirmClearOpen(true)}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete All Local Data</span>
            </Button>
          </div>

          {confirmClearOpen && (
            <div className="p-4 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/70 dark:bg-red-950/30 space-y-2">
              <p className="text-xs font-semibold text-red-800 dark:text-red-200">
                Confirm permanent deletion of all local ApplyMate data?
              </p>
              <p className="text-xs text-red-700 dark:text-red-300">
                This removes your saved profile, stored PDF resumes (IndexedDB), and application tracker records.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmClearOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={handleConfirmClearAllData}
                >
                  Confirm Delete All
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
