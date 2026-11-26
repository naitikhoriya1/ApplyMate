import test from "node:test";
import assert from "node:assert/strict";
import {
  ResumeStorageService,
  validatePdfFile,
  formatFileSize,
  MAX_RESUME_SIZE_BYTES,
} from "../src/lib/storage/resumeStorage.ts";

/**
 * Minimal in-memory IDBFactory mock for testing ResumeStorageService in Node.
 */
function createMockIDBFactory(): IDBFactory {
  const stores = new Map<string, Map<string, unknown>>();

  const makeReq = <T>(executor: () => T) => {
    const req: {
      result?: T;
      error: Error | null;
      onsuccess: (() => void) | null;
      onerror: (() => void) | null;
    } = {
      error: null,
      onsuccess: null,
      onerror: null,
    };

    queueMicrotask(() => {
      try {
        req.result = executor();
        req.onsuccess?.();
      } catch (err) {
        req.error = err as Error;
        req.onerror?.();
      }
    });

    return req as unknown as IDBRequest<T>;
  };

  return {
    open() {
      const openReq: {
        result?: IDBDatabase;
        error: Error | null;
        onupgradeneeded: (() => void) | null;
        onsuccess: (() => void) | null;
        onerror: (() => void) | null;
      } = {
        error: null,
        onupgradeneeded: null,
        onsuccess: null,
        onerror: null,
      };

      const db = {
        objectStoreNames: {
          contains: (name: string) => stores.has(name),
        },
        createObjectStore: (name: string) => {
          if (!stores.has(name)) stores.set(name, new Map());
          return {} as IDBObjectStore;
        },
        transaction: (storeName: string) => ({
          objectStore: () => {
            const map = stores.get(storeName) ?? new Map<string, unknown>();
            stores.set(storeName, map);
            return {
              getAll: () => makeReq(() => Array.from(map.values())),
              get: (key: string) => makeReq(() => map.get(key)),
              put: (val: { id: string }) =>
                makeReq(() => {
                  map.set(val.id, val);
                  return val.id;
                }),
              delete: (key: string) =>
                makeReq(() => {
                  map.delete(key);
                  return undefined;
                }),
            } as unknown as IDBObjectStore;
          },
        }),
      } as unknown as IDBDatabase;

      queueMicrotask(() => {
        openReq.result = db;
        openReq.onupgradeneeded?.();
        openReq.onsuccess?.();
      });

      return openReq as unknown as IDBOpenDBRequest;
    },
  } as unknown as IDBFactory;
}

function makeMockPdfFile(name: string, content = "%PDF-1.4 mock pdf"): {
  name: string;
  size: number;
  type: string;
  arrayBuffer: () => Promise<ArrayBuffer>;
} {
  const bytes = new TextEncoder().encode(content);
  return {
    name,
    size: bytes.byteLength,
    type: "application/pdf",
    async arrayBuffer() {
      return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    },
  };
}

test("validatePdfFile accepts valid PDFs and rejects invalid files", () => {
  assert.deepStrictEqual(
    validatePdfFile({ name: "Naitik_Resume.pdf", size: 1024, type: "application/pdf" }),
    { valid: true }
  );

  const docx = validatePdfFile({
    name: "resume.docx",
    size: 1024,
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  assert.strictEqual(docx.valid, false);

  const empty = validatePdfFile({ name: "empty.pdf", size: 0, type: "application/pdf" });
  assert.strictEqual(empty.valid, false);

  const tooLarge = validatePdfFile({
    name: "huge.pdf",
    size: MAX_RESUME_SIZE_BYTES + 1,
    type: "application/pdf",
  });
  assert.strictEqual(tooLarge.valid, false);
});

test("formatFileSize formats bytes, KB, and MB accurately", () => {
  assert.strictEqual(formatFileSize(512), "512 B");
  assert.strictEqual(formatFileSize(2048), "2.0 KB");
  assert.strictEqual(formatFileSize(1024 * 1024 * 1.5), "1.50 MB");
});

test("ResumeStorageService stores, retrieves, replaces, switches active, and deletes PDFs in IndexedDB", async () => {
  const service = new ResumeStorageService(createMockIDBFactory());

  // Ensure localStorage is not touched
  let localStorageTouched = false;
  const origLocalStorage = (globalThis as { localStorage?: unknown }).localStorage;
  (globalThis as { localStorage?: unknown }).localStorage = {
    setItem() {
      localStorageTouched = true;
    },
    getItem() {
      localStorageTouched = true;
      return null;
    },
  };

  try {
    // 1. Save first PDF
    const file1 = makeMockPdfFile("Naitik_QA_Resume.pdf", "%PDF-1.4 QA");
    const saved1 = await service.saveResume(file1);
    assert.strictEqual(saved1.fileName, "Naitik_QA_Resume.pdf");
    assert.strictEqual(saved1.fileSize, file1.size);
    assert.strictEqual(saved1.isDefault, true);
    assert.ok(saved1.uploadedAt);

    // 2. Retrieve stored PDF bytes
    const retrieved1 = await service.getResume(saved1.id);
    assert.ok(retrieved1);
    assert.strictEqual(new TextDecoder().decode(retrieved1.data), "%PDF-1.4 QA");

    // 3. Save second PDF (not default by default)
    const file2 = makeMockPdfFile("Naitik_Frontend_Resume.pdf", "%PDF-1.4 FE");
    const saved2 = await service.saveResume(file2);
    assert.strictEqual(saved2.isDefault, false);

    // 4. Switch active resume
    await service.setActiveResume(saved2.id);
    const active = await service.getActiveResume();
    assert.strictEqual(active?.id, saved2.id);

    // 5. Replace existing resume
    const file2Updated = makeMockPdfFile("Naitik_Frontend_v2.pdf", "%PDF-1.4 FE v2");
    const replaced = await service.replaceResume(saved2.id, file2Updated);
    assert.strictEqual(replaced.fileName, "Naitik_Frontend_v2.pdf");
    const retrievedReplaced = await service.getResume(saved2.id);
    assert.strictEqual(
      new TextDecoder().decode(retrievedReplaced!.data),
      "%PDF-1.4 FE v2"
    );

    // 6. Delete active resume -> remaining resume becomes active
    await service.deleteResume(saved2.id);
    const listAfterDelete = await service.listResumes();
    assert.strictEqual(listAfterDelete.length, 1);
    assert.strictEqual(listAfterDelete[0].id, saved1.id);
    assert.strictEqual(listAfterDelete[0].isDefault, true);

    assert.strictEqual(localStorageTouched, false, "Must never store PDFs in localStorage");
  } finally {
    (globalThis as { localStorage?: unknown }).localStorage = origLocalStorage;
  }
});

