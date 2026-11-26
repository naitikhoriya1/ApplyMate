"use client";

import React from "react";
import { FileText, Download, RefreshCw, Trash2, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { StoredResumeMetadata } from "@/types/resume";
import { formatFileSize } from "@/lib/storage/resumeStorage";

interface ResumeListProps {
  resumes: StoredResumeMetadata[];
  onRequestSelectActive: (resume: StoredResumeMetadata) => void;
  onRequestReplace: (resume: StoredResumeMetadata) => void;
  onRequestDelete: (resume: StoredResumeMetadata) => void;
  onDownload: (id: string) => void;
}

export function ResumeList({
  resumes,
  onRequestSelectActive,
  onRequestReplace,
  onRequestDelete,
  onDownload,
}: ResumeListProps) {
  if (resumes.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          No PDF resumes stored yet
        </p>
        <p className="text-xs text-zinc-500 mt-1">
          Use the file picker to select a PDF resume and store it locally in IndexedDB.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {resumes.map((resume) => {
        const uploadedDate = new Date(resume.uploadedAt).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        });

        return (
          <Card
            key={resume.id}
            className={`p-4 sm:p-5 transition-all ${
              resume.isDefault
                ? "border-blue-500/50 bg-blue-50/10 dark:bg-blue-950/10 shadow-xs"
                : "hover:border-zinc-300 dark:hover:border-zinc-700"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                      {resume.fileName}
                    </span>
                    {resume.isDefault && (
                      <Badge variant="info" className="text-[10px]">
                        Active
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5 flex-wrap">
                    <span>{formatFileSize(resume.fileSize)}</span>
                    <span>&bull;</span>
                    <span>Uploaded {uploadedDate}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap shrink-0">
                {!resume.isDefault && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="gap-1 text-xs"
                    onClick={() => onRequestSelectActive(resume)}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Select Active
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 text-xs"
                  onClick={() => onDownload(resume.id)}
                  title="Download PDF"
                >
                  <Download className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 text-xs"
                  onClick={() => onRequestReplace(resume)}
                  title="Replace PDF"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                  onClick={() => onRequestDelete(resume)}
                  title="Delete PDF"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

