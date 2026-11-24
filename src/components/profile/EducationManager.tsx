"use client";

/**
 * EducationManager — Add / edit / remove education entries.
 */

import React, { useState } from "react";
import { GraduationCap, Plus, Trash2, Pencil, X, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { Education, ValidationErrors } from "@/types/profile";
import { validateEducation, isValid } from "@/lib/validation/profileValidation";
import { formatMonthYear } from "@/utils";

interface EducationManagerProps {
  education: Education[];
  onChange: (education: Education[]) => void;
}

const BLANK_EDU: Omit<Education, "id"> = {
  institution: "",
  degree: "",
  fieldOfStudy: "",
  startDate: "",
  endDate: "",
  current: false,
  grade: "",
};

export function EducationManager({ education, onChange }: EducationManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Education | null>(null);
  const [errors, setErrors] = useState<ValidationErrors<Education>>({});

  function startNew() {
    const id = `edu-${Date.now()}`;
    setDraft({ id, ...BLANK_EDU });
    setEditingId(id);
    setErrors({});
  }

  function startEdit(edu: Education) {
    setDraft({ ...edu });
    setEditingId(edu.id);
    setErrors({});
  }

  function handleSaveDraft() {
    if (!draft) return;
    const e = validateEducation(draft);
    setErrors(e);
    if (!isValid(e)) return;

    const exists = education.find((x) => x.id === draft.id);
    if (exists) {
      onChange(education.map((x) => (x.id === draft.id ? draft : x)));
    } else {
      onChange([...education, draft]);
    }
    setEditingId(null);
    setDraft(null);
  }

  function handleCancel() {
    setEditingId(null);
    setDraft(null);
    setErrors({});
  }

  function handleDelete(id: string) {
    onChange(education.filter((x) => x.id !== id));
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <SectionHeader
          icon={<GraduationCap size={18} />}
          title="Education"
          description="Your academic background and qualifications."
          action={
            !editingId && (
              <Button size="sm" onClick={startNew}>
                <Plus size={14} /> Add education
              </Button>
            )
          }
        />

        <div className="space-y-4">
          {/* Editing form */}
          {editingId && draft && (
            <div className="rounded-2xl border-2 border-blue-200 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-950/20 p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Institution" error={errors.institution} required className="sm:col-span-2">
                  <Input
                    value={draft.institution}
                    onChange={(e) => setDraft({ ...draft, institution: e.target.value })}
                    error={!!errors.institution}
                    placeholder="Bikaner Technical University"
                  />
                </FormField>
                <FormField label="Degree" error={errors.degree} required>
                  <Input
                    value={draft.degree}
                    onChange={(e) => setDraft({ ...draft, degree: e.target.value })}
                    error={!!errors.degree}
                    placeholder="B.Tech"
                  />
                </FormField>
                <FormField label="Field of Study" error={errors.fieldOfStudy} required>
                  <Input
                    value={draft.fieldOfStudy}
                    onChange={(e) => setDraft({ ...draft, fieldOfStudy: e.target.value })}
                    error={!!errors.fieldOfStudy}
                    placeholder="Computer Science and Engineering"
                  />
                </FormField>
                <FormField label="Start Date" error={errors.startDate} required>
                  <Input
                    type="month"
                    value={draft.startDate}
                    onChange={(e) => setDraft({ ...draft, startDate: e.target.value })}
                    error={!!errors.startDate}
                  />
                </FormField>
                <FormField label="End Date" error={errors.endDate}>
                  <Input
                    type="month"
                    value={draft.endDate}
                    onChange={(e) => setDraft({ ...draft, endDate: e.target.value })}
                    disabled={draft.current}
                    error={!!errors.endDate}
                  />
                  <label className="mt-1.5 flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={draft.current}
                      onChange={(e) =>
                        setDraft({ ...draft, current: e.target.checked, endDate: "" })
                      }
                      className="rounded border-zinc-300 dark:border-zinc-700 text-blue-600"
                    />
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      Currently enrolled
                    </span>
                  </label>
                </FormField>
                <FormField label="Grade / GPA" hint="Optional">
                  <Input
                    value={draft.grade ?? ""}
                    onChange={(e) => setDraft({ ...draft, grade: e.target.value })}
                    placeholder="8.5 / 10.0"
                  />
                </FormField>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={handleCancel}>
                  <X size={13} /> Cancel
                </Button>
                <Button size="sm" onClick={handleSaveDraft}>
                  <Check size={13} /> Save entry
                </Button>
              </div>
            </div>
          )}

          {/* Education list */}
          {education.length === 0 && !editingId && (
            <div className="rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 py-10 text-center">
              <GraduationCap size={28} className="mx-auto text-zinc-300 dark:text-zinc-700 mb-2" />
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                No education entries added yet.
              </p>
            </div>
          )}

          {education
            .filter((x) => x.id !== editingId)
            .map((edu) => (
              <div
                key={edu.id}
                className="flex items-start gap-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 p-4 hover:border-zinc-200 dark:hover:border-zinc-700 transition-all"
              >
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500">
                  <GraduationCap size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                    {edu.degree}
                    {edu.fieldOfStudy && ` in ${edu.fieldOfStudy}`}
                  </p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">{edu.institution}</p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                    {formatMonthYear(edu.startDate)} —{" "}
                    {edu.current ? "Present" : formatMonthYear(edu.endDate)}
                    {edu.grade && ` · ${edu.grade}`}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => startEdit(edu)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-all"
                    aria-label="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(edu.id)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all"
                    aria-label="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}

