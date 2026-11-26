"use client";

import React, { useRef, useState } from "react";
import { UploadCloud, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { validatePdfFile } from "@/lib/storage/resumeStorage";

interface ResumeUploadZoneProps {
  onFileSelected: (file: File) => void;
}

export function ResumeUploadZone({ onFileSelected }: ResumeUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCandidateFile = (file: File | undefined) => {
    if (!file) return;
    const validation = validatePdfFile(file);
    if (!validation.valid) {
      setError(validation.error ?? "Invalid PDF file.");
      return;
    }
    setError(null);
    onFileSelected(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    handleCandidateFile(file);
    // Reset input so selecting the same file again triggers onChange
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    handleCandidateFile(file);
  };

  return (
    <Card
      className={`border-dashed border-2 transition-colors ${
        isDragging
          ? "border-blue-500 bg-blue-50/40 dark:bg-blue-950/20"
          : "hover:border-blue-400"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <CardContent className="p-8 text-center flex flex-col items-center justify-center space-y-4">
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={handleInputChange}
          aria-label="Select PDF resume file"
        />

        <div className="h-12 w-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-400">
          <UploadCloud className="w-6 h-6" />
        </div>

        <div>
          <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
            Select or drop a PDF resume
          </h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-xs">
            PDF only, up to 10 MB. Stored locally in IndexedDB after you confirm.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 rounded-lg px-3 py-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Button
          type="button"
          onClick={() => inputRef.current?.click()}
          size="sm"
          variant="secondary"
          className="text-xs"
        >
          Browse PDF File
        </Button>
      </CardContent>
    </Card>
  );
}

