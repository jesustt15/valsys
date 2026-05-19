'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Eraser, RotateCcw } from 'lucide-react'

interface SignaturePadProps {
  onChange: (base64: string) => void
  disabled?: boolean
}

export function SignaturePad({ onChange, disabled }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasContent, setHasContent] = useState(false)
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null)

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext('2d')
    if (!context) return

    // High DPI support
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    context.scale(dpr, dpr)

    // Style
    context.strokeStyle = '#1a1a1a'
    context.lineWidth = 2
    context.lineCap = 'round'
    context.lineJoin = 'round'

    setCtx(context)
  }, [])

  const getPos = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const canvas = canvasRef.current
      if (!canvas) return { x: 0, y: 0 }
      const rect = canvas.getBoundingClientRect()

      if ('touches' in e) {
        return {
          x: e.touches[0].clientX - rect.left,
          y: e.touches[0].clientY - rect.top,
        }
      }
      return {
        x: (e as React.MouseEvent).clientX - rect.left,
        y: (e as React.MouseEvent).clientY - rect.top,
      }
    },
    [],
  )

  const startDrawing = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (disabled) return
      e.preventDefault()
      setIsDrawing(true)
      const { x, y } = getPos(e)
      ctx?.beginPath()
      ctx?.moveTo(x, y)
    },
    [ctx, getPos, disabled],
  )

  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing || disabled) return
      e.preventDefault()
      const { x, y } = getPos(e)
      ctx?.lineTo(x, y)
      ctx?.stroke()

      if (!hasContent) setHasContent(true)
    },
    [ctx, isDrawing, getPos, hasContent, disabled],
  )

  const stopDrawing = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (disabled) return
      e.preventDefault()
      setIsDrawing(false)
    },
    [disabled],
  )

  const clear = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !ctx) return
    const dpr = window.devicePixelRatio || 1
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr)
    setHasContent(false)
    onChange('')
  }, [ctx, onChange])

  const exportSignature = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !hasContent) return

    // Trim whitespace around signature
    const ctx2d = canvas.getContext('2d')
    if (!ctx2d) return

    const imageData = ctx2d.getImageData(0, 0, canvas.width, canvas.height)
    const { width, height } = imageData

    let minX = width, minY = height, maxX = 0, maxY = 0
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const alpha = imageData.data[(y * width + x) * 4 + 3]
        if (alpha > 0) {
          minX = Math.min(minX, x)
          minY = Math.min(minY, y)
          maxX = Math.max(maxX, x)
          maxY = Math.max(maxY, y)
        }
      }
    }

    // Add small padding
    const padding = 10
    const dpr = window.devicePixelRatio || 1
    const sx = Math.max(0, minX - padding * dpr)
    const sy = Math.max(0, minY - padding * dpr)
    const sw = Math.min(width - sx, maxX - minX + padding * 2 * dpr)
    const sh = Math.min(height - sy, maxY - minY + padding * 2 * dpr)

    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = sw
    tempCanvas.height = sh
    const tempCtx = tempCanvas.getContext('2d')!
    tempCtx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh)

    const base64 = tempCanvas.toDataURL('image/png')
    onChange(base64)
  }, [hasContent, onChange])

  // Export on every draw stop
  useEffect(() => {
    if (!isDrawing && hasContent) {
      exportSignature()
    }
  }, [isDrawing, hasContent, exportSignature])

  return (
    <div className="space-y-3">
      <div className="relative rounded-xl border-2 border-border overflow-hidden bg-white touch-none">
        <canvas
          ref={canvasRef}
          className="w-full h-48 cursor-crosshair"
          style={{ touchAction: 'none' }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {!hasContent && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-muted-foreground text-sm">Firme aquí con el dedo o stylus</span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={clear}
          disabled={disabled || !hasContent}
          className="h-9"
        >
          <Eraser className="w-4 h-4 mr-1.5" />
          Borrar
        </Button>
        {hasContent && (
          <span className="flex items-center text-xs text-green-600 dark:text-green-400">
            <RotateCcw className="w-3 h-3 mr-1" />
            Firma capturada
          </span>
        )}
      </div>
    </div>
  )
}
