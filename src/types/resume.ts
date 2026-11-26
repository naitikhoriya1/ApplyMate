/**
 * ApplyMate — Local Resume Storage Types
 *
 * PDF binaries are stored strictly in IndexedDB (never localStorage)
 * and remain 100% local to the user's browser.
 */

export interface StoredResumeMetadata {
  id: string;
  fileName: string;
  fileSize: number; // bytes
  mimeType: "application/pdf";
  uploadedAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  isDefault: boolean;
}

export interface StoredResumeRecord extends StoredResumeMetadata {
  /** Raw PDF bytes stored in IndexedDB */
  data: ArrayBuffer;
}

export interface ResumeValidationResult {
  valid: boolean;
  error?: string;
}

