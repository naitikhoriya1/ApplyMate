"use client";

import React, { useState } from "react";
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  Download,
} from "lucide-react";
import { initialResumes } from "@/lib/mockData";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default function ResumePage() {
  const [resumes, setResumes] = useState(initialResumes);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const setDefault = (id: string) => {
    setResumes(
      resumes.map((r) => ({
        ...r,
        isDefault: r.id === id,
      }))
    );
  };

  const handleSimulatedUpload = () => {
    setUploadSuccess(true);
    setTimeout(() => setUploadSuccess(false), 3000);
  };

  const activeResume = resumes.find((r) => r.isDefault) || resumes[0];

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200/80 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Resume Manager
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Store and parse target resumes. ApplyMate uses the active resume for Safari autofill and ATS matching.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={handleSimulatedUpload} className="gap-2">
            <UploadCloud className="w-4 h-4" />
            <span>Upload New Resume</span>
          </Button>
        </div>
      </div>

      {uploadSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-200 flex items-center gap-3 text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Resume successfully uploaded, parsed into structured fields, and cached for Safari autofill!</span>
        </div>
      )}

      {/* Active Resume Hero Card */}
      <Card className="border-blue-200/80 dark:border-blue-900/40 bg-linear-to-b from-blue-50/30 to-white dark:from-blue-950/10 dark:to-zinc-900">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
                <FileText className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    {activeResume.title}
                  </h2>
                  <Badge variant="success">Active Default for Autofill</Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                  <span className="font-mono text-zinc-700 dark:text-zinc-300">
                    {activeResume.fileName}
                  </span>
                  <span>&bull;</span>
                  <span>{activeResume.fileSize}</span>
                  <span>&bull;</span>
                  <span>Uploaded {activeResume.uploadedAt}</span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 pt-1">
                  Ready for auto-uploading to resume attachment inputs on supported job portals.
                </p>
              </div>
            </div>

            {/* ATS Score & Metrics */}
            <div className="flex items-center gap-6 shrink-0 border-t lg:border-t-0 lg:border-l border-zinc-200/80 dark:border-zinc-800 pt-4 lg:pt-0 lg:pl-6">
              <div className="text-center">
                <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                  {activeResume.atsScore}
                  <span className="text-sm font-normal text-zinc-400">/100</span>
                </div>
                <div className="text-[11px] font-semibold uppercase text-zinc-400 mt-0.5">
                  ATS Score
                </div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100">
                  {activeResume.extractedSkillsCount}
                </div>
                <div className="text-[11px] font-semibold uppercase text-zinc-400 mt-0.5">
                  Skills Parsed
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                  <Download className="w-3.5 h-3.5" /> Download PDF
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two Column Layout: Dropzone & Targeted Resumes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Zone */}
        <Card className="border-dashed border-2 hover:border-blue-400 transition-colors">
          <CardContent className="p-8 text-center flex flex-col items-center justify-center space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-400">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                Drop your updated resume here
              </h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-xs">
                Supports PDF and DOCX up to 10MB. ApplyMate extracts your experiences, skills, and links automatically.
              </p>
            </div>
            <Button
              onClick={handleSimulatedUpload}
              size="sm"
              variant="secondary"
              className="text-xs"
            >
              Browse Files
            </Button>
          </CardContent>
        </Card>

        {/* Stored Resumes List */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between pb-1">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500">
              Stored Targeted Resumes ({resumes.length})
            </h3>
            <span className="text-xs text-zinc-400">
              Switch default depending on role focus
            </span>
          </div>

          {resumes.map((resume) => (
            <Card
              key={resume.id}
              className={`p-5 transition-all ${
                resume.isDefault
                  ? "border-blue-500/50 bg-blue-50/10 dark:bg-blue-950/10 shadow-xs"
                  : "hover:border-zinc-300 dark:hover:border-zinc-700"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                      resume.isDefault
                        ? "bg-blue-600 text-white"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                    }`}
                  >
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                        {resume.title}
                      </span>
                      {resume.isDefault && (
                        <Badge variant="info" className="text-[10px]">
                          Default
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                      <span>{resume.fileName}</span>
                      <span>&bull;</span>
                      <span>ATS: {resume.atsScore}/100</span>
                      <span>&bull;</span>
                      <span>{resume.fileSize}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!resume.isDefault && (
                    <Button
                      onClick={() => setDefault(resume.id)}
                      size="sm"
                      variant="outline"
                      className="text-xs"
                    >
                      Set as Default
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="p-2 text-zinc-400 hover:text-zinc-700">
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
