'use client'

import { useActionState } from 'react'
import { uploadVehicleDocumentAction, type VehicleDocumentFormState } from '@/lib/actions/vehicle-document'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Upload, CheckCircle, AlertCircle } from 'lucide-react'

interface VehicleDocumentUploaderProps {
  vehicleId: string
  type: 'cedula' | 'carnet'
  label: string
  /** Optional: when used inline in unified form, don't submit immediately */
  inline?: boolean
  /** If inline, parent form handles the file */
  onFileSelect?: (file: File | null) => void
}

export function VehicleDocumentUploader({
  vehicleId,
  type,
  label,
  inline,
  onFileSelect,
}: VehicleDocumentUploaderProps) {
  const [state, action, pending] = useActionState<VehicleDocumentFormState | null, FormData>(
    uploadVehicleDocumentAction,
    null,
  )

  if (inline && onFileSelect) {
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <input
          type="file"
          name={type}
          accept="image/*,.pdf"
          onChange={(e) => {
            const file = e.target.files?.[0] || null
            onFileSelect(file)
          }}
          className="block w-full text-sm text-muted-foreground
            file:mr-4 file:py-2 file:px-4
            file:rounded-lg file:border-0
            file:text-sm file:font-semibold
            file:bg-green-50 file:text-green-700
            hover:file:bg-green-100
            cursor-pointer"
        />
        <p className="text-xs text-muted-foreground">
          {type === 'cedula' ? 'Foto del documento de identidad' : 'Foto del carnet de circulación'}
        </p>
      </div>
    )
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="vehicleId" value={vehicleId} />
      <input type="hidden" name="type" value={type} />

      <Label>{label}</Label>
      <input
        type="file"
        name="file"
        accept="image/*,.pdf"
        className="block w-full text-sm text-muted-foreground
          file:mr-4 file:py-2 file:px-4
          file:rounded-lg file:border-0
          file:text-sm file:font-semibold
          file:bg-green-50 file:text-green-700
          hover:file:bg-green-100
          cursor-pointer"
      />

      {state?.error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="w-4 h-4" />
          <span>{state.error}</span>
        </div>
      )}

      {state?.success && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <CheckCircle className="w-4 h-4" />
          <span>Documento subido correctamente</span>
        </div>
      )}

      <Button type="submit" disabled={pending} variant="outline" size="sm">
        <Upload className="w-4 h-4 mr-2" />
        {pending ? 'Subiendo...' : 'Subir'}
      </Button>
    </form>
  )
}
