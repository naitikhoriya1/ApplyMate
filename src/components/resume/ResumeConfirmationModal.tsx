"use client";

import React from "react";
import { ShieldCheck, FileText, Trash2, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatFileSize } from "@/lib/storage/resumeStorage";

export type ConfirmationAction =
  | { kind: "upload"; file: File }
  | { kind: "replace"; targetId: string; targetName: string; file: File }
  | { kind: "select_active"; resumeId: string; fileName: string; fileSize: number }
  | { kind: "delete"; resumeId: string; fileName: string };

interface ResumeConfirmationModalProps {
  action: ConfirmationAction | null;
  isBusy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ResumeConfirmationModal({
  action,
  isBusy = false,
  onConfirm,
  onCancel,
}: ResumeConfirmationModalProps) {
  if (!action) return null;

  const isDelete = action.kind === "delete";
  const isReplace = action.kind === "replace";
  const isSelect = action.kind === "select_active";

  const title = isDelete
    ? "Delete Stored Resume?"
    : isReplace
      ? "Confirm Resume Replacement"
      : isSelect
        ? "Confirm Resume Selection"
        : "Confirm PDF Resume Upload";

  const description = isDelete
    ? `This will permanently remove "${action.fileName}" from local IndexedDB storage.`
    : isReplace
      ? `Replace "${action.targetName}" with "${action.file.name}" (${formatFileSize(action.file.size)})?`
      : isSelect
        ? `Confirm selecting "${action.fileName}" (${formatFileSize(action.fileSize)}) as your active local resume.`
        : `Store "${action.file.name}" (${formatFileSize(action.file.size)}) locally in your browser's IndexedDB?`;

  const confirmLabel = isDelete
    ? "Delete Resume"
    : isReplace
      ? "Confirm Replace"
      : isSelect
        ? "Confirm Selection"
        : "Confirm & Save Locally";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="resume-confirm-title"
    >
      <Card className="w-full max-w-md shadow-xl border-zinc-200 dark:border-zinc-800">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div
              className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                isDelete
                  ? "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400"
                  : isReplace
                    ? "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"
                    : "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"
              }`}
            >
              {isDelete ? (
                <Trash2 className="w-5 h-5" />
              ) : isReplace ? (
                <RefreshCw className="w-5 h-5" />
              ) : isSelect ? (
                <ShieldCheck className="w-5 h-5" />
              ) : (
                <FileText className="w-5 h-5" />
              )}
            </div>
            <div className="space-y-1">
              <h3
                id="resume-confirm-title"
                className="text-base font-bold text-zinc-900 dark:text-zinc-100"
              >
                {title}
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {description}
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 px-3 py-2 text-[11px] text-zinc-500 dark:text-zinc-400">
            Your PDF stays 100% local in IndexedDB and is never uploaded to external servers or auto-attached without your explicit action.
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={onCancel} disabled={isBusy}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant={isDelete ? "danger" : "primary"}
              onClick={onConfirm}
              disabled={isBusy}
            >
              {isBusy ? "Processing…" : confirmLabel}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

