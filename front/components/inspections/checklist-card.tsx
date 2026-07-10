'use client'

import { ChecklistToggle } from '@/components/inspections/checklist-toggle'
import { ALL_QUESTIONS } from '@/lib/checklist'
import { Pencil } from 'lucide-react'
import { useState } from 'react'

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
  const question = ALL_QUESTIONS.find((q) => q.key === questionKey)
  const label = question?.label ?? questionKey

  return (
    <div className={`relative rounded-lg border p-3 transition-colors ${bgClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground break-words">
            {label}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ChecklistToggle
            answerId={answerId}
            inspectionId={inspectionId}
            currentAnswer={currentAnswer}
            questionKey={questionKey}
          />
          {(observations ?? '').length > 0 && (
            <button
              type="button"
              onClick={() => setShowObs(!showObs)}
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
  )
}
