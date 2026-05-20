'use client'

import { useActionState } from 'react'
import { Camera, AlertCircle, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { PhotoUpload } from '@/components/inspections/photo-upload'
import { uploadInspectionFileAction, type InspectionFormState } from '@/lib/actions/inspection'

interface Attachment {
  id: string
  fileName: string
  minioKey: string
  fileType: string
  fileSize: number | null
  category: string
  url?: string
}

interface Props {
  inspectionId: string
  existingPhotos: Attachment[]
}

export function PostMountPhotos({ inspectionId, existingPhotos }: Props) {
  const [state, formAction, pending] = useActionState<InspectionFormState | null, FormData>(
    uploadInspectionFileAction,
    null
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Camera className="w-5 h-5 text-rose-500" />
          Fotos Post-Montaje
        </CardTitle>
        <CardDescription>
          Capture photographic evidence after cylinder re-mounting
          {existingPhotos.length > 0 && ` (${existingPhotos.length} foto(s))`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="inspectionId" value={inspectionId} />
          <input type="hidden" name="category" value="post_mount" />

          <PhotoUpload category="post_mount" label="Seleccionar fotos" />

          {state?.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          {state?.success && (
            <Alert variant="success" className="bg-green-50 border-green-200 text-green-800">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>Fotos subidas correctamente.</AlertDescription>
            </Alert>
          )}

          <button
            type="submit"
            disabled={pending}
            className="flex h-11 items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pending ? 'Subiendo...' : 'Subir Fotos'}
          </button>
        </form>

        {existingPhotos.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {existingPhotos.map((photo) => (
              <a
                key={photo.id}
                href={photo.url ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="group block relative aspect-square rounded-xl overflow-hidden border border-border shadow-sm hover:ring-2 hover:ring-primary transition-all"
              >
                {photo.fileType.startsWith('image/') && photo.url ? (
                  <img
                    src={photo.url}
                    alt={photo.fileName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-muted">
                    <Camera className="w-8 h-8 text-muted-foreground mb-2" />
                    <span className="text-xs text-center px-2 truncate w-full">{photo.fileName}</span>
                  </div>
                )}
                <div className="absolute top-2 left-2">
                  <Badge variant="secondary" className="text-[10px] uppercase shadow-sm">
                    Post-Montaje
                  </Badge>
                </div>
              </a>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
