"use client";

import React, { useState } from "react";
import {
  User,
  Briefcase,
  GraduationCap,
  Sparkles,
  Plus,
  Trash2,
  CheckCircle2,
  Globe,
  Share2,
  Code,
  Mail,
  Phone,
  MapPin,
  Save,
} from "lucide-react";
import {
  initialProfile,
  initialExperiences,
  initialEducation,
  initialSkills,
} from "@/lib/mockData";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<
    "personal" | "experience" | "education" | "skills" | "qa"
  >("personal");
  const [profile, setProfile] = useState(initialProfile);
  const [skills, setSkills] = useState(initialSkills);
  const [newSkill, setNewSkill] = useState("");
  const [saveToast, setSaveToast] = useState(false);

  const handleSave = () => {
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };

  const addSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill("");
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200/80 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              My Profile
            </h1>
            <Badge variant="success">88% Complete</Badge>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Manage your personal details, work experience, and custom answers for instant Safari autofill.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {saveToast && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> Saved to local cache
            </span>
          )}
          <Button onClick={handleSave} className="gap-2">
            <Save className="w-4 h-4" />
            <span>Save Profile</span>
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-zinc-100 dark:border-zinc-800/60 text-sm font-medium">
        {[
          { id: "personal", label: "Personal Information", icon: User },
          { id: "experience", label: "Work Experience", icon: Briefcase },
          { id: "education", label: "Education", icon: GraduationCap },
          { id: "skills", label: "Skills & Tags", icon: Sparkles },
          { id: "qa", label: "Custom Autofill Q&A", icon: CheckCircle2 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? "bg-blue-600 text-white shadow-sm font-semibold"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Personal Info */}
      {activeTab === "personal" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Contact & Identity</CardTitle>
              <CardDescription>
                Directly mapped to First Name, Last Name, Email, and Phone fields on job portals.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={profile.firstName}
                    onChange={(e) =>
                      setProfile({ ...profile, firstName: e.target.value })
                    }
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={profile.lastName}
                    onChange={(e) =>
                      setProfile({ ...profile, lastName: e.target.value })
                    }
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) =>
                        setProfile({ ...profile, email: e.target.value })
                      }
                      className="w-full pl-9 pr-3.5 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                    <input
                      type="tel"
                      value={profile.phone}
                      onChange={(e) =>
                        setProfile({ ...profile, phone: e.target.value })
                      }
                      className="w-full pl-9 pr-3.5 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">
                  Current Location
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={profile.location}
                    onChange={(e) =>
                      setProfile({ ...profile, location: e.target.value })
                    }
                    className="w-full pl-9 pr-3.5 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">
                  Professional Headline
                </label>
                <input
                  type="text"
                  value={profile.headline}
                  onChange={(e) =>
                    setProfile({ ...profile, headline: e.target.value })
                  }
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">
                  Professional Summary
                </label>
                <textarea
                  rows={3}
                  value={profile.summary}
                  onChange={(e) =>
                    setProfile({ ...profile, summary: e.target.value })
                  }
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Social & Portfolio Links */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Links & Portfolios</CardTitle>
                <CardDescription>
                  Autofilled into social & web portfolio inputs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    LinkedIn Profile
                  </label>
                  <div className="relative">
                    <Share2 className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                    <input
                      type="url"
                      value={profile.linkedin}
                      onChange={(e) =>
                        setProfile({ ...profile, linkedin: e.target.value })
                      }
                      className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    GitHub Profile
                  </label>
                  <div className="relative">
                    <Code className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                    <input
                      type="url"
                      value={profile.github}
                      onChange={(e) =>
                        setProfile({ ...profile, github: e.target.value })
                      }
                      className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    Personal Portfolio / Website
                  </label>
                  <div className="relative">
                    <Globe className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                    <input
                      type="url"
                      value={profile.portfolio}
                      onChange={(e) =>
                        setProfile({ ...profile, portfolio: e.target.value })
                      }
                      className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-none"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200/60 dark:border-blue-800/40">
              <CardContent className="p-5 space-y-2">
                <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                  Safari Autofill Tip
                </span>
                <p className="text-xs text-blue-900/80 dark:text-blue-200/80 leading-relaxed">
                  ApplyMate automatically maps your LinkedIn, GitHub, and Portfolio URLs to both standard text inputs and URL-type inputs across Greenhouse, Lever, and Workday.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Tab 2: Work Experience */}
      {activeTab === "experience" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-zinc-500">
              {initialExperiences.length} verified professional roles ready for multi-role autofill.
            </p>
            <Button size="sm" variant="outline" className="gap-1.5">
              <Plus className="w-4 h-4" /> Add Experience
            </Button>
          </div>

          <div className="space-y-4">
            {initialExperiences.map((exp) => (
              <Card key={exp.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                          {exp.role}
                        </h3>
                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                          @{exp.company}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1">
                        <span>{exp.period}</span>
                        <span>&bull;</span>
                        <span>{exp.location}</span>
                      </div>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-3 leading-relaxed">
                        {exp.description}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {exp.skills.map((skill) => (
                          <Badge key={skill} variant="outline" className="text-[11px]">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Education */}
      {activeTab === "education" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-zinc-500">
              Education credentials parsed and structured.
            </p>
            <Button size="sm" variant="outline" className="gap-1.5">
              <Plus className="w-4 h-4" /> Add Degree
            </Button>
          </div>

          {initialEducation.map((edu) => (
            <Card key={edu.id}>
              <CardContent className="p-6 flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    {edu.school}
                  </h3>
                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mt-0.5">
                    {edu.degree}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-zinc-500 mt-2">
                    <span>{edu.period}</span>
                    <span>&bull;</span>
                    <span>GPA: {edu.gpa}</span>
                  </div>
                </div>
                <Badge variant="success">Verified</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tab 4: Skills */}
      {activeTab === "skills" && (
        <Card>
          <CardHeader>
            <CardTitle>Technical Skills & Competencies</CardTitle>
            <CardDescription>
              Used to auto-match and populate skill checkboxes, dropdowns, and tag inputs on portals.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={addSkill} className="flex gap-2 max-w-md">
              <input
                type="text"
                placeholder="Add a new skill (e.g. Next.js, Docker)..."
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                className="flex-1 px-3.5 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <Button type="submit" size="sm" className="gap-1.5">
                <Plus className="w-4 h-4" /> Add
              </Button>
            </form>

            <div className="flex flex-wrap gap-2 pt-2">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-700"
                >
                  <span>{skill}</span>
                  <button
                    type="button"
                    onClick={() => removeSkill(skill)}
                    className="hover:text-rose-500 p-0.5 rounded cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab 5: Custom Autofill QA */}
      {activeTab === "qa" && (
        <Card>
          <CardHeader>
            <CardTitle>Repetitive Portal Questions (Custom Q&A)</CardTitle>
            <CardDescription>
              Pre-configured answers to common questions asked on application forms.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                Are you legally authorized to work in the country you are applying for?
              </label>
              <input
                type="text"
                defaultValue="Yes"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                Will you now or in the future require visa sponsorship?
              </label>
              <input
                type="text"
                defaultValue="No"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                What is your target / desired annual compensation?
              </label>
              <input
                type="text"
                defaultValue={profile.desiredSalary}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                What is your available start date / notice period?
              </label>
              <input
                type="text"
                defaultValue={profile.noticePeriod}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
