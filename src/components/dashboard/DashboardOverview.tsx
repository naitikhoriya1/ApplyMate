import React from "react";
import Link from "next/link";

interface DashboardStat {
  label: string;
  value: string;
  description: string;
  href: string;
  actionText: string;
}

const stats: DashboardStat[] = [
  {
    label: "Personal Profile",
    value: "Configured",
    description: "Contact details, work history, and education ready for autofill",
    href: "/profile",
    actionText: "Edit Profile",
  },
  {
    label: "Stored Resumes",
    value: "1 Active",
    description: "Default PDF resume attached for supported upload inputs",
    href: "/resume",
    actionText: "Manage Resumes",
  },
  {
    label: "Safari Extension",
    value: "v1.0.0 Ready",
    description: "Manifest V3 configured with document detection & trigger button",
    href: "/settings",
    actionText: "View Extension Settings",
  },
];

export function DashboardOverview() {
  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 shadow-sm flex flex-col justify-between"
          >
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400">
                {stat.label}
              </span>
              <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {stat.value}
              </div>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {stat.description}
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <Link
                href={stat.href}
                className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5"
              >
                <span>{stat.actionText}</span>
                <span>&rarr;</span>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

