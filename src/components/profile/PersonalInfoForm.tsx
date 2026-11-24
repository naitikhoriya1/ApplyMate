"use client";

/**
 * PersonalInfoForm — Editable personal + contact + social links section.
 */

import React, { useState } from "react";
import { User, Mail, Phone, MapPin, Globe } from "lucide-react";
import { LinkedinIcon, GithubIcon } from "@/components/ui/Icons";
import { Card, CardContent } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { PersonalInfo, SocialLinks, ValidationErrors } from "@/types/profile";
import { validatePersonal, validateSocial, isValid } from "@/lib/validation/profileValidation";

interface PersonalInfoFormProps {
  personal: PersonalInfo;
  social: SocialLinks;
  onSave: (personal: PersonalInfo, social: SocialLinks) => void;
}

export function PersonalInfoForm({ personal, social, onSave }: PersonalInfoFormProps) {
  const [p, setP] = useState<PersonalInfo>(personal);
  const [s, setS] = useState<SocialLinks>(social);
  const [pErrors, setPErrors] = useState<ValidationErrors<PersonalInfo>>({});
  const [sErrors, setSErrors] = useState<ValidationErrors<SocialLinks>>({});
  const [editing, setEditing] = useState(false);

  function handleSave() {
    const pe = validatePersonal(p);
    const se = validateSocial(s);
    setPErrors(pe);
    setSErrors(se);
    if (!isValid(pe) || !isValid(se)) return;
    onSave(p, s);
    setEditing(false);
  }

  function handleCancel() {
    setP(personal);
    setS(social);
    setPErrors({});
    setSErrors({});
    setEditing(false);
  }

  const field = (
    key: keyof PersonalInfo,
    label: string,
    opts?: { required?: boolean; placeholder?: string; icon?: React.ReactNode }
  ) => (
    <FormField label={label} error={pErrors[key]} required={opts?.required}>
      <Input
        value={p[key]}
        onChange={(e) => setP({ ...p, [key]: e.target.value })}
        disabled={!editing}
        error={!!pErrors[key]}
        placeholder={opts?.placeholder}
        icon={opts?.icon}
      />
    </FormField>
  );

  const socialField = (
    key: keyof SocialLinks,
    label: string,
    icon: React.ReactNode,
    placeholder: string
  ) => (
    <FormField label={label} error={sErrors[key]}>
      <Input
        value={s[key]}
        onChange={(e) => setS({ ...s, [key]: e.target.value })}
        disabled={!editing}
        error={!!sErrors[key]}
        placeholder={placeholder}
        icon={icon}
      />
    </FormField>
  );

  return (
    <Card>
      <CardContent className="pt-6">
        <SectionHeader
          icon={<User size={18} />}
          title="Personal Information"
          description="Your identity and contact details used to autofill job applications."
          action={
            editing ? (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleCancel}>Cancel</Button>
                <Button size="sm" onClick={handleSave}>Save changes</Button>
              </div>
            ) : (
              <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>Edit</Button>
            )
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {field("firstName", "First Name", { required: true, placeholder: "Naitik" })}
          {field("lastName", "Last Name", { required: true, placeholder: "Khoriya" })}
          {field("professionalTitle", "Professional Title", {
            required: true,
            placeholder: "QA Automation Engineer | SDET",
          })}
          {field("email", "Email Address", {
            required: true,
            placeholder: "you@example.com",
            icon: <Mail size={15} />,
          })}
          {field("phone", "Phone Number", {
            placeholder: "+91 7877816484",
            icon: <Phone size={15} />,
          })}
          {field("location", "Location", {
            required: true,
            placeholder: "Delhi, India",
            icon: <MapPin size={15} />,
          })}
        </div>

        <div className="mt-4">
          <FormField label="Professional Bio" hint="A short summary used in cover letters and profiles.">
            <Textarea
              value={p.bio}
              onChange={(e) => setP({ ...p, bio: e.target.value })}
              disabled={!editing}
              rows={3}
              placeholder="Describe your expertise and what you're looking for..."
            />
          </FormField>
        </div>

        <div className="mt-6 pt-5 border-t border-zinc-100 dark:border-zinc-800">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-4">
            Online Presence
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {socialField("linkedin", "LinkedIn", <LinkedinIcon size={15} />, "https://linkedin.com/in/username")}
            {socialField("github", "GitHub", <GithubIcon size={15} />, "https://github.com/username")}
            {socialField("portfolio", "Portfolio / Website", <Globe size={15} />, "https://yoursite.com")}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

