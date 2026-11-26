"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { UploadCloud, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { resumeStorage, validatePdfFile } from "@/lib/storage/resumeStorage";
import type { StoredResumeMetadata } from "@/types/resume";
import { ResumeUploadZone } from "@/components/resume/ResumeUploadZone";
import { ActiveResumeCard } from "@/components/resume/ActiveResumeCard";
import { ResumeList } from "@/components/resume/ResumeList";
import {
  ResumeConfirmationModal,
  type ConfirmationAction,
} from "@/components/resume/ResumeConfirmationModal";

export default function ResumePage() {
  const [resumes, setResumes] = useState<StoredResumeMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<ConfirmationAction | null>(null);

  const headerFileInputRef = useRef<HTMLInputElement | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const replaceTargetRef = useRef<StoredResumeMetadata | null>(null);

  const loadResumes = useCallback(async () => {
    try {
      const list = await resumeStorage.listResumes();
      setResumes(list);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to load resumes from IndexedDB."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    resumeStorage
      .listResumes()
      .then((list) => {
        if (active) setResumes(list);
      })
      .catch((err) => {
        if (active) {
          setErrorMessage(
            err instanceof Error ? err.message : "Failed to load resumes from IndexedDB."
          );
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const showToast = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleUploadSelected = (file: File) => {
    const validation = validatePdfFile(file);
    if (!validation.valid) {
      setErrorMessage(validation.error ?? "Invalid PDF file.");
      return;
    }
    setErrorMessage(null);
    setPendingAction({ kind: "upload", file });
  };

  const handleRequestReplace = (resume: StoredResumeMetadata) => {
    replaceTargetRef.current = resume;
    replaceInputRef.current?.click();
  };

  const handleReplaceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    const target = replaceTargetRef.current;
    replaceTargetRef.current = null;
    if (!file || !target) return;

    const validation = validatePdfFile(file);
    if (!validation.valid) {
      setErrorMessage(validation.error ?? "Invalid PDF file.");
      return;
    }
    setErrorMessage(null);
    setPendingAction({
      kind: "replace",
      targetId: target.id,
      targetName: target.fileName,
      file,
    });
  };

  const handleDownload = async (id: string) => {
    try {
      const record = await resumeStorage.getResume(id);
      if (!record) {
        setErrorMessage("Resume file not found in IndexedDB.");
        return;
      }
      const blob = new Blob([record.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = record.fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setErrorMessage("Could not download PDF from IndexedDB.");
    }
  };

  const handleConfirmAction = async () => {
    if (!pendingAction) return;
    setIsBusy(true);
    setErrorMessage(null);

    try {
      if (pendingAction.kind === "upload") {
        const saved = await resumeStorage.saveResume(pendingAction.file);
        showToast(`Saved "${saved.fileName}" locally in IndexedDB.`);
      } else if (pendingAction.kind === "replace") {
        const updated = await resumeStorage.replaceResume(
          pendingAction.targetId,
          pendingAction.file
        );
        showToast(`Replaced with "${updated.fileName}".`);
      } else if (pendingAction.kind === "select_active") {
        await resumeStorage.setActiveResume(pendingAction.resumeId);
        showToast(`"${pendingAction.fileName}" is now your confirmed active resume.`);
      } else if (pendingAction.kind === "delete") {
        await resumeStorage.deleteResume(pendingAction.resumeId);
        showToast(`Deleted "${pendingAction.fileName}".`);
      }
      await loadResumes();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to complete resume action."
      );
    } finally {
      setIsBusy(false);
      setPendingAction(null);
    }
  };

  const activeResume = resumes.find((r) => r.isDefault) ?? resumes[0] ?? null;

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Hidden browser file pickers */}
      <input
        ref={headerFileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) handleUploadSelected(f);
        }}
        aria-label="Upload PDF resume"
      />
      <input
        ref={replaceInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={handleReplaceFileChange}
        aria-label="Replace PDF resume"
      />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200/80 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Resume Manager
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Store and manage your PDF resumes locally in IndexedDB. Files never leave your browser without explicit confirmation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => headerFileInputRef.current?.click()}
            className="gap-2"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload PDF Resume</span>
          </Button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-200 flex items-center gap-3 text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-800 dark:text-red-200 flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Active Resume Card */}
      {!isLoading && activeResume && (
        <ActiveResumeCard
          resume={activeResume}
          onDownload={handleDownload}
          onRequestReplace={handleRequestReplace}
          onRequestDelete={(r) =>
            setPendingAction({ kind: "delete", resumeId: r.id, fileName: r.fileName })
          }
        />
      )}

      {/* Upload Zone & Stored Resumes List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ResumeUploadZone onFileSelected={handleUploadSelected} />

        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between pb-1">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500">
              Stored PDF Resumes ({resumes.length})
            </h3>
            <span className="text-xs text-zinc-400">
              Stored locally in IndexedDB
            </span>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-sm text-zinc-500">
              Loading stored resumes…
            </div>
          ) : (
            <ResumeList
              resumes={resumes}
              onRequestSelectActive={(r) =>
                setPendingAction({
                  kind: "select_active",
                  resumeId: r.id,
                  fileName: r.fileName,
                  fileSize: r.fileSize,
                })
              }
              onRequestReplace={handleRequestReplace}
              onRequestDelete={(r) =>
                setPendingAction({ kind: "delete", resumeId: r.id, fileName: r.fileName })
              }
              onDownload={handleDownload}
            />
          )}
        </div>
      </div>

      {/* Explicit Confirmation Modal */}
      <ResumeConfirmationModal
        action={pendingAction}
        isBusy={isBusy}
        onConfirm={handleConfirmAction}
        onCancel={() => setPendingAction(null)}
      />
    </div>
  );
}
