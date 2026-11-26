"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { InitialSetupWizard } from "@/components/setup/InitialSetupWizard";

function SetupContent() {
  const searchParams = useSearchParams();
  const modeParam = searchParams.get("mode");
  const initialMode =
    modeParam === "manual"
      ? "manual"
      : modeParam === "resume"
        ? "resume"
        : "choose";

  return <InitialSetupWizard initialMode={initialMode} />;
}

export default function SetupPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-sm text-zinc-500">
          Loading setup…
        </div>
      }
    >
      <SetupContent />
    </Suspense>
  );
}

