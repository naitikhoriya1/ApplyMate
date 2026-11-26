"use client";

/**
 * ExperienceManager — Add / edit / remove work experience entries.
 */

import React, { useState } from "react";
import { Briefcase, Plus, Trash2, Pencil, X, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { CalendarDateInput } from "@/components/ui/CalendarDateInput";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { Experience, ValidationErrors } from "@/types/profile";
import { validateExperience, isValid } from "@/lib/validation/profileValidation";
import { formatMonthYear } from "@/utils";

interface ExperienceManagerProps {
  experiences: Experience[];
  onChange: (experiences: Experience[]) => void;
}

const BLANK_EXP: Omit<Experience, "id"> = {
  company: "",
  role: "",
  startDate: "",
  endDate: "",
  current: false,
  description: "",
  skills: [],
};

export function ExperienceManager({ experiences, onChange }: ExperienceManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Experience | null>(null);
  const [errors, setErrors] = useState<ValidationErrors<Experience>>({});
  const [newSkillInput, setNewSkillInput] = useState("");

  function startNew() {
    const id = `exp-${Date.now()}`;
    const newExp: Experience = { id, ...BLANK_EXP };
    setDraft(newExp);
    setEditingId(id);
    setErrors({});
  }

  function startEdit(exp: Experience) {
    setDraft({ ...exp });
    setEditingId(exp.id);
    setErrors({});
  }

  function handleSaveDraft() {
    if (!draft) return;
    const e = validateExperience(draft);
    setErrors(e);
    if (!isValid(e)) return;

    const exists = experiences.find((x) => x.id === draft.id);
    if (exists) {
      onChange(experiences.map((x) => (x.id === draft.id ? draft : x)));
    } else {
      onChange([draft, ...experiences]);
    }
    setEditingId(null);
    setDraft(null);
    setNewSkillInput("");
  }

  function handleCancel() {
    setEditingId(null);
    setDraft(null);
    setErrors({});
    setNewSkillInput("");
  }

  function handleDelete(id: string) {
    onChange(experiences.filter((x) => x.id !== id));
  }

  function addSkill(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    const s = newSkillInput.trim();
    if (s && !draft.skills.includes(s)) {
      setDraft({ ...draft, skills: [...draft.skills, s] });
    }
    setNewSkillInput("");
  }

  function removeSkill(skill: string) {
    if (!draft) return;
    setDraft({ ...draft, skills: draft.skills.filter((sk) => sk !== skill) });
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <SectionHeader
          icon={<Briefcase size={18} />}
          title="Work Experience"
          description="Your employment history — most recent first."
          action={
            !editingId && (
              <Button size="sm" onClick={startNew}>
                <Plus size={14} /> Add experience
              </Button>
            )
          }
        />

        <div className="space-y-4">
          {/* New / editing form */}
          {editingId && draft && (
            <div className="rounded-2xl border-2 border-blue-200 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-950/20 p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Company" error={errors.company} required>
                  <Input
                    value={draft.company}
                    onChange={(e) => setDraft({ ...draft, company: e.target.value })}
                    error={!!errors.company}
                    placeholder="Fibe India"
                  />
                </FormField>
                <FormField label="Role / Title" error={errors.role} required>
                  <Input
                    value={draft.role}
                    onChange={(e) => setDraft({ ...draft, role: e.target.value })}
                    error={!!errors.role}
                    placeholder="Software Engineer Intern"
                  />
                </FormField>
                <FormField label="Start Date" error={errors.startDate} required>
                  <CalendarDateInput
                    value={draft.startDate}
                    onChange={(val) => setDraft({ ...draft, startDate: val })}
                    error={!!errors.startDate}
                    placeholder="Select start date"
                  />
                </FormField>
                <FormField label="End Date" error={errors.endDate}>
                  <CalendarDateInput
                    value={draft.endDate}
                    onChange={(val) => setDraft({ ...draft, endDate: val })}
                    disabled={draft.current}
                    error={!!errors.endDate}
                    placeholder="Select end date"
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
                      I currently work here
                    </span>
                  </label>
                </FormField>
              </div>

              <FormField label="Description">
                <Textarea
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  rows={3}
                  placeholder="Describe your responsibilities and achievements..."
                />
              </FormField>

              {/* Skill chips */}
              <div>
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Skills used
                </p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {draft.skills.map((sk) => (
                    <span
                      key={sk}
                      className="inline-flex items-center gap-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:text-zinc-300"
                    >
                      {sk}
                      <button onClick={() => removeSkill(sk)} className="text-zinc-400 hover:text-rose-500 transition-colors" aria-label={`Remove ${sk}`}>
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
                <form onSubmit={addSkill} className="flex gap-2">
                  <Input
                    value={newSkillInput}
                    onChange={(e) => setNewSkillInput(e.target.value)}
                    placeholder="Add skill…"
                    className="max-w-xs"
                  />
                  <Button type="submit" size="sm" variant="secondary">
                    Add
                  </Button>
                </form>
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

          {/* Experience list */}
          {experiences.length === 0 && !editingId && (
            <div className="rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 py-10 text-center">
              <Briefcase size={28} className="mx-auto text-zinc-300 dark:text-zinc-700 mb-2" />
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                No work experience added yet.
              </p>
            </div>
          )}

          {experiences
            .filter((x) => x.id !== editingId)
            .map((exp) => (
              <div
                key={exp.id}
                className="flex items-start gap-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 p-4 hover:border-zinc-200 dark:hover:border-zinc-700 transition-all"
              >
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500">
                  <Briefcase size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                      {exp.role}
                    </p>
                    {exp.current && (
                      <Badge variant="success">Current</Badge>
                    )}
                  </div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">{exp.company}</p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                    {formatMonthYear(exp.startDate)} —{" "}
                    {exp.current ? "Present" : formatMonthYear(exp.endDate)}
                  </p>
                  {exp.description && (
                    <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      {exp.description}
                    </p>
                  )}
                  {exp.skills.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {exp.skills.map((sk) => (
                        <Badge key={sk} variant="default">{sk}</Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => startEdit(exp)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-all"
                    aria-label="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(exp.id)}
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

