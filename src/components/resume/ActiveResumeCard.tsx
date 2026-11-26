"use client";

import React from "react";
import { FileText, Download, RefreshCw, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { StoredResumeMetadata } from "@/types/resume";
import { formatFileSize } from "@/lib/storage/resumeStorage";

interface ActiveResumeCardProps {
  resume: StoredResumeMetadata;
  onDownload: (id: string) => void;
  onRequestReplace: (resume: StoredResumeMetadata) => void;
  onRequestDelete: (resume: StoredResumeMetadata) => void;
}

export function ActiveResumeCard({
  resume,
  onDownload,
  onRequestReplace,
  onRequestDelete,
}: ActiveResumeCardProps) {
  const formattedDate = new Date(resume.uploadedAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <Card className="border-blue-200/80 dark:border-blue-900/40 bg-linear-to-b from-blue-50/30 to-white dark:from-blue-950/10 dark:to-zinc-900">
      <CardContent className="p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
              <FileText className="w-7 h-7" />
            </div>
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 break-all">
                  {resume.fileName}
                </h2>
                <Badge variant="success">Confirmed Active Resume</Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 flex-wrap">
                <span>{formatFileSize(resume.fileSize)}</span>
                <span>&bull;</span>
                <span>Uploaded {formattedDate}</span>
                <span>&bull;</span>
                <span>Stored in IndexedDB</span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 pt-1">
                Stored locally in your browser. Never auto-uploaded without your explicit confirmation.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0 border-t lg:border-t-0 lg:border-l border-zinc-200/80 dark:border-zinc-800 pt-4 lg:pt-0 lg:pl-6">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={() => onDownload(resume.id)}
            >
              <Download className="w-3.5 h-3.5" /> Download PDF
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={() => onRequestReplace(resume)}
            >
              <RefreshCw className="w-3.5 h-3.5" /> Replace
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
              onClick={() => onRequestDelete(resume)}
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

