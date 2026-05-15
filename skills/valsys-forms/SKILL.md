---
name: valsys-forms
description: "Trigger: form, formulario, inputs, file upload, foto, firma, signature. Build forms with Next.js 16 Server Actions, useActionState, Zod validation, MinIO uploads, and canvas signatures."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

# valsys-forms — Form Patterns for GNC Inspection System

## Activation Contract

Use this skill when creating or modifying ANY form, file upload, signature capture, or form validation in this project. ALL form mutations use Server Actions — NO fetch() for mutations, NO API routes for form submissions.

## Hard Rules

1. **Server Actions for all mutations**: the `action` prop on `<form>` receives a `'use server'` function. No `fetch('POST /api/...')` for form submits.

2. **useActionState for client feedback**: every interactive form wraps its action with `useActionState(action, initialState)`. Server action returns `{ success, error?, data? }`. Show `pending` state on submit button.

3. **Zod validation in lib/validations/**: define schemas once, reuse on server (in action) and client (for `safeParse`). Validation errors go to `state.error`, NOT thrown.

4. **Files go to MinIO**: never to server filesystem. MinIO key format:
   ```
   inspections/{inspectionId}/{category}/{uuid}-{filename}
   signatures/{inspectionId}/{uuid}-signature.png
   ```
   Category: `initial` | `removal` | `post_mount` | `plant` | `signature`

5. **Signature capture**: HTML Canvas → blob → Server Action → MinIO. Stored as PNG, referenced in `signatures` + `inspections`.

## Decision Gates

| Need | Pattern |
|------|---------|
| Text/select form | Server Action + useActionState + Zod |
| File upload | Server Action validates file → MinIO putObject → DB insert with key |
| Signature | Canvas component → blob → Server Action → MinIO |
| Long inspection checklist | Sectioned form with Zod partial schemas per section |
| Public cert download | Route Handler streams from MinIO |

## Example Pattern

```tsx
// lib/actions/owner.ts
'use server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { owners } from '@/lib/db/schema'
import { putObject } from '@/lib/minio'

const schema = z.object({
  fullName: z.string().min(3),
  documentId: z.string().min(5),
})

export async function createOwner(_prev: unknown, formData: FormData) {
  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.errors[0].message }
  
  await db.insert(owners).values(parsed.data)
  return { success: true }
}
```

```tsx
// components/forms/owner-form.tsx
'use client'
import { useActionState } from 'react'
import { createOwner } from '@/lib/actions/owner'

export function OwnerForm() {
  const [state, action, pending] = useActionState(createOwner, null)
  
  return (
    <form action={action} className="space-y-4">
      <input name="fullName" required placeholder="Nombre completo" />
      <input name="documentId" required placeholder="DNI / documento" />
      {state?.error && <p className="text-red-500 text-sm">{state.error}</p>}
      {state?.success && <p className="text-green-500 text-sm">Guardado</p>}
      <button type="submit" disabled={pending}
        className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50">
        {pending ? 'Guardando...' : 'Guardar'}
      </button>
    </form>
  )
}
```
