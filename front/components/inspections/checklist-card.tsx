'use client'

import { useActionState, useRef } from 'react'
import { ChecklistToggle } from '@/components/inspections/checklist-toggle'
import { ALL_QUESTIONS } from '@/lib/checklist'
import { toggleInspectionAnswerAction, type ToggleAnswerState } from '@/lib/actions/inspection'
import { Pencil } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'

const LABELS: Record<string, { label: string; variant: 'success' | 'destructive' | 'warning' }> = {
  true: { label: 'Sí', variant: 'success' },
  false: { label: 'No', variant: 'destructive' },
  null: { label: 'Pendiente', variant: 'warning' },
}

interface Props {
  answerId: string
  inspectionId: string
  currentAnswer: boolean | null
  questionKey: string
  observations?: string | null
  bgClass: string
}

export function ChecklistCard({
  answerId,
  inspectionId,
  currentAnswer,
  questionKey,
  observations,
  bgClass,
}: Props) {
  const [showObs, setShowObs] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const question = ALL_QUESTIONS.find((q) => q.key === questionKey)
  const label = question?.label ?? questionKey

  const [state, action, pending] = useActionState(toggleInspectionAnswerAction, null as ToggleAnswerState | null)

  const displayAnswer = state?.success ? state.data?.answer : currentAnswer
  const displayKey = String(displayAnswer)
  const displayLabel = LABELS[displayKey]?.label ?? 'Pendiente'
  const displayVariant = LABELS[displayKey]?.variant ?? 'warning'

  return (
    <form action={action} ref={formRef}>
      <input type="hidden" name="answerId" value={answerId} />
      <input type="hidden" name="inspectionId" value={inspectionId} />
      <input
        type="hidden"
        name="expectedAnswer"
        value={displayAnswer === true ? 'true' : displayAnswer === false ? 'false' : ''}
      />
      <div
        className={`relative rounded-lg border p-3 transition-colors cursor-pointer ${bgClass}`}
        onClick={() => formRef.current?.requestSubmit()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground break-words">
              {label}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ChecklistToggle
              label={displayLabel}
              variant={displayVariant}
              pending={pending}
            />
            {(observations ?? '').length > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowObs(!showObs)
                }}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="Ver observaciones"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {showObs && observations && (
          <p className="mt-2 text-xs text-muted-foreground border-t pt-2 italic">
            {observations}
          </p>
        )}
      </div>
    </form>
  )
}
