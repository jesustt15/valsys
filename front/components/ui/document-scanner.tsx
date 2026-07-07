'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import Webcam from 'react-webcam'
import jsPDF from 'jspdf'
import { Button } from '@/components/ui/button'
import { Camera, RotateCcw, Check, X, ScanLine, FileOutput } from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────
interface Point { x: number; y: number }
type Corners = [Point, Point, Point, Point] // TL, TR, BR, BL

interface DocumentScannerProps {
  /** Label shown above the component */
  label?: string
  /** Called when the user confirms and exports the scanned document as PDF */
  onCapture: (file: File) => void
  /** Called when the user cancels */
  onClose: () => void
  disabled?: boolean
}

// ─── Perspective crop helper ─────────────────────────────────────────────────
/**
 * Applies a perspective transform to crop the selected quadrilateral from
 * the source image and renders it as a flattened rectangle on a canvas.
 * Uses a pure-CSS/Canvas bilinear approach — no WASM needed.
 */
function applyPerspectiveCrop(
  srcCanvas: HTMLCanvasElement,
  corners: Corners,
  dstWidth: number,
  dstHeight: number,
): HTMLCanvasElement {
  const dst = document.createElement('canvas')
  dst.width = dstWidth
  dst.height = dstHeight
  const ctx = dst.getContext('2d')!
  const srcCtx = srcCanvas.getContext('2d')!
  const srcData = srcCtx.getImageData(0, 0, srcCanvas.width, srcCanvas.height)
  const dstData = ctx.createImageData(dstWidth, dstHeight)

  const [tl, tr, br, bl] = corners

  for (let y = 0; y < dstHeight; y++) {
    for (let x = 0; x < dstWidth; x++) {
      const u = x / dstWidth
      const v = y / dstHeight

      // Bilinear interpolation between the four corners
      const srcX =
        (1 - u) * (1 - v) * tl.x +
        u * (1 - v) * tr.x +
        u * v * br.x +
        (1 - u) * v * bl.x

      const srcY =
        (1 - u) * (1 - v) * tl.y +
        u * (1 - v) * tr.y +
        u * v * br.y +
        (1 - u) * v * bl.y

      const sx = Math.round(srcX)
      const sy = Math.round(srcY)

      if (sx < 0 || sx >= srcCanvas.width || sy < 0 || sy >= srcCanvas.height) continue

      const srcIdx = (sy * srcCanvas.width + sx) * 4
      const dstIdx = (y * dstWidth + x) * 4
      dstData.data[dstIdx] = srcData.data[srcIdx]
      dstData.data[dstIdx + 1] = srcData.data[srcIdx + 1]
      dstData.data[dstIdx + 2] = srcData.data[srcIdx + 2]
      dstData.data[dstIdx + 3] = 255
    }
  }
  ctx.putImageData(dstData, 0, 0)
  return dst
}

// ─── Component ────────────────────────────────────────────────────────────────
export function DocumentScanner({ label, onCapture, onClose, disabled }: DocumentScannerProps) {
  const webcamRef = useRef<Webcam>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  const [step, setStep] = useState<'camera' | 'adjust' | 'preview'>('camera')
  const [capturedImg, setCapturedImg] = useState<string | null>(null)
  const [capturedCanvas, setCapturedCanvas] = useState<HTMLCanvasElement | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [imgDims, setImgDims] = useState({ w: 0, h: 0 })
  const [dragging, setDragging] = useState<number | null>(null)

  // Default corners: full rectangle
  const [corners, setCorners] = useState<Corners>([
    { x: 50, y: 50 },
    { x: 750, y: 50 },
    { x: 750, y: 500 },
    { x: 50, y: 500 },
  ])

  // ── Capture frame from webcam ───────────────────────────────────────────
  const capture = useCallback(() => {
    const imgSrc = webcamRef.current?.getScreenshot()
    if (!imgSrc) return
    setCapturedImg(imgSrc)

    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      canvas.getContext('2d')!.drawImage(img, 0, 0)
      setCapturedCanvas(canvas)
      setImgDims({ w: img.width, h: img.height })
      // Reset corners to full image
      setCorners([
        { x: 0, y: 0 },
        { x: img.width, y: 0 },
        { x: img.width, y: img.height },
        { x: 0, y: img.height },
      ])
      setStep('adjust')
    }
    img.src = imgSrc
  }, [webcamRef])

  // ── Apply perspective crop and show preview ─────────────────────────────
  const cropAndPreview = useCallback(() => {
    if (!capturedCanvas) return
    const A4_W = 595
    const A4_H = 842
    const cropped = applyPerspectiveCrop(capturedCanvas, corners, A4_W, A4_H)
    setPreviewUrl(cropped.toDataURL('image/jpeg', 0.92))
    setStep('preview')
  }, [capturedCanvas, corners])

  // ── Export as PDF and return File ───────────────────────────────────────
  const exportPDF = useCallback(async () => {
    if (!previewUrl) return
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
    pdf.addImage(previewUrl, 'JPEG', 0, 0, 595, 842)
    const blob = pdf.output('blob')
    const file = new File([blob], `documento_${Date.now()}.pdf`, { type: 'application/pdf' })
    onCapture(file)
  }, [previewUrl, onCapture])

  // ── Corner drag on the adjustment overlay ──────────────────────────────
  const handleMouseDown = (idx: number) => (e: React.MouseEvent) => {
    e.preventDefault()
    setDragging(idx)
  }

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (dragging === null || !overlayRef.current) return
    const rect = overlayRef.current.getBoundingClientRect()
    const scaleX = imgDims.w / rect.width
    const scaleY = imgDims.h / rect.height
    const x = Math.max(0, Math.min(imgDims.w, (e.clientX - rect.left) * scaleX))
    const y = Math.max(0, Math.min(imgDims.h, (e.clientY - rect.top) * scaleY))
    setCorners((prev) => {
      const next = [...prev] as Corners
      next[dragging] = { x, y }
      return next
    })
  }, [dragging, imgDims])

  const handleMouseUp = useCallback(() => setDragging(null), [])

  // Touch support
  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (dragging === null || !overlayRef.current) return
    const rect = overlayRef.current.getBoundingClientRect()
    const touch = e.touches[0]
    const scaleX = imgDims.w / rect.width
    const scaleY = imgDims.h / rect.height
    const x = Math.max(0, Math.min(imgDims.w, (touch.clientX - rect.left) * scaleX))
    const y = Math.max(0, Math.min(imgDims.h, (touch.clientY - rect.top) * scaleY))
    setCorners((prev) => {
      const next = [...prev] as Corners
      next[dragging] = { x, y }
      return next
    })
  }, [dragging, imgDims])

  // ── Corner labels ───────────────────────────────────────────────────────
  const cornerLabels = ['↖', '↗', '↘', '↙']

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 text-white">
        <div className="flex items-center gap-2">
          <ScanLine className="w-5 h-5 text-emerald-400" />
          <span className="font-semibold text-sm">
            {step === 'camera' && (label ?? 'Escanear Documento')}
            {step === 'adjust' && 'Ajustar esquinas'}
            {step === 'preview' && 'Vista previa'}
          </span>
        </div>
        <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ── STEP 1: Camera ──────────────────────────────────────────────── */}
      {step === 'camera' && (
        <div className="flex flex-col flex-1 items-center justify-center gap-6 p-4">
          <div className="relative w-full max-w-lg rounded-2xl overflow-hidden border-2 border-emerald-400/50 shadow-xl">
            <Webcam
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              screenshotQuality={0.95}
              videoConstraints={{ facingMode: { ideal: 'environment' }, aspectRatio: 4 / 3 }}
              className="w-full object-cover"
            />
            {/* Document guide overlay */}
            <div className="absolute inset-[10%] border-2 border-dashed border-emerald-400 rounded-lg opacity-60 pointer-events-none" />
            <div className="absolute inset-0 flex items-end justify-center pb-4 pointer-events-none">
              <span className="text-white/70 text-xs bg-black/50 px-3 py-1 rounded-full">
                Encuadre el documento dentro del recuadro
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="border-white/20 text-white hover:bg-white/10">
              Cancelar
            </Button>
            <Button
              onClick={capture}
              disabled={disabled}
              className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2 px-8"
            >
              <Camera className="w-4 h-4" />
              Capturar
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Adjust corners ──────────────────────────────────────── */}
      {step === 'adjust' && capturedImg && (
        <div className="flex flex-col flex-1 items-center justify-center gap-4 p-4">
          <p className="text-white/70 text-xs text-center">
            Arrastrá las esquinas para ajustar el recorte del documento
          </p>
          <div
            ref={overlayRef}
            className="relative w-full max-w-lg select-none cursor-crosshair"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUp}
          >
            <img src={capturedImg} alt="Captura" className="w-full rounded-xl" draggable={false} />

            {/* SVG overlay for the quad */}
            <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${imgDims.w} ${imgDims.h}`} preserveAspectRatio="none">
              <polygon
                points={corners.map((c) => `${c.x},${c.y}`).join(' ')}
                fill="rgba(52,211,153,0.15)"
                stroke="#119c03"
                strokeWidth={2 * (imgDims.w / 595)}
              />
            </svg>

            {/* Drag handles */}
            {corners.map((c, idx) => (
              <div
                key={idx}
                className="absolute w-8 h-8 rounded-full bg-emerald-400 border-2 border-white shadow-lg flex items-center justify-center text-xs font-bold text-white cursor-grab active:cursor-grabbing select-none touch-none"
                style={{
                  left: `${(c.x / imgDims.w) * 100}%`,
                  top: `${(c.y / imgDims.h) * 100}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                onMouseDown={handleMouseDown(idx)}
                onTouchStart={(e) => { e.preventDefault(); setDragging(idx) }}
              >
                {cornerLabels[idx]}
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep('camera')} className="border-white/20 text-white hover:bg-white/10 gap-2">
              <RotateCcw className="w-4 h-4" />
              Repetir
            </Button>
            <Button onClick={cropAndPreview} className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2 px-8">
              <Check className="w-4 h-4" />
              Aplicar recorte
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Preview ─────────────────────────────────────────────── */}
      {step === 'preview' && previewUrl && (
        <div className="flex flex-col flex-1 items-center justify-center gap-4 p-4">
          <p className="text-white/70 text-xs text-center">Vista previa del documento procesado</p>
          <div className="w-full max-w-xs rounded-xl overflow-hidden shadow-xl border border-white/10">
            <img src={previewUrl} alt="Documento escaneado" className="w-full" />
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep('adjust')} className="border-white/20 text-white hover:bg-white/10 gap-2">
              <RotateCcw className="w-4 h-4" />
              Reajustar
            </Button>
            <Button onClick={exportPDF} className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2 px-8">
              <FileOutput className="w-4 h-4" />
              Confirmar y adjuntar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
