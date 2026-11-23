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

export default function SettingsPage() {
  const [autoDetect, setAutoDetect] = useState(true);
  const [showFloatingButton, setShowFloatingButton] = useState(true);
  const [confirmBeforeFill, setConfirmBeforeFill] = useState(false);
  const [autoRecordHistory, setAutoRecordHistory] = useState(true);
  const [testPingSuccess, setTestPingSuccess] = useState(false);

  const triggerTestPing = () => {
    setTestPingSuccess(true);
    setTimeout(() => setTestPingSuccess(false), 2500);
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
                Auto-record into Application History
              </div>
              <div className="text-xs text-zinc-500 mt-0.5">
                Log company name, role, and date to your dashboard when form submission is triggered.
              </div>
            </div>
            <input
              type="checkbox"
              checked={autoRecordHistory}
              onChange={(e) => setAutoRecordHistory(e.target.checked)}
              className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
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
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs">
              <Download className="w-3.5 h-3.5" />
              <span>Export Full Profile as JSON</span>
            </Button>
            <Button size="sm" variant="danger" className="gap-1.5 text-xs">
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Extension Cache</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
