'use client'

import { useState, useActionState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { FRONT_QUESTIONS, REAR_QUESTIONS, type ChecklistQuestion } from '@/lib/checklist'
import { createInspectionAction, type InspectionFormState } from '@/lib/actions/inspection'
import { PhotoUpload } from '@/components/inspections/photo-upload'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, AlertCircle, X, ChevronLeft, ChevronRight, Truck, ClipboardCheck, Camera } from 'lucide-react'

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

const STEPS = [
  { label: 'Vehículo', icon: Truck },
  { label: 'Frente', icon: ClipboardCheck },
  { label: 'Trasera', icon: ClipboardCheck },
  { label: 'Fotos', icon: Camera },
]

export function InspectionForm({ vehicles }: InspectionFormProps) {
  const router = useRouter()

  const [state, formAction, pending] = useActionState<InspectionFormState | null, FormData>(
    createInspectionAction,
    null,
  )

  const [currentStep, setCurrentStep] = useState(1)
  const [stepError, setStepError] = useState<string | null>(null)

  const [vehicleId, setVehicleId] = useState('')
  const [kmCurrent, setKmCurrent] = useState('')
  const [observations, setObservations] = useState('')

  const [answers, setAnswers] = useState<Map<string, AnswerState>>(() => {
    const map = new Map<string, AnswerState>()
    for (const q of [...FRONT_QUESTIONS, ...REAR_QUESTIONS]) {
      map.set(q.key, { answer: undefined, observations: '' })
    }
    return map
  })

  useEffect(() => {
    if (state?.success) {
      router.push('/inspections')
    }
  }, [state?.success, router])

  const validateStep = useCallback(
    (step: number): boolean => {
      setStepError(null)

      if (step === 1) {
        if (!vehicleId) {
          setStepError('Seleccione un vehículo')
          return false
        }
        const km = Number(kmCurrent)
        if (!kmCurrent || Number.isNaN(km) || km <= 0) {
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

      return true
    },
    [vehicleId, kmCurrent, answers],
  )

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((s) => Math.min(s + 1, 4))
    }
  }

  const prevStep = () => {
    setStepError(null)
    setCurrentStep((s) => Math.max(s - 1, 1))
  }

  const setAnswer = (key: string, answer: boolean | null) => {
    setAnswers((prev) => {
      const next = new Map(prev)
      const existing = next.get(key) ?? { answer: undefined, observations: '' }
      next.set(key, { ...existing, answer })
      return next
    })
  }

  const setObservation = (key: string, obs: string) => {
    setAnswers((prev) => {
      const next = new Map(prev)
      const existing = next.get(key) ?? { answer: undefined, observations: '' }
      next.set(key, { ...existing, observations: obs })
      return next
    })
  }

  const handleSubmit = async (formData: FormData) => {
    if (currentStep !== 4) {
      setStepError('Debe completar todos los pasos antes de enviar la inspección')
      return
    }

    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      return
    }

    formData.set('vehicleId', vehicleId)
    formData.set('kmCurrent', kmCurrent)
    formData.set('observations', observations)
    formData.set('category', 'initial')

    const allQuestions = [...FRONT_QUESTIONS, ...REAR_QUESTIONS]
    const answersArray = allQuestions.map((q) => ({
      section: q.section,
      questionKey: q.key,
      answer: answers.get(q.key)?.answer ?? null,
      observations: answers.get(q.key)?.observations || undefined,
    }))

    formData.set('answers', JSON.stringify(answersArray))
    return formAction(formData)
  }

  if (state?.success) {
    return null
  }

  return (
    <form action={handleSubmit} className="space-y-6" noValidate>
      {/* Stepper */}
      <Card>
        <CardContent className="p-4">
          <nav aria-label="Pasos del formulario">
            <ol className="flex items-center justify-between">
              {STEPS.map((step, i) => {
                const stepNum = i + 1
                const isActive = stepNum === currentStep
                const isComplete = stepNum < currentStep
                const Icon = step.icon

                return (
                  <li key={step.label} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center">
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-semibold border-2 transition-all duration-300 ${
                          isActive
                            ? 'bg-primary border-primary text-primary-foreground shadow-sm'
                            : isComplete
                              ? 'bg-green-500 border-green-500 text-white'
                              : 'bg-muted/50 border-border text-muted-foreground'
                        }`}
                      >
                        {isComplete ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                      </motion.div>
                      <span
                        className={`mt-1.5 text-xs hidden sm:block transition-colors ${
                          isActive ? 'text-primary font-medium' : isComplete ? 'text-green-600' : 'text-muted-foreground'
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>

                    {i < STEPS.length - 1 && (
                      <div
                        className={`flex-1 h-1 mx-2 rounded-full transition-all duration-500 ${
                          isComplete ? 'bg-green-500' : 'bg-muted'
                        }`}
                      />
                    )}
                  </li>
                )
              })}
            </ol>
          </nav>
        </CardContent>
      </Card>

      {/* Errors */}
      <AnimatePresence>
        {(state?.error || stepError) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{state?.error ?? stepError}</AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {state?.photoError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Alert variant="warning">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{state.photoError}</AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Form Content */}
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.2 }}
      >
        <Card>
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
                      <Truck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <CardTitle>Datos del Vehículo</CardTitle>
                      <CardDescription>Seleccione el vehículo a inspeccionar</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="vehicleId" required>Vehículo</Label>
                    <select
                      id="vehicleId"
                      name="vehicleId"
                      value={vehicleId}
                      onChange={(e) => setVehicleId(e.target.value)}
                      required
                      disabled={pending}
                      className="flex h-12 w-full rounded-xl border border-input bg-background px-4 py-3 text-base transition-all duration-200 hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50 bg-white dark:bg-card"
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
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        No hay vehículos registrados.{' '}
                        <a href="/vehicles/new" className="underline hover:text-amber-700">
                          Crear uno primero
                        </a>
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="kmCurrent" required>Kilómetros actuales</Label>
                    <Input
                      id="kmCurrent"
                      name="kmCurrent"
                      type="number"
                      min={1}
                      value={kmCurrent}
                      onChange={(e) => setKmCurrent(e.target.value)}
                      required
                      disabled={pending}
                      placeholder="Ej: 45000"
                      className="h-12 text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="observations">Observaciones generales</Label>
                    <Textarea
                      id="observations"
                      name="observations"
                      rows={3}
                      value={observations}
                      onChange={(e) => setObservations(e.target.value)}
                      disabled={pending}
                      placeholder="Notas adicionales sobre el estado del vehículo..."
                    />
                  </div>
                </CardContent>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div key="step2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ChecklistSection
                  title="Inspección — Frente del Vehículo"
                  questions={FRONT_QUESTIONS}
                  answers={answers}
                  setAnswer={setAnswer}
                  setObservation={setObservation}
                  disabled={pending}
                />
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div key="step3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ChecklistSection
                  title="Inspección — Parte Trasera"
                  questions={REAR_QUESTIONS}
                  answers={answers}
                  setAnswer={setAnswer}
                  setObservation={setObservation}
                  disabled={pending}
                />
              </motion.div>
            )}

            {currentStep === 4 && (
              <motion.div key="step4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-violet-50 dark:bg-violet-900/20 rounded-xl flex items-center justify-center">
                      <Camera className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                      <CardTitle>Fotografías</CardTitle>
                      <CardDescription>Capture fotos del estado actual del vehículo</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <PhotoUpload category="initial" label="Fotos de inspección inicial" />
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={prevStep}
          disabled={currentStep === 1 || pending}
          className="h-12"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Anterior
        </Button>

        {currentStep < 4 ? (
          <Button
            type="button"
            size="lg"
            onClick={nextStep}
            disabled={pending}
            className="h-12"
          >
            Siguiente
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button
            type="submit"
            size="lg"
            disabled={pending}
            className="h-12 bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/25"
          >
            {pending ? (
              <div className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Creando...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Crear Inspección
              </div>
            )}
          </Button>
        )}
      </div>
    </form>
  )
}

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
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Marque cada ítem según corresponda</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {questions.map((q, idx) => {
          const current = answers.get(q.key) ?? { answer: undefined, observations: '' }

          return (
            <motion.div
              key={q.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="rounded-xl border border-border bg-secondary/30 p-4"
            >
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center mt-0.5">
                  {idx + 1}
                </span>

                <div className="flex-1 space-y-3">
                  <p className="text-sm font-medium text-foreground">{q.label}</p>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAnswer(q.key, true)}
                      disabled={disabled}
                      className={`relative flex-1 flex items-center justify-center gap-1.5 px-3 py-3 rounded-xl border text-sm font-medium cursor-pointer transition-all duration-200 ${
                        current.answer === true
                          ? 'bg-green-50 border-green-300 text-green-700 dark:bg-green-900/20 dark:border-green-700 dark:text-green-400 shadow-sm'
                          : 'bg-background border-border text-muted-foreground hover:border-green-200 hover:text-green-600'
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full transition-colors ${current.answer === true ? 'bg-green-500' : 'bg-muted'}`} />
                      Sí
                    </button>

                    <button
                      type="button"
                      onClick={() => setAnswer(q.key, false)}
                      disabled={disabled}
                      className={`relative flex-1 flex items-center justify-center gap-1.5 px-3 py-3 rounded-xl border text-sm font-medium cursor-pointer transition-all duration-200 ${
                        current.answer === false
                          ? 'bg-red-50 border-red-300 text-red-700 dark:bg-red-900/20 dark:border-red-700 dark:text-red-400 shadow-sm'
                          : 'bg-background border-border text-muted-foreground hover:border-red-200 hover:text-red-600'
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full transition-colors ${current.answer === false ? 'bg-red-500' : 'bg-muted'}`} />
                      No
                    </button>

                    <button
                      type="button"
                      onClick={() => setAnswer(q.key, null)}
                      disabled={disabled}
                      className={`relative flex-1 flex items-center justify-center gap-1.5 px-3 py-3 rounded-xl border text-sm font-medium cursor-pointer transition-all duration-200 ${
                        current.answer === null
                          ? 'bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-400 shadow-sm'
                          : 'bg-background border-border text-muted-foreground hover:border-amber-200 hover:text-amber-600'
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full transition-colors ${current.answer === null ? 'bg-amber-500' : 'bg-muted'}`} />
                      Pendiente
                    </button>
                  </div>

                  <Input
                    value={current.observations}
                    onChange={(e) => setObservation(q.key, e.target.value)}
                    disabled={disabled}
                    placeholder="Observaciones (opcional)..."
                    className="h-10 text-sm"
                  />
                </div>
              </div>
            </motion.div>
          )
        })}
      </CardContent>
    </div>
  )
}
