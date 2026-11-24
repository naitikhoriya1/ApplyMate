"use client";

/**
 * ApplicationPreferencesForm — Manage work authorization, notice period,
 * target titles, locations, and salary expectations for autofill.
 */

import React, { useState } from "react";
import { Sliders, DollarSign, Clock, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { ApplicationPreferences, ValidationErrors } from "@/types/profile";
import { validatePreferences, isValid } from "@/lib/validation/profileValidation.ts";

interface ApplicationPreferencesFormProps {
  preferences: ApplicationPreferences;
  onSave: (preferences: ApplicationPreferences) => void;
}

export function ApplicationPreferencesForm({
  preferences,
  onSave,
}: ApplicationPreferencesFormProps) {
  const [pref, setPref] = useState<ApplicationPreferences>(preferences);
  const [errors, setErrors] = useState<ValidationErrors<ApplicationPreferences>>({});
  const [editing, setEditing] = useState(false);

  function handleSave() {
    const errs = validatePreferences(pref);
    setErrors(errs);
    if (!isValid(errs)) return;
    onSave(pref);
    setEditing(false);
  }

  function handleCancel() {
    setPref(preferences);
    setErrors({});
    setEditing(false);
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <SectionHeader
          icon={<Sliders size={18} />}
          title="Application Preferences"
          description="Default answers used by autofill for repetitive job application questionnaires."
          action={
            editing ? (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave}>
                  Save changes
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
                Edit
              </Button>
            )
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label="Work Authorization"
            error={errors.workAuthorization}
            required
            hint="Your legal right to work in your target country"
          >
            <Input
              value={pref.workAuthorization}
              onChange={(e) => setPref({ ...pref, workAuthorization: e.target.value })}
              disabled={!editing}
              error={!!errors.workAuthorization}
              placeholder="Authorized to work in India"
              icon={<ShieldCheck size={15} />}
            />
          </FormField>

          <FormField
            label="Notice Period / Availability"
            error={errors.noticePeriod}
            required
            hint="How quickly you can join"
          >
            <Input
              value={pref.noticePeriod}
              onChange={(e) => setPref({ ...pref, noticePeriod: e.target.value })}
              disabled={!editing}
              error={!!errors.noticePeriod}
              placeholder="Available immediately / 2 weeks"
              icon={<Clock size={15} />}
            />
          </FormField>

          <FormField label="Desired Salary Expectation" hint="Expected compensation or range">
            <Input
              value={pref.desiredSalary}
              onChange={(e) => setPref({ ...pref, desiredSalary: e.target.value })}
              disabled={!editing}
              placeholder="Competitive / Market standard"
              icon={<DollarSign size={15} />}
            />
          </FormField>

          <FormField label="Preferred Currency" hint="e.g. INR, USD, EUR">
            <Input
              value={pref.currency}
              onChange={(e) => setPref({ ...pref, currency: e.target.value })}
              disabled={!editing}
              placeholder="INR"
            />
          </FormField>
        </div>

        {/* Toggles */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
          <label className="flex items-center gap-3 p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={pref.openToRemote}
              onChange={(e) => setPref({ ...pref, openToRemote: e.target.checked })}
              disabled={!editing}
              className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
            />
            <div className="text-xs">
              <span className="font-semibold block text-zinc-900 dark:text-zinc-100">
                Open to Remote
              </span>
              <span className="text-zinc-500 dark:text-zinc-400">Remote / Hybrid roles</span>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={pref.willingToRelocate}
              onChange={(e) => setPref({ ...pref, willingToRelocate: e.target.checked })}
              disabled={!editing}
              className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
            />
            <div className="text-xs">
              <span className="font-semibold block text-zinc-900 dark:text-zinc-100">
                Willing to Relocate
              </span>
              <span className="text-zinc-500 dark:text-zinc-400">Open to on-site moves</span>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={pref.requiresSponsorship}
              onChange={(e) => setPref({ ...pref, requiresSponsorship: e.target.checked })}
              disabled={!editing}
              className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
            />
            <div className="text-xs">
              <span className="font-semibold block text-zinc-900 dark:text-zinc-100">
                Visa Sponsorship
              </span>
              <span className="text-zinc-500 dark:text-zinc-400">
                {pref.requiresSponsorship ? "Requires sponsorship" : "Will not require"}
              </span>
            </div>
          </label>
        </div>
      </CardContent>
    </Card>
  );
}
