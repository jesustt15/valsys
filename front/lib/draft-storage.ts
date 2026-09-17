/**
 * Draft persistence layer for long forms.
 *
 * Split strategy:
 * - JSON-serializable state → localStorage (small, sync, fast).
 * - Binary files (cedula, carnet, photos) → IndexedDB (no 5MB limit).
 *
 * Both layers share the same draft key, so clearing a draft wipes both.
 */

// ─── IndexedDB setup ────────────────────────────────────────────────────────
const DB_NAME = "valsys-drafts";
const DB_VERSION = 1;
const STORE_FILES = "files";

interface IDBFileRecord {
  key: string;
  files: DraftFiles;
  savedAt: number;
}

export interface DraftFiles {
  cedula: File | null;
  carnet: File | null;
  photos: File[];
}

const EMPTY_FILES: DraftFiles = { cedula: null, carnet: null, photos: [] };

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_FILES)) {
        req.result.createObjectStore(STORE_FILES, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(
  mode: IDBTransactionMode,
): Promise<IDBObjectStore> {
  return openDB().then((db) => db.transaction(STORE_FILES, mode).objectStore(STORE_FILES));
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ─── Public API: binary files ───────────────────────────────────────────────

export async function loadFiles(draftKey: string): Promise<DraftFiles> {
  try {
    const store = await tx("readonly");
    const record = (await reqToPromise(store.get(draftKey))) as
      | IDBFileRecord
      | undefined;
    return record?.files ?? { ...EMPTY_FILES, photos: [] };
  } catch {
    // IDB unavailable (private mode, quota, etc.) → degrade silently
    return { ...EMPTY_FILES, photos: [] };
  }
}

export async function saveFiles(
  draftKey: string,
  files: DraftFiles,
): Promise<void> {
  try {
    const store = await tx("readwrite");
    const record: IDBFileRecord = {
      key: draftKey,
      files,
      savedAt: Date.now(),
    };
    await reqToPromise(store.put(record));
  } catch {
    // Degrade silently — the JSON side still persists.
  }
}

export async function clearFiles(draftKey: string): Promise<void> {
  try {
    const store = await tx("readwrite");
    await reqToPromise(store.delete(draftKey));
  } catch {
    // ignore
  }
}

// ─── Public API: JSON state (localStorage) ──────────────────────────────────

export function lsKey(draftKey: string): string {
  return `draft:${draftKey}`;
}

export function loadState<T>(draftKey: string): T | null {
  try {
    const raw = localStorage.getItem(lsKey(draftKey));
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function saveState<T>(draftKey: string, state: T): void {
  try {
    localStorage.setItem(lsKey(draftKey), JSON.stringify(state));
  } catch {
    // Quota exceeded or private mode — ignore.
  }
}

export function clearState(draftKey: string): void {
  try {
    localStorage.removeItem(lsKey(draftKey));
  } catch {
    // ignore
  }
}

// ─── Combined clear ─────────────────────────────────────────────────────────

export async function clearDraft(draftKey: string): Promise<void> {
  clearState(draftKey);
  await clearFiles(draftKey);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

export function formatDraftAge(savedAt: number): string {
  const diffMs = Date.now() - savedAt;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "hace menos de un minuto";
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  const days = Math.floor(hrs / 24);
  return `hace ${days} día${days === 1 ? "" : "s"}`;
}
