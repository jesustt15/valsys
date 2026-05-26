'use client'

import { useActionState } from 'react'
import { toggleInspectionAnswerAction, type ToggleAnswerState } from '@/lib/actions/inspection'
import { Badge } from '@/components/ui/badge'

interface Props {
  answerId: string
  inspectionId: string
  currentAnswer: boolean | null
  questionKey: string
}

const LABELS: Record<string, { label: string; variant: 'success' | 'destructive' | 'warning' }> = {
  true: { label: 'Sí', variant: 'success' },
  false: { label: 'No', variant: 'destructive' },
  null: { label: 'Pendiente', variant: 'warning' },
}

export function ChecklistToggle({ answerId, inspectionId, currentAnswer, questionKey }: Props) {
  const key = String(currentAnswer)
  const { label, variant } = LABELS[key] ?? LABELS.null

  const [state, action, pending] = useActionState(toggleInspectionAnswerAction, null as ToggleAnswerState | null)

  // Use the server-confirmed answer if available, otherwise use the prop
  const displayAnswer = state?.success ? state.data?.answer : currentAnswer
  const displayKey = String(displayAnswer)
  const displayLabel = LABELS[displayKey]?.label ?? 'Pendiente'
  const displayVariant = LABELS[displayKey]?.variant ?? 'warning'

  return (
    <form action={action}>
      <input type="hidden" name="answerId" value={answerId} />
      <input type="hidden" name="inspectionId" value={inspectionId} />
      <input
        type="hidden"
        name="expectedAnswer"
        value={displayAnswer === true ? 'true' : displayAnswer === false ? 'false' : ''}
      />
      <button
        type="submit"
        disabled={pending}
        className="cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
        title={`${questionKey} — ${pending ? 'Actualizando...' : 'Click para cambiar estado'}`}
      >
        <Badge variant={displayVariant} className="transition-all duration-200 hover:ring-2 hover:ring-ring">
          {pending ? '...' : displayLabel}
        </Badge>
      </button>
    </form>
  )
}
