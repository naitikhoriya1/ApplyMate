/**
 * ApplyMate — IndexedDB Resume Storage Service
 *
 * Stores PDF resume files locally in IndexedDB (`applymate_resumes_db`).
 * Never uses localStorage for PDF storage and never performs network uploads.
 */

import type {
  StoredResumeMetadata,
  StoredResumeRecord,
  ResumeValidationResult,
} from "@/types/resume";

export const RESUME_DB_NAME = "applymate_resumes_db";
export const RESUME_DB_VERSION = 1;
export const RESUME_STORE_NAME = "resumes";
export const MAX_RESUME_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Validates that a selected file is a non-empty PDF within the size limit.
 */
export function validatePdfFile(file: {
  name: string;
  size: number;
  type?: string;
}): ResumeValidationResult {
  const lowerName = (file.name ?? "").toLowerCase().trim();
  const mime = (file.type ?? "").toLowerCase().trim();

  if (!lowerName.endsWith(".pdf") && mime !== "application/pdf") {
    return {
      valid: false,
      error: "Only PDF files (.pdf) are supported.",
    };
  }

  if (mime && mime !== "application/pdf") {
    return {
      valid: false,
      error: "Invalid file type. Please select a valid PDF document.",
    };
  }

  if (file.size <= 0) {
    return {
      valid: false,
      error: "The selected PDF file is empty.",
    };
  }

  if (file.size > MAX_RESUME_SIZE_BYTES) {
    return {
      valid: false,
      error: "PDF file exceeds the 10 MB size limit.",
    };
  }

  return { valid: true };
}

/**
 * Formats byte count into a human-readable file size string.
 */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

function generateResumeId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `res-${crypto.randomUUID()}`;
  }
  return `res-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Wraps IndexedDB operations for storing, listing, replacing, and deleting PDF resumes.
 */
export class ResumeStorageService {
  private idbFactory: IDBFactory | null;

  constructor(idbFactory?: IDBFactory | null) {
    if (idbFactory !== undefined) {
      this.idbFactory = idbFactory;
    } else if (typeof indexedDB !== "undefined") {
      this.idbFactory = indexedDB;
    } else {
      this.idbFactory = null;
    }
  }

  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (!this.idbFactory) {
        reject(new Error("IndexedDB is not available in this environment."));
        return;
      }

      const request = this.idbFactory.open(RESUME_DB_NAME, RESUME_DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(RESUME_STORE_NAME)) {
          db.createObjectStore(RESUME_STORE_NAME, { keyPath: "id" });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error ?? new Error("Failed to open IndexedDB."));
    });
  }

  private async runTx<T>(
    mode: IDBTransactionMode,
    fn: (store: IDBObjectStore) => IDBRequest<T>
  ): Promise<T> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(RESUME_STORE_NAME, mode);
      const store = tx.objectStore(RESUME_STORE_NAME);
      const req = fn(store);

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error("IndexedDB request failed."));
    });
  }

  /**
   * Lists metadata for all stored resumes, sorted newest first.
   */
  async listResumes(): Promise<StoredResumeMetadata[]> {
    const records = await this.runTx<StoredResumeRecord[]>("readonly", (store) =>
      store.getAll()
    );
    return (records ?? [])
      .map((r) => ({
        id: r.id,
        fileName: r.fileName,
        fileSize: r.fileSize,
        mimeType: r.mimeType,
        uploadedAt: r.uploadedAt,
        updatedAt: r.updatedAt,
        isDefault: r.isDefault,
      }))
      .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  }

  /**
   * Retrieves a full resume record (including binary PDF data) by ID.
   */
  async getResume(id: string): Promise<StoredResumeRecord | null> {
    const record = await this.runTx<StoredResumeRecord | undefined>(
      "readonly",
      (store) => store.get(id)
    );
    return record ?? null;
  }

  /**
   * Retrieves the active/default resume (or the most recently uploaded one).
   */
  async getActiveResume(): Promise<StoredResumeRecord | null> {
    const records = await this.runTx<StoredResumeRecord[]>("readonly", (store) =>
      store.getAll()
    );
    if (!records || records.length === 0) return null;
    return records.find((r) => r.isDefault) ?? records[0];
  }

  /**
   * Stores a new PDF resume in IndexedDB after validation.
   * Sets it as default if it is the first resume or `makeDefault` is true.
   */
  async saveResume(
    file: { name: string; size: number; type?: string; arrayBuffer: () => Promise<ArrayBuffer> },
    options: { makeDefault?: boolean } = {}
  ): Promise<StoredResumeMetadata> {
    const validation = validatePdfFile(file);
    if (!validation.valid) {
      throw new Error(validation.error ?? "Invalid PDF file.");
    }

    const existing = await this.listResumes();
    const shouldBeDefault = options.makeDefault ?? existing.length === 0;
    const buffer = await file.arrayBuffer();
    const now = new Date().toISOString();

    if (shouldBeDefault && existing.length > 0) {
      await this.clearDefaultFlags();
    }

    const record: StoredResumeRecord = {
      id: generateResumeId(),
      fileName: file.name,
      fileSize: file.size,
      mimeType: "application/pdf",
      uploadedAt: now,
      updatedAt: now,
      isDefault: shouldBeDefault,
      data: buffer,
    };

    await this.runTx("readwrite", (store) => store.put(record));

    return {
      id: record.id,
      fileName: record.fileName,
      fileSize: record.fileSize,
      mimeType: record.mimeType,
      uploadedAt: record.uploadedAt,
      updatedAt: record.updatedAt,
      isDefault: record.isDefault,
    };
  }

  /**
   * Replaces an existing stored resume's PDF file and metadata in IndexedDB.
   */
  async replaceResume(
    id: string,
    file: { name: string; size: number; type?: string; arrayBuffer: () => Promise<ArrayBuffer> }
  ): Promise<StoredResumeMetadata> {
    const validation = validatePdfFile(file);
    if (!validation.valid) {
      throw new Error(validation.error ?? "Invalid PDF file.");
    }

    const existing = await this.getResume(id);
    if (!existing) {
      throw new Error("Resume to replace was not found.");
    }

    const buffer = await file.arrayBuffer();
    const now = new Date().toISOString();

    const updated: StoredResumeRecord = {
      ...existing,
      fileName: file.name,
      fileSize: file.size,
      mimeType: "application/pdf",
      uploadedAt: now,
      updatedAt: now,
      data: buffer,
    };

    await this.runTx("readwrite", (store) => store.put(updated));

    return {
      id: updated.id,
      fileName: updated.fileName,
      fileSize: updated.fileSize,
      mimeType: updated.mimeType,
      uploadedAt: updated.uploadedAt,
      updatedAt: updated.updatedAt,
      isDefault: updated.isDefault,
    };
  }

  /**
   * Marks a specific resume as the active default.
   */
  async setActiveResume(id: string): Promise<void> {
    const records = await this.runTx<StoredResumeRecord[]>("readonly", (store) =>
      store.getAll()
    );
    const target = records.find((r) => r.id === id);
    if (!target) {
      throw new Error("Selected resume not found.");
    }

    const now = new Date().toISOString();
    for (const rec of records) {
      const nextDefault = rec.id === id;
      if (rec.isDefault !== nextDefault) {
        await this.runTx("readwrite", (store) =>
          store.put({ ...rec, isDefault: nextDefault, updatedAt: now })
        );
      }
    }
  }

  /**
   * Deletes a resume from IndexedDB. If it was default and others remain,
   * promotes the newest remaining resume to default.
   */
  async deleteResume(id: string): Promise<void> {
    const target = await this.getResume(id);
    if (!target) return;

    await this.runTx("readwrite", (store) => store.delete(id));

    if (target.isDefault) {
      const remaining = await this.listResumes();
      if (remaining.length > 0) {
        await this.setActiveResume(remaining[0].id);
      }
    }
  }

  private async clearDefaultFlags(): Promise<void> {
    const records = await this.runTx<StoredResumeRecord[]>("readonly", (store) =>
      store.getAll()
    );
    for (const rec of records) {
      if (rec.isDefault) {
        await this.runTx("readwrite", (store) =>
          store.put({ ...rec, isDefault: false })
        );
      }
    }
  }
}

export const resumeStorage = new ResumeStorageService();

