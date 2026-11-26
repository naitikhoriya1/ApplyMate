import test from "node:test";
import assert from "node:assert/strict";
import { MemoryStorageAdapter } from "../src/lib/storage/adapters/index.ts";
import {
  ApplicationStorageService,
  validateApplicationInput,
  filterApplications,
  computeApplicationStats,
} from "../src/lib/storage/applicationStorage.ts";
import { APPLICATION_STATUSES } from "../src/types/application.ts";

test("Supports all 6 required application statuses", () => {
  assert.deepStrictEqual(APPLICATION_STATUSES, [
    "Interested",
    "Preparing",
    "Applied",
    "Interview",
    "Rejected",
    "Offer",
  ]);
});

test("validateApplicationInput enforces required fields and valid URLs", () => {
  assert.strictEqual(
    validateApplicationInput({ companyName: "", jobTitle: "SDET" }).valid,
    false
  );
  assert.strictEqual(
    validateApplicationInput({ companyName: "Fibe", jobTitle: "" }).valid,
    false
  );
  assert.strictEqual(
    validateApplicationInput({
      companyName: "Fibe",
      jobTitle: "SDET",
      applicationUrl: "not-a-url",
    }).valid,
    false
  );
  assert.strictEqual(
    validateApplicationInput({
      companyName: "Fibe",
      jobTitle: "SDET",
      applicationUrl: "https://fibe.in/careers/sdet",
      status: "Preparing",
    }).valid,
    true
  );
});

test("ApplicationStorageService CRUD, explicit submission confirmation, stats, search, filter, and activity", async () => {
  const service = new ApplicationStorageService(new MemoryStorageAdapter());

  // 1. Add application (must NOT assume submitted!)
  const app1 = await service.addApplication({
    companyName: "Fibe India",
    jobTitle: "QA Automation Engineer",
    applicationUrl: "https://fibe.in/jobs/qa",
    resumeUsed: "Naitik_QA_Resume.pdf",
    status: "Preparing",
    notes: "Tailored Playwright skills",
  });

  assert.strictEqual(app1.submittedConfirmed, false);
  assert.strictEqual(app1.status, "Preparing");

  // 2. Confirm submission explicitly
  const confirmed = await service.confirmSubmission(app1.id, "2026-11-26");
  assert.strictEqual(confirmed.submittedConfirmed, true);
  assert.strictEqual(confirmed.status, "Applied");
  assert.strictEqual(confirmed.applicationDate, "2026-11-26");
  assert.ok(confirmed.submittedConfirmedAt);

  // 3. Add a second application and update its status to Interview
  const app2 = await service.addApplication({
    companyName: "Credit Samadhaan",
    jobTitle: "QA Engineer (Executive)",
    status: "Interested",
  });
  const updated2 = await service.updateApplication(app2.id, {
    status: "Interview",
    notes: "Technical round scheduled",
  });
  assert.strictEqual(updated2.status, "Interview");

  // 4. List, search, and filter
  const all = await service.listApplications();
  assert.strictEqual(all.length, 2);

  assert.strictEqual(filterApplications(all, "fibe", "All").length, 1);
  assert.strictEqual(filterApplications(all, "", "Interview").length, 1);
  assert.strictEqual(filterApplications(all, "Playwright", "Applied").length, 1);

  // 5. Statistics
  const stats = computeApplicationStats(all);
  assert.strictEqual(stats.total, 2);
  assert.strictEqual(stats.confirmedSubmissions, 1);
  assert.strictEqual(stats.byStatus.Applied, 1);
  assert.strictEqual(stats.byStatus.Interview, 1);

  // 6. Recent activity
  const activity = await service.getRecentActivity();
  assert.ok(activity.length >= 4);
  assert.ok(activity.some((a) => a.action === "submission_confirmed"));
  assert.ok(activity.some((a) => a.action === "status_changed"));

  // 7. Delete
  await service.deleteApplication(app2.id);
  const afterDelete = await service.listApplications();
  assert.strictEqual(afterDelete.length, 1);
});
