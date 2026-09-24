"use client";

import {
  useState,
  useActionState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  FRONT_QUESTIONS,
  REAR_QUESTIONS,
  type ChecklistQuestion,
} from "@/lib/checklist";
import {
  createUnifiedInspectionAction,
  type InspectionFormState,
} from "@/lib/actions/inspection";
import { PhotoUpload } from "@/components/inspections/photo-upload";
import { SignaturePad } from "@/components/inspections/signature-pad";
import { CreatedWithVideosView } from "@/components/inspections/created-with-videos-view";
import { DocumentScanner } from "@/components/ui/document-scanner";
import { useFormDraft } from "@/hooks/use-form-draft";
import { useSubmitWatchdog } from "@/hooks/use-submit-watchdog";
import { formatDraftAge } from "@/lib/draft-storage";
import { queue as videoQueue } from "@/lib/video-upload-queue";
import { assertPayloadUnderLimit } from "@/lib/payload-guard";
import { WizardStepper } from "@/components/inspections/wizard-stepper";
import { SectionCard } from "@/components/inspections/section-card";
import { InlineError } from "@/components/inspections/inline-error";
import { SegmentedSwitch } from "@/components/inspections/segmented-switch";
import { PlateInput } from "@/components/inspections/plate-input";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { MonthYearPicker } from "@/components/ui/month-year-picker";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle,
  CheckCircle,
  Plus,
  Trash2,
  User,
  Car,
  ClipboardCheck,
  Camera,
  PenLine,
  Fuel,
  FileText,
  ScanLine,
  X,
  Save,
  ArrowLeft,
  ArrowRight,
  ListOrdered,
} from "lucide-react";
import type { OwnerRecord } from "@/lib/services/owner";
import type { VehicleRecord } from "@/lib/services/vehicle";

interface UnifiedInspectionFormProps {
  owners: OwnerRecord[];
  vehicles: VehicleRecord[];
}

// ─── Draft Persistence ─────────────────────────────────────────────
const DRAFT_KEY = "unified-inspection";

interface DraftAnswerEntry {
  key: string;
  answer: boolean | null | undefined;
  observations: string;
}

// FIX 9: optional step — backward-compatible (old drafts without it → default 0)
interface DraftSnapshot {
  branch: "montados" | "desmontados";
  step?: number;
  ownerDocumentType: string;
  ownerDocumentNumber: string;
  ownerFullName: string;
  ownerPhone: string;
  ownerEmail: string;
  selectedOwnerId: string;
  foundOwner: {
    id: string;
    documentId: string;
    fullName: string;
    phone: string | null;
    email: string | null;
  } | null;
  vinSerial: string;
  codigoUnicoGnc: string;
  licensePlate: string;
  vehicleType: string;
  brand: string;
  model: string;
  marcaKit: string;
  selectedVehicleId: string;
  foundVehicle: {
    id: string;
    vinSerial: string | null;
    codigoUnicoGnc: string | null;
    licensePlate: string;
    vehicleType: string;
    brand: string | null;
    model: string | null;
    marcaKit: string | null;
    owner: {
      id: string;
      documentId: string;
      fullName: string;
      phone: string | null;
      email: string | null;
    } | null;
  } | null;
  kmCurrent: string;
  kmNoMarca: boolean;
  observations: string;
  answers: DraftAnswerEntry[];
  cylinders: CylinderEntry[];
  signature: string;
  fileMeta: {
    cedulaName: string | null;
    carnetName: string | null;
    photosNames: string[];
  };
  savedAt: number;
}

function rebuildAnswersMap(
  entries: DraftAnswerEntry[] | undefined,
): Map<string, AnswerState> {
  const map = new Map<string, AnswerState>();
  if (entries && entries.length > 0) {
    for (const e of entries) {
      map.set(e.key, { answer: e.answer, observations: e.observations });
    }
    return map;
  }
  for (const q of [...FRONT_QUESTIONS, ...REAR_QUESTIONS]) {
    map.set(q.key, { answer: undefined, observations: "" });
  }
  return map;
}

function draftHasContent(d: DraftSnapshot | null): boolean {
  if (!d) return false;
  return Boolean(
    d.ownerFullName.trim() ||
      d.ownerDocumentNumber.trim() ||
      d.licensePlate.trim() ||
      d.vinSerial.trim() ||
      d.brand.trim() ||
      d.model.trim() ||
      d.kmCurrent.trim() ||
      d.observations.trim() ||
      d.signature ||
      d.cylinders.length > 0 ||
      d.answers.some((a) => a.answer !== undefined || a.observations.trim()) ||
      d.fileMeta.cedulaName ||
      d.fileMeta.carnetName ||
      d.fileMeta.photosNames.length > 0,
  );
}

// ─── Answer State Type ────────────────────────────────────────────
interface AnswerState {
  answer: boolean | null | undefined;
  observations: string;
}

// ─── Cylinder Entry ───────────────────────────────────────────────
interface CylinderEntry {
  brand: string;
  capacity: string;
  initialSerial: string;
  manufactureDate: string;
  location: string;
  status: "desmontado";
}

// ─── FIX 7: Stable step IDs ──────────────────────────────────────
type StepId = "vehicle" | "initial" | "cylinders" | "photos";

interface StepDef {
  id: StepId;
  label: string;
  /** Section IDs that live in this step (used to derive sectionToStep). */
  sections: string[];
}

const MONTADOS_STEPS: StepDef[] = [
  {
    id: "vehicle",
    label: "Vehículo",
    sections: ["branch", "owner", "vehicle", "inspection", "documents"],
  },
  {
    id: "initial",
    label: "Inicial",
    sections: ["checklist-front", "checklist-rear"],
  },
  { id: "cylinders", label: "Cilindros", sections: ["cylinders"] },
  { id: "photos", label: "Fotos", sections: ["photos", "signature"] },
];

const DESMONTADOS_STEPS: StepDef[] = [
  {
    id: "vehicle",
    label: "Vehículo",
    sections: ["branch", "owner", "vehicle", "inspection", "documents"],
  },
  { id: "cylinders", label: "Cilindros", sections: ["cylinders"] },
  { id: "photos", label: "Fotos", sections: ["photos", "signature"] },
];

// ─── Shared select trigger class ──────────────────────────────────
const SELECT_TRIGGER_CLS =
  "flex h-[52px] w-full rounded-lg border border-border bg-background px-3.5 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none";

// ─── Main Component ───────────────────────────────────────────────
export function UnifiedInspectionForm({
  owners,
  vehicles,
}: UnifiedInspectionFormProps) {
  const router = useRouter();

  const [state, formAction, pending] = useActionState<
    InspectionFormState | null,
    FormData
  >(createUnifiedInspectionAction, null);

  // ── Draft restoration ─────────────────────────────────────────
  const [restored, setRestored] = useState<DraftSnapshot | null>(null);
  const [restoreAttempted, setRestoreAttempted] = useState(false);
  const hasDraft = draftHasContent(restored);
  const [draftEpoch, setDraftEpoch] = useState(0);

  const [photos, setPhotos] = useState<File[]>([]);
  const [pendingVideos, setPendingVideos] = useState<File[]>([]);
  const [createdInspectionId, setCreatedInspectionId] = useState<string | null>(null);
  const { banner: watchdogBanner, arm: armWatchdog, reset: resetWatchdog } =
    useSubmitWatchdog();

  // ── Branch ──────────────────────────────────────────────────
  const [branch, setBranch] = useState<"montados" | "desmontados">("montados");
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const setFieldError = (field: string, message: string) => {
    setFieldErrors((prev) => ({ ...prev, [field]: message }));
  };

  const clearFieldError = (field: string) => {
    setFieldErrors((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  // ── FIX 7: Wizard Step State with stable IDs ────────────────
  const [step, setStep] = useState(0);
  const steps: StepDef[] = branch === "montados" ? MONTADOS_STEPS : DESMONTADOS_STEPS;
  const lastStepIdx = steps.length - 1;
  const stepId: StepId = steps[step].id;

  // FIX 7: Derive sectionToStep from a SINGLE source of truth (the steps array)
  const sectionToStep = useMemo(() => {
    const map: Record<string, number> = {};
    for (let i = 0; i < steps.length; i++) {
      for (const sectionId of steps[i].sections) {
        map[sectionId] = i;
      }
    }
    return map;
  }, [steps]);

  // Jump to the step containing the failing section + scroll to it
  const jumpToSection = useCallback(
    (id: string) => {
      const targetStep = sectionToStep[id];
      if (targetStep !== undefined) setStep(targetStep);
      requestAnimationFrame(() => {
        const el = document.getElementById(`section-${id}`);
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    },
    [sectionToStep],
  );

  // ── Owner State ─────────────────────────────────────────────
  const [ownerDocumentType, setOwnerDocumentType] = useState("V");
  const [ownerDocumentNumber, setOwnerDocumentNumber] = useState("");
  const [ownerFullName, setOwnerFullName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [foundOwner, setFoundOwner] = useState<{
    id: string;
    documentId: string;
    fullName: string;
    phone: string | null;
    email: string | null;
  } | null>(null);
  const [selectedOwnerId, setSelectedOwnerId] = useState("");

  // ── Vehicle State ───────────────────────────────────────────
  const [vinSerial, setVinSerial] = useState("");
  const [codigoUnicoGnc, setCodigoUnicoGnc] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [vehicleType, setVehicleType] = useState("sedan");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [marcaKit, setMarcaKit] = useState("");
  const [foundVehicle, setFoundVehicle] = useState<{
    id: string;
    vinSerial: string | null;
    codigoUnicoGnc: string | null;
    licensePlate: string;
    vehicleType: string;
    brand: string | null;
    model: string | null;
    marcaKit: string | null;
    owner: {
      id: string;
      documentId: string;
      fullName: string;
      phone: string | null;
      email: string | null;
    } | null;
  } | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");

  // ── Inspection ──────────────────────────────────────────────
  const [kmCurrent, setKmCurrent] = useState("");
  const [kmNoMarca, setKmNoMarca] = useState(false);
  const [observations, setObservations] = useState("");

  // ── Checklist ───────────────────────────────────────────────
  const [answers, setAnswers] = useState<Map<string, AnswerState>>(() =>
    rebuildAnswersMap(undefined),
  );
  const [checklistFrontGeneralObservation, setChecklistFrontGeneralObservation] = useState("");
  const [checklistRearGeneralObservation, setChecklistRearGeneralObservation] = useState("");

  // ── Signature ───────────────────────────────────────────────
  const [signature, setSignature] = useState("");

  // ── Cylinders ───────────────────────────────────────────────
  const [cylinders, setCylinders] = useState<CylinderEntry[]>([]);
  // FIX 10: Stable client IDs parallel to cylinders (survives deletion/reorder)
  const [cylinderIds, setCylinderIds] = useState<string[]>([]);

  // N1a: Lazy-mount gate for Fotos step children.
  // SignaturePad reads its canvas rect ONCE at mount; if mounted while the
  // panel is hidden (display:none), rect is 0×0 → corrupt export.
  // Flip true the first time stepId === "photos" (panel is visible → non-zero rect).
  // After first flip, stays true forever → children remain mounted across
  // step navigation → C1/C2/C3 stay closed (no remount clobber).
  const [hasVisitedPhotos, setHasVisitedPhotos] = useState(false);
  useEffect(() => {
    if (stepId === "photos" && !hasVisitedPhotos) {
      setHasVisitedPhotos(true);
    }
  }, [stepId, hasVisitedPhotos]);

  // ── Vehicle Documents (inline) ──────────────────────────────
  const [cedulaFile, setCedulaFile] = useState<File | null>(null);
  const [carnetFile, setCarnetFile] = useState<File | null>(null);
  const cedulaInputRef = useRef<HTMLInputElement>(null);
  const carnetInputRef = useRef<HTMLInputElement>(null);
  const [scannerOpen, setScannerOpen] = useState<"cedula" | "carnet" | null>(
    null,
  );

  // ── Draft persistence ─────────────────────────────────────────
  const snapshot = useMemo<DraftSnapshot>(
    () => ({
      branch,
      step, // FIX 9: persist step
      ownerDocumentType,
      ownerDocumentNumber,
      ownerFullName,
      ownerPhone,
      ownerEmail,
      selectedOwnerId,
      foundOwner,
      vinSerial,
      codigoUnicoGnc,
      licensePlate,
      vehicleType,
      brand,
      model,
      marcaKit,
      selectedVehicleId,
      foundVehicle,
      kmCurrent,
      kmNoMarca,
      observations,
      answers: [...answers.entries()].map(([key, v]) => ({
        key,
        answer: v.answer,
        observations: v.observations,
      })),
      cylinders,
      signature,
      fileMeta: {
        cedulaName: cedulaFile?.name ?? restored?.fileMeta.cedulaName ?? null,
        carnetName: carnetFile?.name ?? restored?.fileMeta.carnetName ?? null,
        photosNames:
          photos.length > 0
            ? photos.map((f) => f.name)
            : (restored?.fileMeta.photosNames ?? []),
      },
      savedAt: Date.now(),
    }),
    [
      branch,
      step,
      ownerDocumentType,
      ownerDocumentNumber,
      ownerFullName,
      ownerPhone,
      ownerEmail,
      selectedOwnerId,
      foundOwner,
      vinSerial,
      codigoUnicoGnc,
      licensePlate,
      vehicleType,
      brand,
      model,
      marcaKit,
      selectedVehicleId,
      foundVehicle,
      kmCurrent,
      kmNoMarca,
      observations,
      answers,
      cylinders,
      signature,
      cedulaFile,
      carnetFile,
      photos,
      restored,
    ],
  );

  const {
    files: draftFiles,
    loaded: draftLoaded,
    lastSavedAt, // FIX 11: actual save activity
    saveFiles: saveDraftFiles,
    flush: flushDraft, // FIX 2: synchronous flush for SPA navigation
    clear: clearDraft,
  } = useFormDraft(DRAFT_KEY, snapshot, { paused: !restoreAttempted });

  // Apply the persisted draft after mount
  useEffect(() => {
    let draft: DraftSnapshot | null = null;
    try {
      const raw = localStorage.getItem(`draft:${DRAFT_KEY}`);
      if (raw) draft = JSON.parse(raw) as DraftSnapshot;
    } catch {
      draft = null;
    }

    if (draft) {
      setBranch(draft.branch ?? "montados");
      setOwnerDocumentType(draft.ownerDocumentType ?? "V");
      setOwnerDocumentNumber(draft.ownerDocumentNumber ?? "");
      setOwnerFullName(draft.ownerFullName ?? "");
      setOwnerPhone(draft.ownerPhone ?? "");
      setOwnerEmail(draft.ownerEmail ?? "");
      setFoundOwner(draft.foundOwner ?? null);
      setSelectedOwnerId(draft.selectedOwnerId ?? "");
      setVinSerial(draft.vinSerial ?? "");
      setCodigoUnicoGnc(draft.codigoUnicoGnc ?? "");
      setLicensePlate(draft.licensePlate ?? "");
      setVehicleType(draft.vehicleType ?? "sedan");
      setBrand(draft.brand ?? "");
      setModel(draft.model ?? "");
      setMarcaKit(draft.marcaKit ?? "");
      setSelectedVehicleId(draft.selectedVehicleId ?? "");
      setFoundVehicle(draft.foundVehicle ?? null);
      setKmCurrent(draft.kmCurrent ?? "");
      setKmNoMarca(draft.kmNoMarca ?? false);
      setObservations(draft.observations ?? "");
      setAnswers(rebuildAnswersMap(draft.answers));
      setSignature(draft.signature ?? "");
      setCylinders(draft.cylinders ?? []);
      // FIX 10: regenerate stable IDs for restored cylinders
      setCylinderIds((draft.cylinders ?? []).map(() => crypto.randomUUID()));
      // FIX 9: restore step, clamped to valid range for the restored branch
      const restoredSteps = (draft.branch ?? "montados") === "montados" ? MONTADOS_STEPS : DESMONTADOS_STEPS;
      const restoredStep = draft.step ?? 0;
      // N2: robust clamp — floor at 0, truncate to integer, cap at max index
      setStep(Math.max(0, Math.min(Math.trunc(restoredStep) || 0, restoredSteps.length - 1)));
    }

    setRestored(draft);
    setRestoreAttempted(true);
  }, []);

  const filesReady = restoreAttempted && (!hasDraft || draftLoaded);

  // "Latest value" refs for stable file handlers
  const cedulaFileRef = useRef(cedulaFile);
  cedulaFileRef.current = cedulaFile;
  const carnetFileRef = useRef(carnetFile);
  carnetFileRef.current = carnetFile;
  const photosRef = useRef(photos);
  photosRef.current = photos;
  const pendingVideosRef = useRef(pendingVideos);
  pendingVideosRef.current = pendingVideos;

  // Hydrate files from IDB
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!draftLoaded || hydratedRef.current) return;
    hydratedRef.current = true;
    if (draftFiles.cedula) setCedulaFile(draftFiles.cedula);
    if (draftFiles.carnet) setCarnetFile(draftFiles.carnet);
    if (draftFiles.photos.length > 0) setPhotos(draftFiles.photos);
  }, [draftLoaded, draftFiles]);

  // File setters — update local state AND persist to IDB
  const handleCedulaChange = useCallback(
    (file: File | null) => {
      setCedulaFile(file);
      cedulaFileRef.current = file;
      saveDraftFiles({
        cedula: file,
        carnet: carnetFileRef.current,
        photos: photosRef.current,
      });
    },
    [saveDraftFiles],
  );

  const handleCarnetChange = useCallback(
    (file: File | null) => {
      setCarnetFile(file);
      carnetFileRef.current = file;
      saveDraftFiles({
        cedula: cedulaFileRef.current,
        carnet: file,
        photos: photosRef.current,
      });
    },
    [saveDraftFiles],
  );

  const handlePhotosChange = useCallback(
    (files: File[]) => {
      const current = photosRef.current;
      if (
        files.length === current.length &&
        files.every((f, i) => f === current[i])
      ) {
        return;
      }
      setPhotos(files);
      photosRef.current = files;
      saveDraftFiles({
        cedula: cedulaFileRef.current,
        carnet: carnetFileRef.current,
        photos: files,
      });
    },
    [saveDraftFiles],
  );

  const handleVideosSelected = useCallback((files: File[]) => {
    const current = pendingVideosRef.current;
    if (
      files.length === current.length &&
      files.every((f, i) => f === current[i])
    ) {
      return;
    }
    setPendingVideos(files);
    pendingVideosRef.current = files;
  }, []);

  // ── Owner Selection ──────────────────────────────────────────
  const applyOwner = (owner: OwnerRecord) => {
    setFoundOwner(owner);
    const parts = owner.documentId.split("-");
    setOwnerDocumentType(parts[0] || "V");
    setOwnerDocumentNumber(parts[1] || "");
    setOwnerFullName(owner.fullName);
    setOwnerPhone(owner.phone || "");
    setOwnerEmail(owner.email || "");
  };

  const handleOwnerChange = (id: string) => {
    setSelectedOwnerId(id);
    if (!id) {
      clearOwnerLookup();
      return;
    }
    const owner = owners.find((o) => o.id === id);
    if (owner) {
      setFormError(null);
      applyOwner(owner);
    }
  };

  const clearOwnerLookup = () => {
    setSelectedOwnerId("");
    setFoundOwner(null);
    setOwnerDocumentType("V");
    setOwnerDocumentNumber("");
    setOwnerFullName("");
    setOwnerPhone("");
    setOwnerEmail("");
  };

  // ── Vehicle Selection ────────────────────────────────────────
  const applyVehicle = (vehicle: VehicleRecord) => {
    setFoundVehicle({
      id: vehicle.id,
      vinSerial: vehicle.vinSerial || null,
      codigoUnicoGnc: vehicle.codigoUnicoGnc,
      licensePlate: vehicle.licensePlate,
      vehicleType: vehicle.vehicleType,
      brand: vehicle.brand,
      model: vehicle.model,
      marcaKit: vehicle.marcaKit,
      owner: null,
    });
    setVinSerial(vehicle.vinSerial || "");
    setCodigoUnicoGnc(vehicle.codigoUnicoGnc || "");
    setLicensePlate(vehicle.licensePlate);
    setVehicleType(vehicle.vehicleType);
    setBrand(vehicle.brand || "");
    setModel(vehicle.model || "");
    setMarcaKit(vehicle.marcaKit || "");

    if (vehicle.ownerId) {
      const owner = owners.find((o) => o.id === vehicle.ownerId);
      if (owner) {
        setSelectedOwnerId(owner.id);
        applyOwner(owner);
      }
    }
  };

  const handleVehicleChange = (id: string) => {
    setSelectedVehicleId(id);
    if (!id) {
      clearVehicleLookup();
      return;
    }
    const vehicle = vehicles.find((v) => v.id === id);
    if (vehicle) {
      setFormError(null);
      applyVehicle(vehicle);
    }
  };

  const clearVehicleLookup = () => {
    setSelectedVehicleId("");
    setFoundVehicle(null);
    setVinSerial("");
    setCodigoUnicoGnc("");
    setLicensePlate("");
    setVehicleType("sedan");
    setBrand("");
    setModel("");
    setMarcaKit("");
  };

  // ── Checklist Handlers ──────────────────────────────────────
  const setAnswer = (key: string, answer: boolean | null) => {
    setAnswers((prev) => {
      const next = new Map(prev);
      const existing = next.get(key) ?? { answer: undefined, observations: "" };
      next.set(key, { ...existing, answer });
      return next;
    });
  };

  const setObservation = (key: string, obs: string) => {
    setAnswers((prev) => {
      const next = new Map(prev);
      const existing = next.get(key) ?? { answer: undefined, observations: "" };
      next.set(key, { ...existing, observations: obs });
      return next;
    });
  };

  // ── FIX 10: Cylinder Handlers with stable IDs ───────────────
  const addCylinder = () => {
    setCylinderIds((prev) => [...prev, crypto.randomUUID()]);
    setCylinders((prev) => [
      ...prev,
      {
        brand: "",
        capacity: "",
        initialSerial: "",
        manufactureDate: "",
        location: "",
        status: "desmontado" as const,
      },
    ]);
  };

  const updateCylinder = (idx: number, field: keyof CylinderEntry, value: string) => {
    setCylinders((prev) =>
      prev.map((cyl, i) => (i === idx ? { ...cyl, [field]: value } : cyl)),
    );
  };

  const removeCylinder = (idx: number) => {
    setCylinderIds((prev) => prev.filter((_, i) => i !== idx));
    setCylinders((prev) => prev.filter((_, i) => i !== idx));
  };

  // ── FIX 6: Unified validation ──────────────────────────────────
  // One parameterized rule runner. Both per-step gate and final submit call it.
  // `stepOnly` limits checks to one step; `null` runs the FULL suite.
  // `jump` controls whether jumpToSection fires on error.
  const runValidation = (opts: {
    stepOnly: StepId | null;
    jump: boolean;
  }): boolean => {
    setFormError(null);
    setFieldErrors({});

    const fail = (field: string, section: string, msg: string): false => {
      setFieldError(field, msg);
      setFormError(msg);
      if (opts.jump) jumpToSection(section);
      return false;
    };

    const inScope = (s: StepId) =>
      opts.stepOnly === null || opts.stepOnly === s;

    // ── Vehicle-step rules ──
    if (inScope("vehicle")) {
      if (!foundOwner && !ownerFullName.trim()) {
        return fail("owner", "owner", "Busque un propietario existente o complete los datos para crear uno nuevo");
      }
      if (!foundVehicle && !licensePlate.trim()) {
        return fail("licensePlate", "vehicle", "La placa es obligatoria");
      }
      if (
        !foundVehicle &&
        licensePlate.trim() &&
        !/^[A-Z0-9][A-Z0-9]{5,6}$/.test(licensePlate.trim())
      ) {
        return fail("licensePlate", "vehicle", "Debe comenzar con una letra y tener entre 6 y 7 caracteres alfanuméricos");
      }
      // FIX 4: VIN required
      if (!vinSerial.trim()) {
        return fail("vinSerial", "vehicle", "El serial VIN es obligatorio");
      }
      if (!foundVehicle && brand.trim() && brand.trim().length < 2) {
        return fail("brand", "vehicle", "La marca debe tener al menos 2 caracteres");
      }
      if (!foundVehicle && model.trim() && model.trim().length < 1) {
        return fail("model", "vehicle", "El modelo es requerido");
      }
      if (
        !kmNoMarca &&
        kmCurrent !== "" &&
        (Number.isNaN(Number(kmCurrent)) || Number(kmCurrent) <= 0)
      ) {
        return fail("kmCurrent", "inspection", "Los kilómetros deben ser mayores a 0");
      }
    }

    // ── Initial-step rules (montados only) ──
    if (branch === "montados" && inScope("initial")) {
      const unanswered = [...FRONT_QUESTIONS, ...REAR_QUESTIONS].filter(
        (q) => answers.get(q.key)?.answer === undefined,
      );
      if (unanswered.length > 0) {
        setFieldError("checklist", `Faltan ${unanswered.length} preguntas por responder`);
        const msg = `Faltan responder ${unanswered.length} preguntas del checklist`;
        setFormError(msg);
        if (opts.jump) {
          const frontUnanswered = FRONT_QUESTIONS.filter(
            (q) => answers.get(q.key)?.answer === undefined,
          );
          jumpToSection(frontUnanswered.length > 0 ? "checklist-front" : "checklist-rear");
        }
        return false;
      }
    }

    // ── Cylinders-step rules ──
    if (inScope("cylinders")) {
      if (branch === "desmontados" && cylinders.length === 0) {
        return fail("cylinders", "cylinders", "Debe agregar al menos un cilindro");
      }
      const incompleteCyl = cylinders.some(
        (c) => !c.brand || !c.capacity || !c.initialSerial || !c.manufactureDate || !c.location,
      );
      if (incompleteCyl) {
        return fail("cylinders", "cylinders", "Complete todos los campos de los cilindros o elimínelos");
      }
    }

    // ── Full-submit-only rules ──
    if (opts.stepOnly === null) {
      if (!signature) {
        return fail("signature", "signature", "La firma del propietario es obligatoria");
      }
    }

    return true;
  };

  const validateCurrentStep = () => runValidation({ stepOnly: stepId, jump: false });
  const validate = () => runValidation({ stepOnly: null, jump: true });

  // ── Submit ──────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const payloadFiles: File[] = [
      ...photos,
      cedulaFile,
      carnetFile,
    ].filter((f): f is File => !!f && f.size > 0);
    const payloadError = assertPayloadUnderLimit(payloadFiles);
    if (payloadError) {
      setFormError(payloadError);
      return;
    }

    setFormError(null);
    resetWatchdog();

    const submitData = new FormData();

    submitData.set("branch", branch);

    if (foundOwner) {
      submitData.set("existingOwnerDocumentId", foundOwner.documentId);
    }
    submitData.set("documentType", ownerDocumentType);
    submitData.set("documentNumber", ownerDocumentNumber);
    submitData.set("fullName", ownerFullName);
    if (ownerPhone) submitData.set("phone", ownerPhone);
    if (ownerEmail) submitData.set("email", ownerEmail);

    if (foundVehicle) {
      submitData.set("existingLicensePlate", foundVehicle.licensePlate);
    }
    submitData.set("vinSerial", vinSerial);
    if (codigoUnicoGnc) submitData.set("codigoUnicoGnc", codigoUnicoGnc);
    submitData.set("licensePlate", licensePlate);
    submitData.set("vehicleType", vehicleType);
    submitData.set("brand", brand);
    submitData.set("model", model);
    submitData.set("marcaKit", marcaKit);

    if (!kmNoMarca) submitData.set("kmCurrent", kmCurrent);
    if (observations) submitData.set("observations", observations);

    if (branch === "montados") {
      const allQuestions = [...FRONT_QUESTIONS, ...REAR_QUESTIONS];
      const answersArray = allQuestions.map((q) => ({
        section: q.section,
        questionKey: q.key,
        answer: answers.get(q.key)?.answer ?? null,
        observations: answers.get(q.key)?.observations || undefined,
      }));
      submitData.set("answers", JSON.stringify(answersArray));
    } else {
      submitData.set("answers", "[]");
    }

    submitData.set("signature", signature);

    if (cylinders.length > 0) {
      submitData.set("cylinders", JSON.stringify(cylinders));
    }

    if (cedulaFile) {
      submitData.set("cedula", cedulaFile);
    }
    if (carnetFile) {
      submitData.set("carnet", carnetFile);
    }

    for (const file of photos) {
      if (file && file.size > 0) {
        submitData.append("photos", file);
      }
    }

    armWatchdog(payloadFiles);
    await formAction(submitData);
  };

  // ── Draft discard ────────────────────────────────────────────
  const discardDraft = async () => {
    await clearDraft();
    setBranch("montados");
    setOwnerDocumentType("V");
    setOwnerDocumentNumber("");
    setOwnerFullName("");
    setOwnerPhone("");
    setOwnerEmail("");
    setFoundOwner(null);
    setSelectedOwnerId("");
    setVinSerial("");
    setCodigoUnicoGnc("");
    setLicensePlate("");
    setVehicleType("sedan");
    setBrand("");
    setModel("");
    setMarcaKit("");
    setFoundVehicle(null);
    setSelectedVehicleId("");
    setKmCurrent("");
    setKmNoMarca(false);
    setObservations("");
    setAnswers(rebuildAnswersMap(undefined));
    setSignature("");
    setCylinders([]);
    setCylinderIds([]);
    setCedulaFile(null);
    setCarnetFile(null);
    setPhotos([]);
    photosRef.current = [];
    cedulaFileRef.current = null;
    carnetFileRef.current = null;
    setPendingVideos([]);
    pendingVideosRef.current = [];
    setCreatedInspectionId(null);
    resetWatchdog();
    setFormError(null);
    setDraftEpoch((n) => n + 1);
    setStep(0);
    // N1c: clear restored so the "Borrador restaurado" banner disappears
    // AND a remounted SignaturePad doesn't redraw the discarded signature.
    setRestored(null);
    setHasVisitedPhotos(false);
  };

  // ── FIX 2: Navigation helpers that flush draft first ─────────
  const saveAndNavigate = (href: string) => {
    flushDraft();
    router.push(href);
  };

  // ── Step navigation ──────────────────────────────────────────
  const goNext = () => {
    if (step < lastStepIdx && validateCurrentStep()) {
      setStep((s) => s + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const goBack = () => {
    if (step > 0) {
      setStep((s) => s - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // FIX 8: Only backward navigation from stepper taps (matches WizardStepper contract)
  const handleStepClick = (idx: number) => {
    if (idx < step) {
      setStep(idx);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // ── Success State ───────────────────────────────────────────
  const successHandledRef = useRef(false);
  useEffect(() => {
    if (!state?.success) return;
    if (createdInspectionId) return;
    if (successHandledRef.current) return;
    successHandledRef.current = true;

    resetWatchdog();
    clearDraft();

    const inspectionId = state.data?.inspectionId;
    const videos = pendingVideosRef.current;

    if (inspectionId && videos.length > 0) {
      const category = branch === "montados" ? "initial" : "removal";
      for (const file of videos) {
        videoQueue.enqueue(inspectionId, category, file);
      }
      setPendingVideos([]);
      pendingVideosRef.current = [];
      setCreatedInspectionId(inspectionId);
    }
  }, [state?.success, clearDraft, branch, createdInspectionId, resetWatchdog]);

  const wasPendingRef = useRef(false);
  useEffect(() => {
    if (wasPendingRef.current && !pending) {
      resetWatchdog();
    }
    wasPendingRef.current = pending;
  }, [pending, resetWatchdog]);

  // Plain success (no pending videos)
  if (state?.success && !createdInspectionId) {
    return (
      <div className="max-w-2xl mx-auto mt-8 bg-card border border-border rounded-xl p-12 text-center space-y-4">
        <div className="w-16 h-16 bg-status-success/10 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-status-success" />
        </div>
        <h2 className="text-2xl font-bold">Inspección Creada</h2>
        <p className="text-muted-foreground">
          La inspección se registró correctamente.
        </p>
        <div className="flex gap-4 justify-center pt-4">
          <Button onClick={() => router.push("/inspections")}>
            Ver Inspecciones
          </Button>
          <Button variant="outline" onClick={() => router.push("/dashboard")}>
            Volver al Inicio
          </Button>
        </div>
      </div>
    );
  }

  // Success + videos pending
  if (state?.success && createdInspectionId) {
    return (
      <CreatedWithVideosView
        inspectionId={createdInspectionId}
        inspectionLabel="Inspección"
        inspectionHref={`/inspections/${createdInspectionId}`}
        listHref="/inspections"
        onBackToList={() => {
          router.push("/inspections");
        }}
      />
    );
  }

  // ── Derived values for rendering ─────────────────────────────
  const isFinalStep = step === lastStepIdx;
  const totalCylCapacity = cylinders.reduce(
    (sum, c) => sum + (Number(c.capacity) || 0),
    0,
  );

  // FIX 11: Guardado badge driven by actual save activity
  const hasSaved = lastSavedAt !== null;

  // ── Wizard layout ────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="flex flex-col" noValidate>
      {/* ── Sticky header: back + title + draft badge ─────────── */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 0}
            className="flex items-center justify-center w-10 h-10 rounded-lg text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-default transition-colors"
            aria-label="Paso anterior"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="font-headline text-lg font-bold text-foreground truncate">
            Nueva Inspección
          </h2>
          {/* FIX 11: only show "Guardado" after a real write */}
          {hasSaved ? (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-status-success/10 text-status-success"
              aria-live="polite"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-success opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-status-success" />
              </span>
              <span className="text-xs font-bold">Guardado</span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground px-2.5 py-1">
              Borrador
            </span>
          )}
        </div>

        {/* Stepper */}
        <WizardStepper
          steps={steps.map((s) => ({ id: s.id, label: s.label }))}
          currentStep={step}
          onStepClick={handleStepClick}
        />
      </div>

      {/* ── Scrollable step content ────────────────────────────── */}
      <div className="flex-1 px-4 py-4 space-y-4 pb-28">
        {/* Draft restoration banner */}
        <AnimatePresence>
          {hasDraft && restored && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="flex items-start gap-3 rounded-xl border border-status-warning/40 bg-status-warning/10 p-4">
                <div className="shrink-0 w-9 h-9 rounded-lg bg-status-warning/20 flex items-center justify-center">
                  <Save className="w-4 h-4 text-status-warning" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-status-warning">
                    Borrador restaurado
                  </p>
                  <p className="text-xs text-status-warning/80 mt-0.5">
                    Tenías datos sin enviar guardados {formatDraftAge(restored.savedAt)}
                    . Los restauramos para que continúes donde lo dejaste.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={discardDraft}
                  className="shrink-0 text-status-warning hover:bg-status-warning/20"
                >
                  Descartar
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══════════════════════════════════════════════════════
            FIX 1: ALL step panels are ALWAYS MOUNTED.
            Inactive panels use `hidden` (display:none) — exactly like the
            original CollapsibleSection. This prevents PhotoUpload/SignaturePad
            from unmounting and losing their internal state on step navigation.
            ═══════════════════════════════════════════════════════ */}

        {/* ── STEP: Vehículo ── */}
        <div className={stepId !== "vehicle" ? "hidden" : "space-y-4"}>
          {/* 1. Tipo de Ingreso (Branch) */}
          <SectionCard
            id="section-branch"
            title="Tipo de Ingreso"
            stepNumber={1}
            icon={<Car className="w-6 h-6" />}
          >
            <SegmentedSwitch
              options={[
                { value: "montados", label: "POR DESMONTAR" },
                { value: "desmontados", label: "DESINSTALADO" },
              ]}
              value={branch}
              onChange={(v) => {
                setBranch(v);
                setFormError(null);
                setStep(0);
              }}
              disabled={pending}
              ariaLabel="Tipo de ingreso"
            />
            <p className="text-xs text-muted-foreground">
              {branch === "montados"
                ? "Desinstalar del vehículo — inspección completa con checklist, fotos y firma"
                : "Cliente trajo cilindros — solo vehículo y cilindros (sin checklist)"}
            </p>
          </SectionCard>

          {/* 2. Propietario */}
          <SectionCard
            id="section-owner"
            title="Propietario"
            stepNumber={2}
            icon={<User className="w-6 h-6" />}
          >
            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground">
                Propietario existente
              </Label>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <SearchableSelect
                    id="ownerSelect"
                    value={selectedOwnerId}
                    onChange={handleOwnerChange}
                    disabled={pending}
                    placeholder={
                      owners.length === 0
                        ? "No hay propietarios registrados"
                        : "— Seleccionar propietario —"
                    }
                    options={owners.map((o) => ({
                      value: o.id,
                      label: `${o.documentId} — ${o.fullName}`,
                    }))}
                  />
                </div>
                {selectedOwnerId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={clearOwnerLookup}
                    className="mb-0.5 text-status-danger"
                    title="Crear propietario nuevo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
              {owners.length === 0 && (
                <p className="text-xs text-status-warning">
                  No hay propietarios registrados. Complete los datos abajo para
                  crear uno nuevo.
                </p>
              )}
            </div>
            {fieldErrors.owner && <InlineError message={fieldErrors.owner} />}

            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-xs font-bold text-muted-foreground">
                Nombre Completo <span className="text-status-danger">*</span>
              </Label>
              <Input
                id="fullName"
                name="fullName"
                value={ownerFullName}
                onChange={(e) => {
                  setOwnerFullName(e.target.value);
                  clearFieldError("owner");
                }}
                disabled={pending || !!foundOwner}
                placeholder="Nombre y apellido"
                autoComplete="name"
                enterKeyHint="next"
                className="h-[52px] bg-background border-border focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="documentType" className="text-xs font-bold text-muted-foreground">
                  Tipo Doc.
                </Label>
                <select
                  id="documentType"
                  name="documentType"
                  value={ownerDocumentType}
                  onChange={(e) => setOwnerDocumentType(e.target.value)}
                  disabled={pending || !!foundOwner}
                  className="w-full h-[52px] rounded-lg border border-border bg-background px-3.5 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                >
                  <option value="V">V</option>
                  <option value="E">E</option>
                  <option value="J">J</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="documentNumber" className="text-xs font-bold text-muted-foreground">
                  Nro Documento <span className="text-status-danger">*</span>
                </Label>
                <Input
                  id="documentNumber"
                  name="documentNumber"
                  value={ownerDocumentNumber}
                  onChange={(e) => setOwnerDocumentNumber(e.target.value)}
                  disabled={pending || !!foundOwner}
                  placeholder="12345678"
                  inputMode="numeric"
                  autoComplete="off"
                  enterKeyHint="next"
                  className="h-[52px] bg-background border-border focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-xs font-bold text-muted-foreground">
                Teléfono
              </Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={ownerPhone}
                onChange={(e) => setOwnerPhone(e.target.value)}
                disabled={pending || !!foundOwner}
                placeholder="0414-1234567"
                inputMode="tel"
                autoComplete="tel"
                enterKeyHint="next"
                className="h-[52px] bg-background border-border focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-bold text-muted-foreground">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                disabled={pending || !!foundOwner}
                placeholder="correo@ejemplo.com"
                inputMode="email"
                autoComplete="email"
                enterKeyHint="next"
                className="h-[52px] bg-background border-border focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </SectionCard>

          {/* 3. Vehículo */}
          <SectionCard
            id="section-vehicle"
            title="Vehículo"
            stepNumber={3}
            icon={<Car className="w-6 h-6" />}
          >
            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground">
                Vehículo existente
              </Label>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <SearchableSelect
                    id="vehicleSelect"
                    value={selectedVehicleId}
                    onChange={handleVehicleChange}
                    disabled={pending}
                    placeholder={
                      vehicles.length === 0
                        ? "No hay vehículos registrados"
                        : "— Seleccionar vehículo —"
                    }
                    options={vehicles.map((v) => ({
                      value: v.id,
                      label: `${v.licensePlate}${v.codigoUnicoGnc ? ` — Código Único ${v.codigoUnicoGnc}` : ""}${v.brand ? ` (${v.brand}${v.model ? ` ${v.model}` : ""})` : ""}`,
                    }))}
                  />
                </div>
                {selectedVehicleId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={clearVehicleLookup}
                    className="mb-0.5 text-status-danger"
                    title="Crear vehículo nuevo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
              {vehicles.length === 0 && (
                <p className="text-xs text-status-warning">
                  No hay vehículos registrados. Complete los datos abajo para
                  crear uno nuevo.
                </p>
              )}
            </div>

            {/* Placa (badge input) — FIX 12a: describedBy */}
            <div className="space-y-2">
              <Label htmlFor="licensePlate" className="text-xs font-bold text-muted-foreground">
                Placa <span className="text-status-danger">*</span>
              </Label>
              <PlateInput
                id="licensePlate"
                value={licensePlate}
                onChange={(v) => {
                  setLicensePlate(v);
                  clearFieldError("licensePlate");
                }}
                disabled={pending || !!foundVehicle}
                hasError={!!fieldErrors.licensePlate}
                describedBy={fieldErrors.licensePlate ? "licensePlate-error" : undefined}
              />
              {fieldErrors.licensePlate ? (
                <InlineError id="licensePlate-error" message={fieldErrors.licensePlate} />
              ) : (
                <p className="text-xs text-muted-foreground">
                  6 a 7 caracteres alfanuméricos (comienza con letra)
                </p>
              )}
            </div>

            {/* Marca / Modelo */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="brand" className="text-xs font-bold text-muted-foreground">
                  Marca
                </Label>
                <Input
                  id="brand"
                  name="brand"
                  value={brand}
                  onChange={(e) => {
                    setBrand(e.target.value);
                    clearFieldError("brand");
                  }}
                  disabled={pending || !!foundVehicle}
                  placeholder="Marca"
                  autoCapitalize="words"
                  enterKeyHint="next"
                  className="h-[52px] bg-background border-border focus:border-primary focus:ring-1 focus:ring-primary"
                />
                {fieldErrors.brand && <InlineError message={fieldErrors.brand} />}
              </div>
              <div className="space-y-2">
                <Label htmlFor="model" className="text-xs font-bold text-muted-foreground">
                  Modelo
                </Label>
                <Input
                  id="model"
                  name="model"
                  value={model}
                  onChange={(e) => {
                    setModel(e.target.value);
                    clearFieldError("model");
                  }}
                  disabled={pending || !!foundVehicle}
                  placeholder="Modelo"
                  autoCapitalize="words"
                  enterKeyHint="next"
                  className="h-[52px] bg-background border-border focus:border-primary focus:ring-1 focus:ring-primary"
                />
                {fieldErrors.model && <InlineError message={fieldErrors.model} />}
              </div>
            </div>

            {/* Tipo de vehículo */}
            <div className="space-y-2">
              <Label htmlFor="vehicleType" className="text-xs font-bold text-muted-foreground">
                Tipo de Vehículo
              </Label>
              <Select value={vehicleType} onValueChange={setVehicleType}>
                <SelectTrigger id="vehicleType" disabled={pending || !!foundVehicle} className={SELECT_TRIGGER_CLS}>
                  <SelectValue placeholder="Seleccione tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sedan">Sedán</SelectItem>
                  <SelectItem value="autobus">Autobús</SelectItem>
                  <SelectItem value="camion">Camión</SelectItem>
                  <SelectItem value="pickup">Pick Up</SelectItem>
                  <SelectItem value="camioneta">Camioneta</SelectItem>
                  <SelectItem value="van">Van</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* FIX 4: Serial VIN with helper hint restored */}
            <div className="space-y-2">
              <Label htmlFor="vinSerial" className="text-xs font-bold text-muted-foreground">
                Serial VIN <span className="text-status-danger">*</span>
              </Label>
              <Input
                id="vinSerial"
                name="vinSerial"
                value={vinSerial}
                onChange={(e) => {
                  setVinSerial(e.target.value.toUpperCase());
                  clearFieldError("vinSerial");
                }}
                maxLength={50}
                disabled={pending || !!foundVehicle}
                placeholder="Ej: 1HGBH41JXMN109186"
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                enterKeyHint="next"
                className={`h-[52px] bg-background border-border focus:border-primary focus:ring-1 focus:ring-primary font-mono text-[13px] ${
                  fieldErrors.vinSerial ? "border-status-danger" : ""
                }`}
                aria-invalid={fieldErrors.vinSerial ? true : undefined}
                aria-describedby={fieldErrors.vinSerial ? "vinSerial-error" : undefined}
              />
              {fieldErrors.vinSerial ? (
                <InlineError id="vinSerial-error" message={fieldErrors.vinSerial} />
              ) : (
                <p className="text-xs text-muted-foreground">17 caracteres alfanuméricos (obligatorio)</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="codigoUnicoGnc" className="text-xs font-bold text-muted-foreground">
                Código Único GNC
              </Label>
              <Input
                id="codigoUnicoGnc"
                name="codigoUnicoGnc"
                value={codigoUnicoGnc}
                onChange={(e) => setCodigoUnicoGnc(e.target.value.toUpperCase())}
                maxLength={50}
                disabled={pending || !!foundVehicle}
                placeholder="Código Único GNC (Opcional)"
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                enterKeyHint="next"
                className="h-[52px] bg-background border-border focus:border-primary focus:ring-1 focus:ring-primary font-mono text-[13px]"
              />
            </div>

            {/* Marca KIT GNC */}
            <div className="space-y-2">
              <Label htmlFor="marcaKit" className="text-xs font-bold text-muted-foreground">
                Marca de KIT GNC
              </Label>
              <Select value={marcaKit} onValueChange={setMarcaKit}>
                <SelectTrigger id="marcaKit" disabled={pending || !!foundVehicle} className={SELECT_TRIGGER_CLS}>
                  <SelectValue placeholder="Seleccione una marca" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Landi Renzo">Landi Renzo</SelectItem>
                  <SelectItem value="Tomasetto">Tomasetto</SelectItem>
                  <SelectItem value="BRC">BRC</SelectItem>
                  <SelectItem value="Tartarini">Tartarini</SelectItem>
                  <SelectItem value="OMVL">OMVL</SelectItem>
                  <SelectItem value="Excion">Excion</SelectItem>
                  <SelectItem value="Bigas">Bigas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </SectionCard>

          {/* 4. Datos de Inspección */}
          <SectionCard
            id="section-inspection"
            title="Datos de Inspección"
            stepNumber={4}
            icon={<ClipboardCheck className="w-6 h-6" />}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="kmCurrent" className="text-xs font-bold text-muted-foreground">
                  Kilómetros Actuales
                </Label>
                <label className="flex items-center gap-2 min-h-[48px] text-sm text-muted-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={kmNoMarca}
                    onChange={(e) => {
                      setKmNoMarca(e.target.checked);
                      if (e.target.checked) setKmCurrent("");
                    }}
                    disabled={pending}
                    className="w-5 h-5 rounded border-border accent-primary cursor-pointer"
                  />
                  No marca
                </label>
              </div>
              <Input
                id="kmCurrent"
                name="kmCurrent"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={kmNoMarca ? "" : kmCurrent}
                onChange={(e) => {
                  setKmCurrent(e.target.value);
                  clearFieldError("kmCurrent");
                }}
                disabled={pending || kmNoMarca}
                placeholder={kmNoMarca ? "No marca (N/M)" : "Ej: 45000 (Opcional)"}
                enterKeyHint="next"
                className={`h-[52px] bg-background border-border focus:border-primary focus:ring-1 focus:ring-primary ${
                  fieldErrors.kmCurrent ? "border-status-danger" : ""
                }`}
                aria-invalid={fieldErrors.kmCurrent ? true : undefined}
                aria-describedby={fieldErrors.kmCurrent ? "kmCurrent-error" : undefined}
              />
              {fieldErrors.kmCurrent ? (
                <InlineError id="kmCurrent-error" message={fieldErrors.kmCurrent} />
              ) : (
                <p className="text-xs text-muted-foreground">Opcional</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="observations" className="text-xs font-bold text-muted-foreground">
                Observaciones
              </Label>
              <Textarea
                id="observations"
                name="observations"
                rows={3}
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                disabled={pending}
                placeholder="Notas adicionales..."
                enterKeyHint="done"
                className="bg-background border-border focus:border-primary focus:ring-1 focus:ring-primary min-h-[80px]"
              />
            </div>
          </SectionCard>

          {/* 5. Documentos */}
          <SectionCard
            id="section-documents"
            title="Documentos del Vehículo"
            stepNumber={5}
            icon={<FileText className="w-6 h-6" />}
          >
            <div className="grid grid-cols-1 gap-4">
              <DocumentUploadSlot
                label="Cédula del Vehículo"
                file={cedulaFile}
                onPick={() => cedulaInputRef.current?.click()}
                onScan={() => setScannerOpen("cedula")}
                onClear={() => handleCedulaChange(null)}
                disabled={pending}
                inputRef={cedulaInputRef}
                onChange={(e) => handleCedulaChange(e.target.files?.[0] || null)}
              />
              <DocumentUploadSlot
                label="Carnet de Circulación"
                file={carnetFile}
                onPick={() => carnetInputRef.current?.click()}
                onScan={() => setScannerOpen("carnet")}
                onClear={() => handleCarnetChange(null)}
                disabled={pending}
                inputRef={carnetInputRef}
                onChange={(e) => handleCarnetChange(e.target.files?.[0] || null)}
              />
            </div>
          </SectionCard>
        </div>

        {/* ── STEP: Inicial (montados only) ── */}
        <div className={stepId !== "initial" ? "hidden" : "space-y-4"}>
          <SectionCard
            id="section-checklist-front"
            title="Checklist — Frente"
            stepNumber={1}
            icon={<ListOrdered className="w-6 h-6" />}
          >
            {fieldErrors.checklist && (
              <InlineError message={fieldErrors.checklist} />
            )}
            <ChecklistSection
              questions={FRONT_QUESTIONS}
              answers={answers}
              setAnswer={setAnswer}
              setObservation={setObservation}
              disabled={pending}
              generalObservation={checklistFrontGeneralObservation}
              setGeneralObservation={setChecklistFrontGeneralObservation}
            />
          </SectionCard>

          <SectionCard
            id="section-checklist-rear"
            title="Checklist — Parte Trasera"
            stepNumber={2}
            icon={<ListOrdered className="w-6 h-6" />}
          >
            <ChecklistSection
              questions={REAR_QUESTIONS}
              answers={answers}
              setAnswer={setAnswer}
              setObservation={setObservation}
              disabled={pending}
              generalObservation={checklistRearGeneralObservation}
              setGeneralObservation={setChecklistRearGeneralObservation}
            />
          </SectionCard>
        </div>

        {/* ── STEP: Cilindros ── */}
        <div className={stepId !== "cylinders" ? "hidden" : "space-y-4"}>
          <SectionCard
            id="section-cylinders"
            title="Cilindros GNC"
            stepNumber={1}
            icon={<Fuel className="w-6 h-6" />}
          >
            {fieldErrors.cylinders && (
              <InlineError message={fieldErrors.cylinders} />
            )}

            <div className="grid grid-cols-2 gap-3 bg-background border border-border rounded-lg p-3">
              <div className="text-center">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Total Cilindros
                </p>
                <p className="font-mono text-[32px] font-bold leading-none text-foreground mt-1">
                  {cylinders.length}
                </p>
              </div>
              <div className="text-center border-l border-border">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Capacidad Total
                </p>
                <p className="font-mono text-[32px] font-bold leading-none text-foreground mt-1">
                  {totalCylCapacity}
                  <span className="text-sm font-normal text-muted-foreground ml-1">L</span>
                </p>
              </div>
            </div>

            {cylinders.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground border-2 border-dashed border-border rounded-lg">
                {branch === "montados"
                  ? "No hay cilindros registrados. Puede continuar sin ellos."
                  : "Agregue al menos un cilindro desmontado."}
              </div>
            ) : (
              <div className="space-y-3">
                {cylinders.map((cyl, idx) => (
                  <div
                    key={cylinderIds[idx] ?? `cyl-${idx}`}
                    className="p-4 bg-background border border-border rounded-lg space-y-3 relative"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-primary text-primary-foreground text-xs font-bold uppercase">
                          CIL #{idx + 1}
                        </span>
                        {cyl.brand && (
                          <span className="text-sm font-medium text-foreground">{cyl.brand}</span>
                        )}
                        {cyl.capacity && (
                          <span className="text-sm text-muted-foreground">{cyl.capacity}L</span>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-status-danger hover:text-status-danger hover:bg-status-danger/10"
                        onClick={() => removeCylinder(idx)}
                        disabled={pending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-muted-foreground">Marca</Label>
                        <Select value={cyl.brand} onValueChange={(val) => updateCylinder(idx, "brand", val)}>
                          <SelectTrigger disabled={pending} className={SELECT_TRIGGER_CLS}>
                            <SelectValue placeholder="Marca" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MAT">MAT</SelectItem>
                            <SelectItem value="Sinoma">Sinoma</SelectItem>
                            <SelectItem value="Kioshi">Kioshi</SelectItem>
                            <SelectItem value="Cilbras">Cilbras</SelectItem>
                            <SelectItem value="Faber">Faber</SelectItem>
                            <SelectItem value="Inflex">Inflex</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-muted-foreground">Capacidad (L)</Label>
                        <Select value={cyl.capacity} onValueChange={(val) => updateCylinder(idx, "capacity", val)}>
                          <SelectTrigger disabled={pending} className={SELECT_TRIGGER_CLS}>
                            <SelectValue placeholder="Cap." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="27">27 L</SelectItem>
                            <SelectItem value="40">40 L</SelectItem>
                            <SelectItem value="50">50 L</SelectItem>
                            <SelectItem value="57">57 L</SelectItem>
                            <SelectItem value="60">60 L</SelectItem>
                            <SelectItem value="80">80 L</SelectItem>
                            <SelectItem value="90">90 L</SelectItem>
                            <SelectItem value="115">115 L</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground">N° Serie</Label>
                      <Input
                        value={cyl.initialSerial}
                        onChange={(e) => updateCylinder(idx, "initialSerial", e.target.value.toUpperCase())}
                        disabled={pending}
                        autoCapitalize="characters"
                        autoComplete="off"
                        spellCheck={false}
                        className="h-[52px] bg-background border-border focus:border-primary focus:ring-1 focus:ring-primary font-mono text-[13px]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-muted-foreground">Fecha Prueba</Label>
                        <MonthYearPicker
                          value={cyl.manufactureDate}
                          onChange={(val) => updateCylinder(idx, "manufactureDate", val)}
                          disabled={pending}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-muted-foreground">Ubicación</Label>
                        <Select value={cyl.location} onValueChange={(val) => updateCylinder(idx, "location", val)}>
                          <SelectTrigger disabled={pending} className={SELECT_TRIGGER_CLS}>
                            <SelectValue placeholder="Ubicación" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Chasis">Chasis</SelectItem>
                            <SelectItem value="Plataforma">Plataforma</SelectItem>
                            <SelectItem value="Zona de Carga">Zona de Carga</SelectItem>
                            <SelectItem value="Baul/maletero">Baúl/maletero</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={addCylinder}
              disabled={pending}
              className="w-full min-h-[48px] flex items-center justify-center gap-2 border-2 border-dashed border-border hover:border-primary text-foreground hover:text-primary rounded-lg font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-5 h-5" />
              Añadir cilindro
            </button>
          </SectionCard>
        </div>

        {/* ── STEP: Fotos ── */}
        <div className={stepId !== "photos" ? "hidden" : "space-y-4"}>
          <SectionCard
            id="section-photos"
            title="Fotografías"
            stepNumber={1}
            icon={<Camera className="w-6 h-6" />}
          >
            {filesReady && hasVisitedPhotos && (
              <PhotoUpload
                key={`photos-${draftEpoch}`}
                category="initial"
                label="Fotos de inspección inicial"
                onFilesChange={handlePhotosChange}
                onVideosSelected={handleVideosSelected}
                initialFiles={draftFiles.photos}
              />
            )}
          </SectionCard>

          <SectionCard
            id="section-signature"
            title="Firma del Propietario"
            stepNumber={2}
            icon={<PenLine className="w-6 h-6" />}
          >
            {filesReady && hasVisitedPhotos && (
              <SignaturePad
                key={`sig-${draftEpoch}`}
                onChange={setSignature}
                disabled={pending}
                initialValue={restored?.signature}
              />
            )}
            {fieldErrors.signature && (
              <InlineError message={fieldErrors.signature} />
            )}
            <p className="text-xs text-muted-foreground">
              Esta firma quedará registrada como constancia de la inspección.
            </p>
          </SectionCard>
        </div>
      </div>

      {/* ── Document Scanner Modal ──────────────────────── */}
      {scannerOpen && (
        <DocumentScanner
          key={scannerOpen === "cedula" ? "cedula" : "carnet"}
          label={
            scannerOpen === "cedula"
              ? "Escanear Cédula del Vehículo"
              : "Escanear Carnet de Circulación"
          }
          onCapture={(file) => {
            if (scannerOpen === "cedula") handleCedulaChange(file);
            else handleCarnetChange(file);
            setScannerOpen(null);
          }}
          onClose={() => setScannerOpen(null)}
          disabled={pending}
        />
      )}

      {/* ── Error Messages ──────────────────────────────── */}
      <AnimatePresence>
        {(state?.error || formError) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="px-4"
          >
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{state?.error ?? formError}</AlertDescription>
            </Alert>
          </motion.div>
        )}
        {watchdogBanner && (
          <motion.div
            key="watchdog"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="px-4"
          >
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex flex-col gap-2">
                <span>{watchdogBanner}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => window.location.reload()}
                  className="self-start"
                >
                  Recargar página
                </Button>
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Sticky bottom action bar ───────────────────── */}
      {/* FIX 3: self-contained safe-area inset (no undefined safe-bottom class) */}
      <div className="sticky bottom-0 z-30 bg-background/95 backdrop-blur-sm border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {!isFinalStep ? (
          <div className="flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => saveAndNavigate("/inspections")}
              disabled={pending}
              className="text-muted-foreground"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={goNext}
              disabled={pending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[140px]"
            >
              <span className="flex items-center gap-2">
                Siguiente
                <ArrowRight className="w-4 h-4" />
              </span>
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => saveAndNavigate("/inspections")}
              disabled={pending}
              className="text-muted-foreground shrink-0"
            >
              Cancelar
            </Button>
            <div className="flex-1" />
            <Button
              type="button"
              variant="outline"
              onClick={() => saveAndNavigate("/inspections")}
              disabled={pending}
              className="shrink-0 hidden sm:flex"
            >
              Guardar y salir
            </Button>
            <Button
              type="submit"
              disabled={pending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 min-w-[160px]"
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
                  {branch === "montados" ? "Crear Inspección" : "Registrar Ingreso"}
                </div>
              )}
            </Button>
          </div>
        )}
      </div>
    </form>
  );
}

// ─── Document Upload Slot (presentational) ──────────────────────────
interface DocumentUploadSlotProps {
  label: string;
  file: File | null;
  onPick: () => void;
  onScan: () => void;
  onClear: () => void;
  disabled: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function DocumentUploadSlot({
  label,
  file,
  onPick,
  onScan,
  onClear,
  disabled,
  inputRef,
  onChange,
}: DocumentUploadSlotProps) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-bold text-muted-foreground">{label}</Label>
      <div className="flex flex-col gap-2">
        {file && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-status-info/40 bg-status-info/10">
            <FileText className="w-4 h-4 text-status-info shrink-0" />
            <span className="text-sm text-status-info truncate flex-1">{file.name}</span>
            <button
              type="button"
              onClick={onClear}
              className="text-muted-foreground hover:text-status-danger transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onPick}
            disabled={disabled}
            className="flex-1 flex items-center justify-center gap-2 px-3 min-h-[48px] rounded-lg border border-dashed border-border hover:border-primary hover:bg-primary/5 cursor-pointer transition-all text-sm text-muted-foreground hover:text-primary"
          >
            <FileText className="w-4 h-4" />
            {file ? "Reemplazar" : "Seleccionar"}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,.pdf"
            className="sr-only"
            onChange={onChange}
            disabled={disabled}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onScan}
            disabled={disabled}
            className="gap-1.5"
            title="Escanear documento con la cámara"
          >
            <ScanLine className="w-4 h-4" />
            Escanear
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── FIX 12c: AnswerButton with aria-pressed ────────────────────────
interface AnswerButtonProps {
  label: string;
  pressed: boolean;
  onClick: () => void;
  disabled: boolean;
  selectedCls: string;
  /** N3: full literal hover class string (Tailwind must see the complete token at build time). */
  hoverCls: string;
}

function AnswerButton({
  label,
  pressed,
  onClick,
  disabled,
  selectedCls,
  hoverCls,
}: AnswerButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      disabled={disabled}
      className={`relative flex-1 flex items-center justify-center gap-1.5 px-3 min-h-[48px] rounded-lg border text-sm font-semibold cursor-pointer transition-all ${
        pressed ? selectedCls : `bg-background border-border text-muted-foreground ${hoverCls}`
      }`}
    >
      {label}
    </button>
  );
}

// ─── Checklist Section Sub-component ────────────────────────────────
interface ChecklistSectionProps {
  questions: ChecklistQuestion[];
  answers: Map<string, AnswerState>;
  setAnswer: (key: string, answer: boolean | null) => void;
  setObservation: (key: string, obs: string) => void;
  disabled: boolean;
  generalObservation?: string;
  setGeneralObservation?: (obs: string) => void;
}

function ChecklistSection({
  questions,
  answers,
  setAnswer,
  setObservation,
  disabled,
  generalObservation = "",
  setGeneralObservation,
}: ChecklistSectionProps) {
  const handlePreloadAll = () => {
    questions.forEach((q) => setAnswer(q.key, true));
  };

  return (
    <div className="space-y-3">
      {/* Preload button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handlePreloadAll}
          disabled={disabled}
          className="text-xs font-semibold text-primary hover:text-primary/80 underline transition-colors"
        >
          Precargar todo como Sí
        </button>
      </div>

      {questions.map((q, idx) => {
        const current = answers.get(q.key) ?? {
          answer: undefined,
          observations: "",
        };

        return (
          <div
            key={q.key}
            className="rounded-lg border border-border bg-background p-3"
          >
            <div className="flex items-start gap-3">
              <span className="shrink-0 w-7 h-7 rounded-md bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                {idx + 1}
              </span>

              <div className="flex-1 space-y-2">
                <p className="text-sm font-medium text-foreground">{q.label}</p>

                <div className="flex gap-2">
                  <AnswerButton
                    label="Sí"
                    pressed={current.answer === true}
                    onClick={() => setAnswer(q.key, true)}
                    disabled={disabled}
                    selectedCls="bg-status-success/10 border-status-success text-status-success"
                    hoverCls="hover:border-status-success/40"
                  />
                  <AnswerButton
                    label="No"
                    pressed={current.answer === false}
                    onClick={() => setAnswer(q.key, false)}
                    disabled={disabled}
                    selectedCls="bg-status-danger/10 border-status-danger text-status-danger"
                    hoverCls="hover:border-status-danger/40"
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* General observation for this section */}
      {setGeneralObservation && (
        <div className="mt-4 pt-4 border-t border-border">
          <Label className="text-sm font-bold text-foreground">
            Observaciones Generales de esta Sección
          </Label>
          <Textarea
            value={generalObservation}
            onChange={(e) => setGeneralObservation(e.target.value)}
            disabled={disabled}
            placeholder="Observaciones generales sobre esta sección (opcional)..."
            className="mt-2 min-h-[80px] text-sm bg-background border-border focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
      )}
    </div>
  );
}
