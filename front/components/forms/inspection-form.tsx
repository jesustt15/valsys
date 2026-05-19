'use client'

import { useState, useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FRONT_QUESTIONS, REAR_QUESTIONS, type ChecklistQuestion } from '@/lib/checklist'
import { createInspectionAction, type InspectionFormState } from '@/lib/actions/inspection'
import { PhotoUpload } from '@/components/inspections/photo-upload'

interface VehicleOption {
  id: string
  licensePlate: string
  brand: string | null
  model: string | null
}

interface InspectionFormProps {
  vehicles: VehicleOption[]
}

interface AnswerState {
  answer: boolean | null | undefined
  observations: string
}

const STEPS = ['Vehículo', 'Frente', 'Parte Trasera', 'Fotos']

export function InspectionForm({ vehicles }: InspectionFormProps) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState<InspectionFormState | null, FormData>(
    createInspectionAction,
    null,
  )

  const [currentStep, setCurrentStep] = useState(1)
  const [stepError, setStepError] = useState<string | null>(null)

  // Vehicle step state
  const [vehicleId, setVehicleId] = useState('')
  const [kmCurrent, setKmCurrent] = useState('')
  const [observations, setObservations] = useState('')

  // Checklist answers: Map<questionKey, AnswerState>
  // answer is undefined = not yet answered, null = pendiente, true = sí, false = no
  const [answers, setAnswers] = useState<Map<string, AnswerState>>(() => {
    const map = new Map<string, AnswerState>()
    for (const q of [...FRONT_QUESTIONS, ...REAR_QUESTIONS]) {
      map.set(q.key, { answer: undefined, observations: '' })
    }
    return map
  })

  // Photo files
  const [photos, setPhotos] = useState<File[]>([])

  // ─── Step Navigation ──────────────────────────────────────────

  const validateStep = (step: number): boolean => {
    setStepError(null)

    if (step === 1) {
      if (!vehicleId) {
        setStepError('Seleccione un vehículo')
        return false
      }
      const km = Number(kmCurrent)
      if (!kmCurrent || km <= 0) {
        setStepError('Ingrese los kilómetros actuales (mayor a 0)')
        return false
      }
      return true
    }

    if (step === 2) {
      const unanswered = FRONT_QUESTIONS.filter((q) => answers.get(q.key)?.answer === undefined)
      if (unanswered.length > 0) {
        setStepError(`Faltan responder ${unanswered.length} pregunta(s) en esta sección`)
        return false
      }
      return true
    }

    if (step === 3) {
      const unanswered = REAR_QUESTIONS.filter((q) => answers.get(q.key)?.answer === undefined)
      if (unanswered.length > 0) {
        setStepError(`Faltan responder ${unanswered.length} pregunta(s) en esta sección`)
        return false
      }
      return true
    }

    // Step 4 (photos) — always valid, photos are optional
    return true
  }

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((s) => Math.min(s + 1, 4))
    }
  }

  const prevStep = () => {
    setStepError(null)
    setCurrentStep((s) => Math.max(s - 1, 1))
  }

  // ─── Answer Helpers ───────────────────────────────────────────

  const setAnswer = (key: string, answer: boolean | null) => {
    setAnswers((prev) => {
      const next = new Map(prev)
      const existing = next.get(key) ?? { observations: '' }
      next.set(key, { ...existing, answer })
      return next
    })
  }

  const setObservation = (key: string, obs: string) => {
    setAnswers((prev) => {
      const next = new Map(prev)
      const existing = next.get(key) ?? { answer: null }
      next.set(key, { ...existing, observations: obs })
      return next
    })
  }

  // ─── Form Submission ──────────────────────────────────────────

  const handleSubmit = async (formData: FormData) => {
    // Append controlled state values — they're not in the DOM due to conditional rendering
    formData.append('vehicleId', vehicleId)
    formData.append('kmCurrent', kmCurrent)
    formData.append('observations', observations)

    // Collect photos — from native FormData (name="photos") + state fallback
    const nativePhotos = formData.getAll('photos') as File[]
    if (nativePhotos.length === 0) {
      // PhotoUpload stores files via onFilesChange → photos state;
      // add them if they weren't in the native FormData
      for (const file of photos) {
        formData.append('photos', file)
      }
    }

    // Build answers array
    const allQuestions = [...FRONT_QUESTIONS, ...REAR_QUESTIONS]
    const answersArray = allQuestions.map((q) => ({
      section: q.section,
      questionKey: q.key,
      answer: answers.get(q.key)?.answer ?? null,
      observations: answers.get(q.key)?.observations || undefined,
    }))

    formData.append('answers', JSON.stringify(answersArray))
    formData.append('category', 'initial')

    return formAction(formData)
  }

  // Handle success redirect
  useEffect(() => {
    if (state?.success) {
      router.push('/inspections')
    }
  }, [state?.success, router])

  if (state?.success) {
    return null
  }

  return (
    <form action={handleSubmit} className="space-y-6" noValidate>
      {/* Step Indicator */}
      <nav aria-label="Pasos del formulario">
        <ol className="flex items-center justify-between">
          {STEPS.map((label, i) => {
            const stepNum = i + 1
            const isActive = stepNum === currentStep
            const isComplete = stepNum < currentStep
            return (
              <li key={label} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors
                      ${isActive ? 'bg-blue-600 border-blue-600 text-white' : ''}
                      ${isComplete ? 'bg-green-600 border-green-600 text-white' : ''}
                      ${!isActive && !isComplete ? 'bg-gray-100 border-gray-300 text-gray-500' : ''}`}
                  >
                    {isComplete ? '✓' : stepNum}
                  </div>
                  <span
                    className={`mt-1 text-xs hidden sm:block
                      ${isActive ? 'text-blue-600 font-medium' : ''}
                      ${isComplete ? 'text-green-600' : 'text-gray-500'}`}
                  >
                    {label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 transition-colors
                      ${isComplete ? 'bg-green-600' : 'bg-gray-200'}`}
                  />
                )}
              </li>
            )
          })}
        </ol>
      </nav>

      {/* Global error */}
      {(state?.error || stepError) && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-700">{state?.error ?? stepError}</p>
        </div>
      )}

      {/* Photo error (inspection created but photos failed) */}
      {state?.photoError && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
          <p className="text-sm text-amber-700">{state.photoError}</p>
        </div>
      )}

      {/* Card wrapper */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        {/* Step 1: Vehicle Selection */}
        {currentStep === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Datos del Vehículo</h2>
              <p className="mt-1 text-sm text-gray-500">
                Seleccione el vehículo a inspeccionar
              </p>
            </div>

            {/* Vehicle dropdown */}
            <div>
              <label htmlFor="vehicleId" className="block text-sm font-medium text-gray-700">
                Vehículo <span className="text-red-500">*</span>
              </label>
              <select
                id="vehicleId"
                name="vehicleId"
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                required
                disabled={pending}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm
                           focus:border-blue-500 focus:ring-1 focus:ring-blue-500
                           disabled:opacity-50 disabled:cursor-not-allowed bg-white"
              >
                <option value="">— Seleccionar vehículo —</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.licensePlate}
                    {v.brand ? ` — ${v.brand} ${v.model ?? ''}` : ''}
                  </option>
                ))}
              </select>
              {vehicles.length === 0 && (
                <p className="mt-1 text-xs text-amber-600">
                  No hay vehículos registrados.{' '}
                  <a href="/vehicles/new" className="underline hover:text-amber-700">
                    Crear uno primero
                  </a>
                </p>
              )}
            </div>

            {/* KM */}
            <div>
              <label htmlFor="kmCurrent" className="block text-sm font-medium text-gray-700">
                Kilómetros actuales <span className="text-red-500">*</span>
              </label>
              <input
                id="kmCurrent"
                name="kmCurrent"
                type="number"
                min={1}
                value={kmCurrent}
                onChange={(e) => setKmCurrent(e.target.value)}
                required
                disabled={pending}
                placeholder="Ej: 45000"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm
                           placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500
                           disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Observations */}
            <div>
              <label htmlFor="observations" className="block text-sm font-medium text-gray-700">
                Observaciones generales
              </label>
              <textarea
                id="observations"
                name="observations"
                rows={3}
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                disabled={pending}
                placeholder="Notas adicionales sobre el estado del vehículo..."
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm
                           placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500
                           disabled:opacity-50 disabled:cursor-not-allowed resize-none"
              />
            </div>
          </div>
        )}

        {/* Step 2: Front Checklist */}
        {currentStep === 2 && (
          <ChecklistSection
            title="Inspección — Frente del Vehículo"
            questions={FRONT_QUESTIONS}
            answers={answers}
            setAnswer={setAnswer}
            setObservation={setObservation}
            disabled={pending}
          />
        )}

        {/* Step 3: Rear Checklist */}
        {currentStep === 3 && (
          <ChecklistSection
            title="Inspección — Parte Trasera"
            questions={REAR_QUESTIONS}
            answers={answers}
            setAnswer={setAnswer}
            setObservation={setObservation}
            disabled={pending}
          />
        )}

        {/* Step 4: Photo Upload */}
        {currentStep === 4 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Fotografías</h2>
              <p className="mt-1 text-sm text-gray-500">
                Capture fotos del estado actual del vehículo
              </p>
            </div>

            <PhotoUpload
              category="initial"
              label="Fotos de inspección inicial"
              onFilesChange={setPhotos}
            />
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={prevStep}
          disabled={currentStep === 1 || pending}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold
                     text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500
                     focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Anterior
        </button>

        {currentStep < 4 ? (
          <button
            type="button"
            onClick={nextStep}
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold
                       text-white shadow-sm hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500
                       focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Siguiente
          </button>
        ) : (
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold
                       text-white shadow-sm hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-green-500
                       focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {pending ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Creando...
              </>
            ) : (
              'Crear Inspección'
            )}
          </button>
        )}
      </div>
    </form>
  )
}

// ─── Checklist Section Sub-Component ─────────────────────────────

interface ChecklistSectionProps {
  title: string
  questions: ChecklistQuestion[]
  answers: Map<string, AnswerState>
  setAnswer: (key: string, answer: boolean | null) => void
  setObservation: (key: string, obs: string) => void
  disabled: boolean
}

function ChecklistSection({
  title,
  questions,
  answers,
  setAnswer,
  setObservation,
  disabled,
}: ChecklistSectionProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <p className="mt-1 text-sm text-gray-500">
          Marque cada ítem según corresponda
        </p>
      </div>

      <div className="space-y-4">
        {questions.map((q, idx) => {
          const current = answers.get(q.key) ?? { answer: null, observations: '' }
          return (
            <div
              key={q.key}
              className="rounded-lg border border-gray-200 bg-gray-50 p-4"
            >
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-200 text-gray-600 text-xs font-semibold flex items-center justify-center mt-0.5">
                  {idx + 1}
                </span>
                <div className="flex-1 space-y-3">
                  <p className="text-sm font-medium text-gray-800">{q.label}</p>

                  {/* Radio group: Sí / No / Pendiente */}
                  <div className="flex gap-2">
                    {/* Sí */}
                    <label
                      className={`relative flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium cursor-pointer transition-colors
                        ${current.answer === true
                          ? 'bg-green-50 border-green-300 text-green-700'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-green-200'}`}
                    >
                      <input
                        type="radio"
                        name={`answer_${q.key}`}
                        value="yes"
                        checked={current.answer === true}
                        onChange={() => setAnswer(q.key, true)}
                        disabled={disabled}
                        className="sr-only"
                      />
                      <span className={`w-2 h-2 rounded-full ${current.answer === true ? 'bg-green-500' : 'bg-gray-300'}`} />
                      Sí
                    </label>

                    {/* No */}
                    <label
                      className={`relative flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium cursor-pointer transition-colors
                        ${current.answer === false
                          ? 'bg-red-50 border-red-300 text-red-700'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-red-200'}`}
                    >
                      <input
                        type="radio"
                        name={`answer_${q.key}`}
                        value="no"
                        checked={current.answer === false}
                        onChange={() => setAnswer(q.key, false)}
                        disabled={disabled}
                        className="sr-only"
                      />
                      <span className={`w-2 h-2 rounded-full ${current.answer === false ? 'bg-red-500' : 'bg-gray-300'}`} />
                      No
                    </label>

                    {/* Pendiente */}
                    <label
                      className={`relative flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium cursor-pointer transition-colors
                        ${current.answer === null
                          ? 'bg-yellow-50 border-yellow-300 text-yellow-700'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-yellow-200'}`}
                    >
                      <input
                        type="radio"
                        name={`answer_${q.key}`}
                        value="pending"
                        checked={current.answer === null}
                        onChange={() => setAnswer(q.key, null)}
                        disabled={disabled}
                        className="sr-only"
                      />
                      <span className={`w-2 h-2 rounded-full ${current.answer === null ? 'bg-yellow-500' : 'bg-gray-300'}`} />
                      Pendiente
                    </label>
                  </div>

                  {/* Observations textarea */}
                  <textarea
                    name={`obs_${q.key}`}
                    rows={1}
                    value={current.observations}
                    onChange={(e) => setObservation(q.key, e.target.value)}
                    disabled={disabled}
                    placeholder="Observaciones (opcional)..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs shadow-sm
                               placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500
                               disabled:opacity-50 disabled:cursor-not-allowed resize-none"
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
