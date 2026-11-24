"use client";

/**
 * SkillsManager — Tag-style skills management with keyboard shortcuts.
 */

import React, { useState } from "react";
import { Sparkles, X, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SectionHeader } from "@/components/ui/SectionHeader";

interface SkillsManagerProps {
  skills: string[];
  onChange: (skills: string[]) => void;
}

export function SkillsManager({ skills, onChange }: SkillsManagerProps) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  function addSkill(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    if (skills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      setError("Skill already added.");
      return;
    }
    onChange([...skills, trimmed]);
    setInput("");
    setError("");
  }

  function removeSkill(skill: string) {
    onChange(skills.filter((s) => s !== skill));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addSkill();
    }
    if (e.key === "Backspace" && !input && skills.length > 0) {
      onChange(skills.slice(0, -1));
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <SectionHeader
          icon={<Sparkles size={18} />}
          title="Skills"
          description={`${skills.length} skill${skills.length !== 1 ? "s" : ""} added · used to match and autofill job requirements.`}
        />

        {/* Skill chips */}
        <div className="flex flex-wrap gap-2 mb-4 min-h-[2.5rem]">
          {skills.length === 0 && (
            <p className="text-sm text-zinc-400 dark:text-zinc-500 italic">
              No skills added yet — type below to add your first.
            </p>
          )}
          {skills.map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 px-3 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-300 transition-all hover:border-blue-300 dark:hover:border-blue-700"
            >
              {skill}
              <button
                onClick={() => removeSkill(skill)}
                className="text-blue-400 hover:text-rose-500 transition-colors"
                aria-label={`Remove ${skill}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>

        {/* Add skill form */}
        <form onSubmit={addSkill} className="flex gap-2 items-start">
          <div className="flex-1">
            <Input
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                if (error) setError("");
              }}
              onKeyDown={handleKeyDown}
              placeholder="Type a skill and press Enter…"
              error={!!error}
            />
            {error && (
              <p className="mt-1 text-xs text-rose-500 dark:text-rose-400">{error}</p>
            )}
          </div>
          <Button type="submit" size="sm" variant="secondary">
            <Plus size={14} /> Add
          </Button>
        </form>

        <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
          Tip: press <kbd className="rounded bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 text-[10px] font-mono">Enter</kbd> to add, <kbd className="rounded bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 text-[10px] font-mono">Backspace</kbd> to remove last.
        </p>
      </CardContent>
    </Card>
  );
}

