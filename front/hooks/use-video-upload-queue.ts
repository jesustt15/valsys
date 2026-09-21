'use client'

import { useSyncExternalStore } from 'react'
import { queue, type QueueItem } from '@/lib/video-upload-queue'

/**
 * React hook that subscribes to the background video upload queue.
 * Returns the current list of queue items. Re-renders whenever the queue
 * state changes.
 */
export function useVideoUploadQueue(): QueueItem[] {
  return useSyncExternalStore(
    (callback) => queue.subscribe(callback),
    () => queue.getItems(),
    () => [], // server snapshot — queue is client-only
  )
}

/**
 * Returns only queue items for a specific inspection.
 */
export function useVideoUploadQueueForInspection(
  inspectionId: string | null | undefined,
): QueueItem[] {
  return useSyncExternalStore(
    (callback) => queue.subscribe(callback),
    () => (inspectionId ? queue.getItemsFor(inspectionId) : []),
    () => [],
  )
}

/**
 * Returns true when the queue has pending (non-attached, non-error) items
 * for the given inspection.
 */
export function useHasPendingVideoUpload(
  inspectionId: string | null | undefined,
): boolean {
  return useSyncExternalStore(
    (callback) => queue.subscribe(callback),
    () => (inspectionId ? queue.hasPendingFor(inspectionId) : false),
    () => false,
  )
}
