import Link from "next/link";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans">
      {/* Navigation Header */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              A
            </div>
            <span className="font-semibold text-xl tracking-tight">ApplyMate</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-medium ml-1">
              Safari Extension
            </span>
          </div>

          <nav className="flex items-center gap-6 text-sm font-medium">
            <Link
              href="/"
              className="text-blue-600 dark:text-blue-400 font-semibold"
            >
              Dashboard
            </Link>
            <Link
              href="/profile"
              className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
            >
              Profile
            </Link>
            <Link
              href="/resume"
              className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
            >
              Resume
            </Link>
            <Link
              href="/settings"
              className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
            >
              Settings
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-12 flex flex-col gap-12">
        {/* Hero Section */}
        <section className="flex flex-col items-start gap-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Extension Foundation Active (Manifest V3)
          </div>

          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
            Your Personal Job Application Autofill Assistant
          </h1>

          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl leading-relaxed">
            ApplyMate connects your structured personal profile, work history, and resumes directly to job portals via your Safari browser extension.
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-2">
            <Link
              href="/profile"
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors shadow-sm"
            >
              Set Up Profile
            </Link>
            <Link
              href="/settings"
              className="px-5 py-2.5 rounded-xl bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-medium text-sm transition-colors"
            >
              Extension Instructions
            </Link>
          </div>
        </section>

        {/* Dashboard Overview Cards */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-bold tracking-tight">Overview & Status</h2>
          <DashboardOverview />
        </section>

        {/* Architecture & Feature Breakdown */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50">
            <h3 className="text-lg font-semibold mb-2">Web Dashboard (Next.js)</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">
              Provides the UI to manage your identity data, past experiences, education, and resume files. Data is stored cleanly without complex third-party backends.
            </p>
            <ul className="text-sm text-zinc-700 dark:text-zinc-300 space-y-1.5 list-disc list-inside">
              <li>App Router architecture under <code className="font-mono text-xs bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">src/app/</code></li>
              <li>Reusable modular components under <code className="font-mono text-xs bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">src/components/</code></li>
              <li>Shared TypeScript types under <code className="font-mono text-xs bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">src/types/</code></li>
            </ul>
          </div>

          <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50">
            <h3 className="text-lg font-semibold mb-2">Safari Extension Runtime</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">
              Independent WebExtension runtime that injects directly into job portals to detect inputs and display the floating ApplyMate autofill button.
            </p>
            <ul className="text-sm text-zinc-700 dark:text-zinc-300 space-y-1.5 list-disc list-inside">
              <li>Isolated runtime in <code className="font-mono text-xs bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">extension/</code></li>
              <li>Manifest V3 configuration with service worker</li>
              <li>Independent build via <code className="font-mono text-xs bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">npm run build:extension</code></li>
            </ul>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-6 mt-auto">
        <div className="max-w-6xl mx-auto px-6 text-center text-xs text-zinc-500">
          ApplyMate &mdash; Built with Next.js, TypeScript &amp; Safari Web Extensions API.
        </div>
      </footer>
    </div>
  );
}
