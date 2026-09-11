'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import Webcam from 'react-webcam'
import { Button } from '@/components/ui/button'
import { Camera, X, RotateCcw, Check, SwitchCamera, Undo2, Loader2, AlertCircle } from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────
interface PhotoCameraProps {
  /** Remaining capture slots for this session (>0) */
  maxPhotos: number
  /** Deliver ALL captured files when closing */
  onPhotos: (files: File[]) => void
  /** Always called after onPhotos — parent should unmount this component */
  onClose: () => void
  /** User chose native/system camera instead of in-app */
  onFallback: () => void
}

// ─── Constants & helpers ────────────────────────────────────────────────────
const FLASH_MS = 150

/** Convert a data URL to a File object via Uint8Array → Blob → File */
function dataURLtoFile(dataURL: string, filename: string): File {
  const [header, base64Data] = dataURL.split(',')
  const mimeMatch = header.match(/:(.*?);/)
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg'
  const byteString = atob(base64Data)
  const bytes = new Uint8Array(byteString.length)
  for (let i = 0; i < byteString.length; i++) {
    bytes[i] = byteString.charCodeAt(i)
  }
  const blob = new Blob([bytes], { type: mime })
  return new File([blob], filename, { type: mime })
}

// ─── Component ────────────────────────────────────────────────────────────────
export function PhotoCamera({ maxPhotos, onPhotos, onClose, onFallback }: PhotoCameraProps) {
  const webcamRef = useRef<Webcam>(null)
  const [isMobile, setIsMobile] = useState(false)

  const [isReady, setIsReady] = useState(false)
  const [cameraError, setCameraError] = useState(false)
  const [webcamKey, setWebcamKey] = useState(0)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [sessionFiles, setSessionFiles] = useState<{ file: File; url: string }[]>([])
  const [flashActive, setFlashActive] = useState(false)

  // Keep a ref in sync so the unmount cleanup sees the latest list
  const sessionFilesRef = useRef(sessionFiles)
  useEffect(() => {
    sessionFilesRef.current = sessionFiles
  }, [sessionFiles])

  // Detect mobile once on mount (for iOS permission help box)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- feature detection needs client-side value after hydration
    setIsMobile(
      typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0
    )
  }, [])

  // Revoke blob URLs on unmount
  useEffect(() => {
    return () => {
      sessionFilesRef.current.forEach((f) => URL.revokeObjectURL(f.url))
    }
  }, [])

  // ── Camera lifecycle callbacks ─────────────────────────────────────────
  const handleUserMedia = useCallback(() => {
    setIsReady(true)
    setCameraError(false)
  }, [])

  const handleUserMediaError = useCallback(() => {
    setIsReady(false)
    setCameraError(true)
  }, [])

  const handleRetry = useCallback(() => {
    setCameraError(false)
    setIsReady(false)
    setWebcamKey((prev) => prev + 1)
  }, [])

  // ── Deliver captured photos and close ──────────────────────────────────
  const deliverAndClose = useCallback(() => {
    onPhotos(sessionFiles.map((f) => f.file))
    onClose()
  }, [sessionFiles, onPhotos, onClose])

  // ── Shutter: capture frame → convert to File → append to session ───────
  const handleShutter = useCallback(() => {
    const dataURL = webcamRef.current?.getScreenshot()
    if (!dataURL) return
    if (sessionFiles.length >= maxPhotos) return

    const file = dataURLtoFile(dataURL, `foto_${Date.now()}.jpg`)
    const url = URL.createObjectURL(file)
    setSessionFiles((prev) => [...prev, { file, url }])

    // Brief white flash as capture feedback
    setFlashActive(true)
    setTimeout(() => setFlashActive(false), FLASH_MS)
  }, [sessionFiles.length, maxPhotos])

  // ── Undo last shot ────────────────────────────────────────────────────
  const handleUndo = useCallback(() => {
    setSessionFiles((prev) => {
      const last = prev[prev.length - 1]
      if (last) URL.revokeObjectURL(last.url)
      return prev.slice(0, -1)
    })
  }, [])

  // ── Switch camera (front ↔ rear) ──────────────────────────────────────
  const handleSwitchCamera = useCallback(() => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))
    setIsReady(false)
    setWebcamKey((prev) => prev + 1)
  }, [])

  // ── Derived state ──────────────────────────────────────────────────────
  const isLoading = !isReady && !cameraError
  const atMax = sessionFiles.length >= maxPhotos

  const videoConstraints = {
    facingMode: { ideal: facingMode },
    width: { ideal: 1920 },
    height: { ideal: 1080 },
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 text-white">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-emerald-400" />
          <span className="font-semibold text-sm">Tomar fotos</span>
          {sessionFiles.length > 0 && (
            <span className="text-xs text-white/60">
              {sessionFiles.length} / {maxPhotos}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={deliverAndClose}
          className="p-1 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Cerrar y guardar fotos"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Camera area */}
      <div className="flex flex-col flex-1 items-center justify-center gap-4 p-4 relative">
        {/* Loading spinner — visible while camera initializes */}
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 gap-4">
            <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
            <span className="text-white/70 text-sm">Iniciando cámara...</span>
          </div>
        )}

        {/* Error state */}
        {cameraError ? (
          <div className="flex flex-col items-center justify-center gap-4 p-8 text-white">
            <AlertCircle className="w-12 h-12 text-red-400" />
            <p className="text-center text-sm max-w-xs">
              No se pudo acceder a la cámara. Verificá los permisos e intentá de nuevo.
            </p>
            {/* iOS-specific help — show on any touch device */}
            {isMobile && (
              <div className="text-xs text-white/50 text-center max-w-xs bg-white/5 rounded-xl px-4 py-3 space-y-1">
                <p className="font-medium text-white/70">En iPhone/iPad:</p>
                <p>1. Abrí <strong>Configuración → Safari → Cámara</strong></p>
                <p>2. Asegurate de que esté en <strong>&quot;Permitir&quot;</strong></p>
                <p className="mt-1">Si ya está permitido, el sitio necesita <strong>HTTPS</strong>.</p>
              </div>
            )}
            <Button
              onClick={handleRetry}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10 gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reintentar
            </Button>
            <Button
              onClick={onFallback}
              className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2"
            >
              <Camera className="w-4 h-4" />
              Usar cámara del sistema
            </Button>
            <Button
              variant="outline"
              onClick={deliverAndClose}
              className="border-white/20 text-white hover:bg-white/10 mt-2"
            >
              Cerrar
            </Button>
          </div>
        ) : (
          <>
            {/* Normal camera view */}
            <div className="relative w-full max-w-lg rounded-2xl overflow-hidden border-2 border-emerald-400/50 shadow-xl">
              <Webcam
                key={webcamKey}
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                screenshotQuality={0.92}
                videoConstraints={videoConstraints}
                onUserMedia={handleUserMedia}
                onUserMediaError={handleUserMediaError}
                className="w-full object-cover"
              />
              {/* Flash overlay — brief white pulse on capture */}
              {flashActive && (
                <div className="absolute inset-0 bg-white/80 pointer-events-none" />
              )}
            </div>

            {/* Controls row */}
            <div className="flex items-center gap-4">
              {/* Undo last shot */}
              <button
                type="button"
                onClick={handleUndo}
                disabled={sessionFiles.length === 0}
                className="p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Deshacer última foto"
              >
                <Undo2 className="w-5 h-5" />
              </button>

              {/* Shutter button */}
              <button
                type="button"
                onClick={handleShutter}
                disabled={!isReady || atMax}
                className="w-16 h-16 rounded-full bg-emerald-500 border-4 border-white shadow-lg flex items-center justify-center hover:bg-emerald-600 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Tomar foto"
              >
                <Camera className="w-7 h-7 text-white" />
              </button>

              {/* Switch camera */}
              <button
                type="button"
                onClick={handleSwitchCamera}
                className="p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                aria-label="Cambiar cámara"
              >
                <SwitchCamera className="w-5 h-5" />
              </button>
            </div>

            {/* Max reached hint */}
            {atMax && (
              <p className="text-amber-300 text-xs text-center">
                Máximo alcanzado — presioná Listo
              </p>
            )}

            {/* Thumbnail strip */}
            {sessionFiles.length > 0 && (
              <div className="flex gap-2 overflow-x-auto max-w-full px-2 pb-1">
                {sessionFiles.map((entry, i) => (
                  <div
                    key={entry.url}
                    className="relative flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border border-white/20"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- blob URLs from camera capture can't use next/image */}
                    <img
                      src={entry.url}
                      alt={`Foto ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer: "Listo" button — always deliver photos, even if zero */}
      {!cameraError && (
        <div className="px-4 pb-4 pt-2">
          <Button
            onClick={deliverAndClose}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white gap-2 py-3 text-base"
          >
            <Check className="w-5 h-5" />
            Listo{sessionFiles.length > 0 ? ` (${sessionFiles.length})` : ''}
          </Button>
        </div>
      )}
    </div>
  )
}
