"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  type DraftFiles,
  loadFiles,
  loadState,
  saveFiles as idbSaveFiles,
  saveState as lsSaveState,
  clearDraft,
} from "@/lib/draft-storage";

interface UseFormDraftOptions {
  /** Debounce window in ms for auto-save (default 400). */
  debounceMs?: number;
  /** When true, skip auto-save on snapshot changes. Useful while restoring. */
  paused?: boolean;
}

/**
 * Persists a form's JSON-serializable state to localStorage (debounced) and
 * its binary files to IndexedDB. Restores both on mount.
 *
 * Snapshot flow:
 * - The component builds a snapshot object every render (only JSON-safe data).
 * - We serialize it to compare with the previous save; on change, we debounce.
 * - visibilitychange/pagehide trigger immediate save (last-chance flush).
 *
 * File flow:
 * - Files are NOT in the snapshot (File isn't JSON-serializable).
 * - The component calls `saveFiles(...)` when they change.
 */
export function useFormDraft<T extends object>(
  draftKey: string,
  snapshot: T,
  options: UseFormDraftOptions = {},
) {
  const { debounceMs = 400, paused = false } = options;

  // Sync initial load — runs exactly once, during the first render, so the
  // consuming component can read `initial` synchronously and feed it into its
  // own useState initializers. We use a separate flag so "no draft" (null) is
  // a valid terminal state and doesn't re-trigger a load on every render.
  const syncLoadedRef = useRef(false);
  const initialRef = useRef<T | null>(null);
  if (!syncLoadedRef.current) {
    initialRef.current = loadState<T>(draftKey);
    syncLoadedRef.current = true;
  }

  // Async file load — completes after mount.
  const [files, setFiles] = useState<DraftFiles>({
    cedula: null,
    carnet: null,
    photos: [],
  });
  const [filesLoaded, setFilesLoaded] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  /** Timestamp of the most recent write (debounced or manual flush). */
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadFiles(draftKey).then((f) => {
      if (!cancelled) {
        setFiles(f);
        setFilesLoaded(true);
        const st = loadState<{ savedAt?: number }>(draftKey);
        if (st?.savedAt) setSavedAt(st.savedAt);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [draftKey]);

  // Debounced auto-save on snapshot change. We compare by serialized value
  // so referentially-new-but-semantically-equal snapshots don't thrash storage.
  const lastSavedJsonRef = useRef<string | null>(null);

  useEffect(() => {
    if (paused) return;
    const json = safeStringify(snapshot);
    if (json === null) return; // skip unserializable snapshots
    if (json === lastSavedJsonRef.current) return;

    const timer = setTimeout(() => {
      const now = Date.now();
      const withTimestamp = { ...snapshot, savedAt: now } as T & {
        savedAt: number;
      };
      lsSaveState(draftKey, withTimestamp);
      lastSavedJsonRef.current = json;
      setLastSavedAt(now);
      // NOTE: we deliberately do NOT setSavedAt() here. Doing so re-renders the
      // consumer on every debounced save, which (combined with unstable
      // callbacks downstream) can produce render loops. `savedAt` reflects the
      // restored draft's timestamp — exactly what a "draft restored" banner
      // needs to display.
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [draftKey, snapshot, debounceMs, paused]);

  // Last-chance flush: when the page goes hidden or is about to be destroyed,
  // write synchronously so nothing is lost if the OS kills the tab.
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;

  useEffect(() => {
    const flushNow = () => {
      const json = safeStringify(snapshotRef.current);
      if (json === null) return;
      const now = Date.now();
      const withTimestamp = {
        ...snapshotRef.current,
        savedAt: now,
      } as T & { savedAt: number };
      lsSaveState(draftKey, withTimestamp);
      lastSavedJsonRef.current = json;
      setLastSavedAt(now);
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") flushNow();
    };
    const onPageHide = () => flushNow();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [draftKey]);

  // Imperative API
  // NOTE: `saveFiles` intentionally does NOT update the `files` state. The
  // consumer owns its own file state; `files` here is only the IDB snapshot
  // loaded once at mount (used for hydration). Updating it on every save
  // re-rendered consumers and fed render loops.
  const saveFilesNow = useCallback(
    async (next: DraftFiles) => {
      await idbSaveFiles(draftKey, next);
    },
    [draftKey],
  );

  const clear = useCallback(async () => {
    lastSavedJsonRef.current = null;
    setFiles({ cedula: null, carnet: null, photos: [] });
    setSavedAt(null);
    setLastSavedAt(null);
    await clearDraft(draftKey);
  }, [draftKey]);

  /**
   * Synchronously flush the pending debounced snapshot to localStorage now.
   * Call before SPA navigation (router.push) since the debounced timer won't
   * fire and visibilitychange/pagehide don't fire for in-app transitions.
   */
  const flush = useCallback(() => {
    const json = safeStringify(snapshotRef.current);
    if (json === null) return;
    if (json === lastSavedJsonRef.current) return; // already persisted
    const now = Date.now();
    const withTimestamp = {
      ...snapshotRef.current,
      savedAt: now,
    } as T & { savedAt: number };
    lsSaveState(draftKey, withTimestamp);
    lastSavedJsonRef.current = json;
    setLastSavedAt(now);
  }, [draftKey]);

  return {
    /** Initial JSON state restored from localStorage (null if no draft). */
    initial: initialRef.current,
    /** Files restored from IndexedDB. */
    files,
    /** True once IDB load completed (initial + async files). */
    loaded: syncLoadedRef.current && filesLoaded,
    /** Timestamp of the restored draft (for "draft restored" banner age). */
    savedAt,
    /** Timestamp of the most recent write (debounced or flush). Null until first save. */
    lastSavedAt,
    /** Persist files to IDB now. */
    saveFiles: saveFilesNow,
    /** Synchronously flush the pending snapshot to localStorage. */
    flush,
    /** Wipe both localStorage and IDB for this draft key. */
    clear,
  };
}

function safeStringify(value: unknown): string | null {
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}
