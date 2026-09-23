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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import {
  AlertCircle,
  CheckCircle,
  Plus,
  Trash2,
  User,
  Truck,
  ClipboardCheck,
  Camera,
  PenLine,
  Database,
  FileText,
  ScanLine,
  X,
  CardSim,
  Save,
} from "lucide-react";
import type { OwnerRecord } from "@/lib/services/owner";
import type { VehicleRecord } from "@/lib/services/vehicle";

interface UnifiedInspectionFormProps {
  owners: OwnerRecord[];
  vehicles: VehicleRecord[];
}

// ─── Draft Persistence ─────────────────────────────────────────────
const DRAFT_KEY = "unified-inspection";

// Serializable snapshot — everything EXCEPT File objects (those go to IDB).
// The Map<key, AnswerState> is flattened to an array for JSON safety.
interface DraftAnswerEntry {
  key: string;
  answer: boolean | null | undefined;
  observations: string;
}

interface DraftSnapshot {
  branch: "montados" | "desmontados";
  // owner
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
  // vehicle
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
  // inspection
  kmCurrent: string;
  kmNoMarca: boolean;
  observations: string;
  // checklist (flattened map)
  answers: DraftAnswerEntry[];
  // cylinders
  cylinders: CylinderEntry[];
  // signature (base64)
  signature: string;
  // file metadata (just names, for banner display)
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

/**
 * True when the restored draft actually holds user input.
 *
 * The hook also persists an all-default snapshot (e.g. when you open the form
 * and leave without typing), and showing "draft restored" for that is noise.
 */
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
  // Restoration happens in an effect, NOT in useState initializers.
  //
  // Reading localStorage during render makes the client's first render differ
  // from the server's (localStorage does not exist during SSR), which breaks
  // hydration and forces React to regenerate the whole tree. So the first
  // render uses plain defaults on both sides, then we apply the draft after
  // mount.
  const [restored, setRestored] = useState<DraftSnapshot | null>(null);
  const [restoreAttempted, setRestoreAttempted] = useState(false);
  const hasDraft = draftHasContent(restored);
  // Bumped by discardDraft to remount the uncontrolled pickers clean.
  const [draftEpoch, setDraftEpoch] = useState(0);

  // Photos are tracked as state so the snapshot (and therefore the draft
  // auto-save) reacts when the user adds/removes photos.
  const [photos, setPhotos] = useState<File[]>([]);
  // Videos are tracked separately and NEVER travel in the creation FormData.
  // They are handed to the background video queue after the inspection is
  // created successfully.
  const [pendingVideos, setPendingVideos] = useState<File[]>([]);
  // Tracks the newly-created inspection id while the queue drains, so we can
  // render the queue panel in-page instead of redirecting.
  const [createdInspectionId, setCreatedInspectionId] = useState<string | null>(null);
  // Shared watchdog: size-scaled timer + offline banner + reset.
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

  // ── Signature ───────────────────────────────────────────────
  const [signature, setSignature] = useState("");

  // ── Cylinders ───────────────────────────────────────────────
  const [cylinders, setCylinders] = useState<CylinderEntry[]>([]);

  // ── Vehicle Documents (inline) ──────────────────────────────
  const [cedulaFile, setCedulaFile] = useState<File | null>(null);
  const [carnetFile, setCarnetFile] = useState<File | null>(null);
  const cedulaInputRef = useRef<HTMLInputElement>(null);
  const carnetInputRef = useRef<HTMLInputElement>(null);
  // Scanner states
  const [scannerOpen, setScannerOpen] = useState<"cedula" | "carnet" | null>(
    null,
  );

  // ── Accordion state (mobile collapsible sections) ──────────
  // All sections open by default; validate() can auto-open specific ones.
  const [openSections, setOpenSections] = useState<Set<string>>(() =>
    new Set(['owner', 'vehicle', 'inspection', 'checklist-front', 'checklist-rear', 'cylinders', 'photos', 'signature', 'documents'])
  );

  const handleSectionToggle = useCallback((id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const openSectionAndScroll = useCallback((id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    // Scroll to section after state update
    requestAnimationFrame(() => {
      const el = document.getElementById(`collapsible-header-${id}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);

  // ── Draft persistence ─────────────────────────────────────────
  // Build the JSON-serializable snapshot on every render. Files are excluded
  // (their names go in fileMeta for the banner; the actual File objects are
  // persisted to IndexedDB separately via `saveFiles`).
  const snapshot = useMemo<DraftSnapshot>(
    () => ({
      branch,
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

  // Hook: auto-saves snapshot to localStorage (debounced), flushes on
  // visibilitychange/pagehide, exposes IDB-backed file storage.
  //
  // Destructured (not used as `draft.x`) because `saveDraftFiles` and
  // `clearDraft` are the hook's stable useCallback identities — the wrapper
  // object itself is new every render and would defeat useCallback below.
  //
  // `paused` until restoration runs: otherwise the all-default first render
  // would be written over the stored draft before we ever read it.
  const {
    files: draftFiles,
    loaded: draftLoaded,
    saveFiles: saveDraftFiles,
    clear: clearDraft,
  } = useFormDraft(DRAFT_KEY, snapshot, { paused: !restoreAttempted });

  // Apply the persisted draft after mount. Batched into a single re-render by
  // React 18+, so the snapshot the hook sees next already holds real data.
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
    }

    setRestored(draft);
    setRestoreAttempted(true);
  }, []);

  // PhotoUpload/SignaturePad read their restored value only on first mount, so
  // we hold them back until both the state restore and the IDB file load are
  // done. Without a draft there is nothing to wait for beyond the restore.
  const filesReady = restoreAttempted && (!hasDraft || draftLoaded);

  // "Latest value" refs so the file handlers below can stay referentially
  // stable (empty-ish deps) while still reading current state. Stable handler
  // identity is what breaks the render loop: PhotoUpload re-fires its notify
  // effect whenever `onFilesChange` changes identity.
  const cedulaFileRef = useRef(cedulaFile);
  cedulaFileRef.current = cedulaFile;
  const carnetFileRef = useRef(carnetFile);
  carnetFileRef.current = carnetFile;
  const photosRef = useRef(photos);
  photosRef.current = photos;
  const pendingVideosRef = useRef(pendingVideos);
  pendingVideosRef.current = pendingVideos;

  // Hydrate files from IDB once they load.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!draftLoaded || hydratedRef.current) return;
    hydratedRef.current = true;
    if (draftFiles.cedula) setCedulaFile(draftFiles.cedula);
    if (draftFiles.carnet) setCarnetFile(draftFiles.carnet);
    if (draftFiles.photos.length > 0) setPhotos(draftFiles.photos);
  }, [draftLoaded, draftFiles]);

  // File setters — update local state AND persist to IDB.
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
      // Identity guard — PhotoUpload passes a freshly-mapped array on every
      // notify, so without this check each call would setState with a new
      // reference, re-render, re-notify, and loop forever.
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

  // Videos travel through a separate channel. PhotoUpload emits the validated
  // raw Files here; the form holds them and feeds the background queue AFTER
  // the inspection is created (we need the inspectionId first).
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

  // ── Owner Selection (SearchableSelect) ──────────────────────
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

  // ── Vehicle Selection (SearchableSelect) ────────────────────
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

    // If the vehicle has an owner, auto-populate the owner section
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

  // ── Cylinder Handlers ───────────────────────────────────────
  const addCylinder = () => {
    setCylinders([
      ...cylinders,
      {
        brand: "",
        capacity: "",
        initialSerial: "",
        manufactureDate: "",
        location: "",
        status: "desmontado",
      },
    ]);
  };

  const updateCylinder = (idx: number, field: keyof CylinderEntry, value: string) => {
    setCylinders((prev) =>
      prev.map((cyl, i) => (i === idx ? { ...cyl, [field]: value } : cyl))
    );
  };

  const removeCylinder = (idx: number) => {
    setCylinders(cylinders.filter((_, i) => i !== idx));
  };

  // ── Pre-submit validation ───────────────────────────────────
  // Each validation failure tags the sectionId so we can auto-open + scroll.
  const validate = (): boolean => {
    setFormError(null);
    setFieldErrors({});

    // Owner validation
    if (!foundOwner && !ownerFullName.trim()) {
      setFieldError('owner', "Busque un propietario existente o complete los datos para crear uno nuevo");
      setFormError(
        "Debe proporcionar un propietario (buscar existente o crear nuevo)",
      );
      openSectionAndScroll('owner');
      return false;
    }

    // Vehicle validation
    if (!foundVehicle && !licensePlate.trim()) {
      setFieldError('licensePlate', "La placa es obligatoria");
      setFormError("Debe proporcionar la placa del vehículo");
      openSectionAndScroll('vehicle');
      return false;
    }

    if (
      !foundVehicle &&
      licensePlate.trim() &&
      !/^[A-Z0-9][A-Z0-9]{5,6}$/.test(licensePlate.trim())
    ) {
      setFieldError('licensePlate', "Debe comenzar con una letra y tener entre 6 y 7 caracteres alfanuméricos");
      setFormError(
        "La placa debe comenzar con una letra y tener entre 6 y 7 caracteres alfanuméricos",
      );
      openSectionAndScroll('vehicle');
      return false;
    }

    if (!foundVehicle && brand.trim() && brand.trim().length < 2) {
      setFieldError('brand', "La marca debe tener al menos 2 caracteres");
      setFormError("La marca debe tener al menos 2 caracteres");
      openSectionAndScroll('vehicle');
      return false;
    }

    if (!foundVehicle && model.trim() && model.trim().length < 1) {
      setFieldError('model', "El modelo es requerido");
      setFormError("El modelo es requerido");
      openSectionAndScroll('vehicle');
      return false;
    }

    if (
      !kmNoMarca &&
      kmCurrent !== "" &&
      (Number.isNaN(Number(kmCurrent)) || Number(kmCurrent) <= 0)
    ) {
      setFieldError('kmCurrent', "Los kilómetros deben ser mayores a 0");
      setFormError("Los kilómetros deben ser mayores a 0");
      openSectionAndScroll('inspection');
      return false;
    }

    // Montados: validate checklist completeness
    if (branch === "montados") {
      const unanswered = [...FRONT_QUESTIONS, ...REAR_QUESTIONS].filter(
        (q) => answers.get(q.key)?.answer === undefined,
      );
      if (unanswered.length > 0) {
        setFieldError('checklist', `Faltan ${unanswered.length} preguntas por responder`);
        setFormError(
          `Faltan responder ${unanswered.length} preguntas del checklist`,
        );
        // Open the first checklist section that has unanswered questions
        const frontUnanswered = FRONT_QUESTIONS.filter(
          (q) => answers.get(q.key)?.answer === undefined,
        );
        openSectionAndScroll(frontUnanswered.length > 0 ? 'checklist-front' : 'checklist-rear');
        return false;
      }
    }

    // Signature required for both montados and desmontados branches
    if (!signature) {
      setFieldError('signature', "La firma del propietario es obligatoria");
      setFormError("La firma del propietario es obligatoria");
      openSectionAndScroll('signature');
      return false;
    }

    // Desmontados: must have at least one cylinder
    if (branch === "desmontados" && cylinders.length === 0) {
      setFieldError('cylinders', "Debe agregar al menos un cilindro");
      setFormError("Debe agregar al menos un cilindro");
      openSectionAndScroll('cylinders');
      return false;
    }

    // Cylinder completeness
    const incompleteCyl = cylinders.some(
      (c) => !c.brand || !c.capacity || !c.initialSerial || !c.manufactureDate || !c.location,
    );
    if (incompleteCyl) {
      setFieldError('cylinders', "Complete todos los campos de los cilindros o elimínelos");
      setFormError("Complete todos los campos de los cilindros o elimínelos");
      openSectionAndScroll('cylinders');
      return false;
    }

    return true;
  };

  // ── Submit ──────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validate()) {
      return; // formError is set by validate()
    }

    // ── Pre-submit size guard ──
    // Videos are NOT included here (they travel through the queue).
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

    // Create a fresh FormData to ensure we control exactly what's sent
    const submitData = new FormData();

    // Branch
    submitData.set("branch", branch);

    // Owner
    if (foundOwner) {
      submitData.set("existingOwnerDocumentId", foundOwner.documentId);
    }
    submitData.set("documentType", ownerDocumentType);
    submitData.set("documentNumber", ownerDocumentNumber);
    submitData.set("fullName", ownerFullName);
    if (ownerPhone) submitData.set("phone", ownerPhone);
    if (ownerEmail) submitData.set("email", ownerEmail);

    // Vehicle
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

    // Inspection
    if (!kmNoMarca) submitData.set("kmCurrent", kmCurrent);
    if (observations) submitData.set("observations", observations);

    // Answers (montados)
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

    // Signature — required for both montados and desmontados branches
    submitData.set("signature", signature);

    // Cylinders
    if (cylinders.length > 0) {
      submitData.set("cylinders", JSON.stringify(cylinders));
    }

    // Vehicle documents
    if (cedulaFile) {
      submitData.set("cedula", cedulaFile);
    }
    if (carnetFile) {
      submitData.set("carnet", carnetFile);
    }

    // Photos - collect from PhotoUpload via ref (avoids DataTransfer issues on Safari)
    // NOTE: videos are excluded — they travel through the background queue.
    for (const file of photos) {
      if (file && file.size > 0) {
        submitData.append("photos", file);
      }
    }

    // Arm shared watchdog (size-scaled timer + offline banner).
    armWatchdog(payloadFiles);

    await formAction(submitData);
  };

  // ── Draft banner: discard action ──────────────────────────────
  // Resets every local state back to its default AND clears the draft
  // from localStorage + IDB.
  //
  // PhotoUpload and SignaturePad are uncontrolled (they own their previews /
  // canvas), so resetting our state is not enough to clear what the user sees.
  // Bumping `draftEpoch` changes their `key`, which remounts them clean.
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
  };

  // ── Success State ───────────────────────────────────────────
  // Clear the draft on success (regardless of videos — P0-5 fix). Mark the
  // effect idempotent via `createdInspectionId` so a re-render with the same
  // success state does not enqueue the same videos twice.
  //
  // StrictMode dev double-effect guard: React 19 StrictMode runs effects
  // twice. Run 1 enqueues videos + empties pendingVideosRef; run 2 would see
  // videos=[] and skip the video-branch. `successHandledRef` is set
  // synchronously on first run so run 2 is a safe no-op.
  const successHandledRef = useRef(false);
  useEffect(() => {
    if (!state?.success) return;
    if (createdInspectionId) return; // already handled (state-driven idempotency)
    if (successHandledRef.current) return; // StrictMode run 2
    successHandledRef.current = true;

    // Clear watchdog + draft.
    resetWatchdog();
    clearDraft();

    const inspectionId = state.data?.inspectionId;
    const videos = pendingVideosRef.current;

    if (inspectionId && videos.length > 0) {
      // Enqueue videos into the background queue. The queue runs async;
      // we stay on this page to show live progress.
      const category = branch === "montados" ? "initial" : "removal";
      for (const file of videos) {
        videoQueue.enqueue(inspectionId, category, file);
      }
      setPendingVideos([]);
      pendingVideosRef.current = [];
      setCreatedInspectionId(inspectionId);
    }
  }, [state?.success, clearDraft, branch, createdInspectionId, resetWatchdog]);

  // Disarm the watchdog ONLY when `pending` transitions from true → false.
  //
  // The previous version watched both `pending` and `state`, which was broken:
  // on a resubmit after a settled server error, useActionState still holds the
  // STALE truthy state, so this effect re-ran and instantly reset the freshly
  // armed watchdog — every retry ran unprotected. Pending-edge detection (via
  // `wasPendingRef`) is the honest signal: the watchdog is armed at submit
  // start and disarmed at submit end.
  const wasPendingRef = useRef(false);
  useEffect(() => {
    if (wasPendingRef.current && !pending) {
      resetWatchdog();
    }
    wasPendingRef.current = pending;
  }, [pending, resetWatchdog]);

  // Plain success (no pending videos) — show the success card (user navigates
  // manually via the buttons; there is no router.push here).
  if (state?.success && !createdInspectionId) {
    return (
      <Card className="max-w-2xl mx-auto mt-8">
        <CardContent className="p-12 text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600" />
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
        </CardContent>
      </Card>
    );
  }

  // Success + videos pending — stay on page, delegate to shared view.
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {/* ── Draft restoration banner ────────────────────────── */}
      <AnimatePresence>
        {hasDraft && restored && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20 p-4">
              <div className="shrink-0 w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                <Save className="w-4 h-4 text-amber-700 dark:text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                  Borrador restaurado
                </p>
                <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                  Tenías datos sin enviar guardados {formatDraftAge(restored.savedAt)}
                  . Los restauramos para que continúes donde lo dejaste.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={discardDraft}
                className="shrink-0 text-amber-900 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-900/40"
              >
                Descartar
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Branch Toggle ──────────────────────────────────── */}
      <Card>
        <CardContent className="p-6">
          <Label className="text-base font-semibold mb-3 block">
            Tipo de Ingreso
          </Label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => {
                setBranch("montados");
                setFormError(null);
              }}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                branch === "montados"
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-3 h-3 rounded-full border-2 ${
                    branch === "montados"
                      ? "bg-primary border-primary"
                      : "border-muted-foreground"
                  }`}
                />
                <div>
                  <div className="font-semibold">Cilindros Montados</div>
                  <div className="text-sm text-muted-foreground">
                    Inspección completa con checklist, fotos y firma
                  </div>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setBranch("desmontados");
                setFormError(null);
              }}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                branch === "desmontados"
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-3 h-3 rounded-full border-2 ${
                    branch === "desmontados"
                      ? "bg-primary border-primary"
                      : "border-muted-foreground"
                  }`}
                />
                <div>
                  <div className="font-semibold">Cilindros Desmontados</div>
                  <div className="text-sm text-muted-foreground">
                    Solo vehículo y cilindros (sin checklist)
                  </div>
                </div>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* ── Owner Section ────────────────────────────────────── */}
      <CollapsibleSection
        id="owner"
        title="Propietario"
        icon={<User className="w-5 h-5 text-primary" />}
        isOpen={openSections.has('owner')}
        onToggle={handleSectionToggle}
      >
        <CardContent className="space-y-4">
          {/* Owner SearchableSelect */}
          <div className="flex gap-2 items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="ownerSelect">Propietario existente</Label>
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
              {owners.length === 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  No hay propietarios registrados. Complete los datos abajo para
                  crear uno nuevo.
                </p>
              )}
            </div>
            {selectedOwnerId && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={clearOwnerLookup}
                className="mb-0.5 text-red-500"
                title="Crear propietario nuevo"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
          {fieldErrors.owner && (
            <p className="text-sm text-destructive -mt-2" role="alert">{fieldErrors.owner}</p>
          )}

          {/* Nombre Completo */}
          <div className="space-y-2">
            <Label htmlFor="fullName">Nombre Completo</Label>
            <Input
              id="fullName"
              name="fullName"
              value={ownerFullName}
              onChange={(e) => setOwnerFullName(e.target.value)}
              disabled={pending || !!foundOwner}
              placeholder="Nombre y apellido"
            />
          </div>

          {/*Contenedor Tipo Doc, Nro Documento y Telefono*/}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/*Contenedor Tipo Doc y Número Doc*/}
            <div className="grid grid-cols-3 gap-2 md:col-span-3">
              {/*Tipo Doc*/}
              <div className="space-y-2 md:col-span-1">
                <Label htmlFor="documentType">Tipo Doc.</Label>
                <select
                  id="documentType"
                  name="documentType"
                  value={ownerDocumentType}
                  onChange={(e) => setOwnerDocumentType(e.target.value)}
                  disabled={pending || !!foundOwner}
                  className="flex h-10 w-full rounded-lg border border-input bg-input-bg px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="V">V</option>
                  <option value="E">E</option>
                  <option value="J">J</option>
                </select>
              </div>

              {/*Número Doc*/}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="documentNumber">Número de Documento</Label>
                <Input
                  id="documentNumber"
                  name="documentNumber"
                  value={ownerDocumentNumber}
                  onChange={(e) => setOwnerDocumentNumber(e.target.value)}
                  disabled={pending || !!foundOwner}
                  placeholder="12345678"
                />
              </div>
            </div>

            {/* Teléfono */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                name="phone"
                value={ownerPhone}
                onChange={(e) => setOwnerPhone(e.target.value)}
                disabled={pending || !!foundOwner}
                placeholder="0414-1234567"
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="text"
              inputMode="email"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              disabled={pending || !!foundOwner}
              placeholder="correo@ejemplo.com"
            />
          </div>
        </CardContent>
      </CollapsibleSection>

      {/* ── Vehicle Section ──────────────────────────────────── */}
      <CollapsibleSection
        id="vehicle"
        title="Vehículo"
        icon={<Truck className="w-5 h-5 text-primary" />}
        isOpen={openSections.has('vehicle')}
        onToggle={handleSectionToggle}
      >
        <CardContent className="space-y-4">
          {/* Vehicle SearchableSelect */}
          <div className="flex gap-2 items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="vehicleSelect">Vehículo existente</Label>
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
              {vehicles.length === 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  No hay vehículos registrados. Complete los datos abajo para
                  crear uno nuevo.
                </p>
              )}
            </div>
            {selectedVehicleId && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={clearVehicleLookup}
                className="mb-0.5 text-red-500"
                title="Crear vehículo nuevo"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Contenedor Tipo, Marca y Modelo*/}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Tipo */}
            <div className="space-y-2">
              <Label htmlFor="vehicleType">Tipo</Label>
              <Select value={vehicleType} onValueChange={setVehicleType}>
                <SelectTrigger
                  disabled={pending || !!foundVehicle}
                  className="flex h-10 w-full rounded-lg border border-input bg-input-bg px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
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

            {/* Marca */}
            <div className="space-y-2">
              <Label htmlFor="brand">Marca</Label>
              <Input
                id="brand"
                name="brand"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                disabled={pending || !!foundVehicle}
                placeholder="Marca"
              />
              {fieldErrors.brand && (
                <p className="text-sm text-destructive" role="alert">{fieldErrors.brand}</p>
              )}
            </div>

            {/* Modelo */}
            <div className="space-y-2">
              <Label htmlFor="model">Modelo</Label>
              <Input
                id="model"
                name="model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                disabled={pending || !!foundVehicle}
                placeholder="Modelo"
              />
              {fieldErrors.model && (
                <p className="text-sm text-destructive" role="alert">{fieldErrors.model}</p>
              )}
            </div>
          </div>

          {/* Contenedor Placa y Código Único GNC */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Placa */}
            <div className="space-y-2">
              <Label htmlFor="licensePlate">Placa</Label>
              <Input
                id="licensePlate"
                name="licensePlate"
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                disabled={pending || !!foundVehicle}
                maxLength={7}
                placeholder="Ej: A123BC4 o AB123C"
                aria-invalid={fieldErrors.licensePlate ? true : undefined}
                aria-describedby={fieldErrors.licensePlate ? 'licensePlate-error' : undefined}
              />
              {fieldErrors.licensePlate ? (
                <p id="licensePlate-error" className="text-sm text-destructive" role="alert">{fieldErrors.licensePlate}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  6 a 7 caracteres alfanuméricos (comienza con letra)
                </p>
              )}
            </div>

            {/* Código Único GNC */}
            <div className="space-y-2">
              <Label htmlFor="codigoUnicoGnc">Código Único GNC</Label>
              <Input
                id="codigoUnicoGnc"
                name="codigoUnicoGnc"
                value={codigoUnicoGnc}
                onChange={(e) =>
                  setCodigoUnicoGnc(e.target.value.toUpperCase())
                }
                maxLength={50}
                disabled={pending || !!foundVehicle}
                placeholder="Código Único GNC (Opcional)"
              />
            </div>
          </div>

          {/* Serial VIN */}
          <div className="space-y-2">
            <Label htmlFor="vinSerial">Serial VIN</Label>
            <Input
              id="vinSerial"
              name="vinSerial"
              value={vinSerial}
              onChange={(e) => setVinSerial(e.target.value.toUpperCase())}
              maxLength={50}
              disabled={pending || !!foundVehicle}
              placeholder="Ej: 1HGBH41JXMN109186"
            />
            <p className="text-xs text-muted-foreground">17 caracteres alfanuméricos (obligatorio)</p>
          </div>

          {/* Marca de KIT GNC */}
          <div className="space-y-2">
            <Label htmlFor="marcaKit">Marca de KIT GNC</Label>
            <Select value={marcaKit} onValueChange={setMarcaKit}>
              <SelectTrigger
                disabled={pending || !!foundVehicle}
                className="flex h-10 w-full rounded-lg border border-input bg-input-bg px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
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
        </CardContent>
      </CollapsibleSection>

      {/* ── Inspection Fields ─────────────────────────────────── */}
      <CollapsibleSection
        id="inspection"
        title="Datos de Inspección"
        icon={<ClipboardCheck className="w-5 h-5 text-amber-600" />}
        isOpen={openSections.has('inspection')}
        onToggle={handleSectionToggle}
      >
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="kmCurrent">Kilómetros Actuales</Label>
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={kmNoMarca}
                  onChange={(e) => {
                    setKmNoMarca(e.target.checked);
                    if (e.target.checked) setKmCurrent("");
                  }}
                  disabled={pending}
                  className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
                />
                No marca
              </label>
            </div>
            <Input
              id="kmCurrent"
              name="kmCurrent"
              type="number"
              min={1}
              value={kmNoMarca ? "" : kmCurrent}
              onChange={(e) => setKmCurrent(e.target.value)}
              disabled={pending || kmNoMarca}
              placeholder={kmNoMarca ? "No marca (N/M)" : "Ej: 45000 (Opcional)"}
              aria-invalid={fieldErrors.kmCurrent ? true : undefined}
              aria-describedby={fieldErrors.kmCurrent ? 'kmCurrent-error' : undefined}
            />
            {fieldErrors.kmCurrent ? (
              <p id="kmCurrent-error" className="text-sm text-destructive" role="alert">{fieldErrors.kmCurrent}</p>
            ) : (
              <p className="text-xs text-muted-foreground">Opcional</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="observations">Observaciones</Label>
            <Textarea
              id="observations"
              name="observations"
              rows={3}
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              disabled={pending}
              placeholder="Notas adicionales..."
            />
          </div>
        </CardContent>
      </CollapsibleSection>

      {/* ── Checklist (Montados only) ─────────────────────────── */}
      {branch === "montados" && (
        <>
          {/* Front Questions */}
          <CollapsibleSection
            id="checklist-front"
            title="Checklist - Frente"
            isOpen={openSections.has('checklist-front')}
            onToggle={handleSectionToggle}
          >
            {fieldErrors.checklist && (
              <div className="px-4 pb-2">
                <p className="text-sm text-destructive" role="alert">{fieldErrors.checklist}</p>
              </div>
            )}
            <ChecklistSection
              title="Checklist - Frente"
              questions={FRONT_QUESTIONS}
              answers={answers}
              setAnswer={setAnswer}
              setObservation={setObservation}
              disabled={pending}
            />
          </CollapsibleSection>

          {/* Rear Questions */}
          <CollapsibleSection
            id="checklist-rear"
            title="Checklist - Parte Trasera"
            isOpen={openSections.has('checklist-rear')}
            onToggle={handleSectionToggle}
          >
            <ChecklistSection
              title="Checklist - Parte Trasera"
              questions={REAR_QUESTIONS}
              answers={answers}
              setAnswer={setAnswer}
              setObservation={setObservation}
              disabled={pending}
            />
          </CollapsibleSection>
        </>
      )}

      {/* ── Cylinders (both paths) ─────────────────────────────── */}
      <CollapsibleSection
        id="cylinders"
        title="Cilindros GNC"
        icon={<Database className="w-5 h-5 text-indigo-600" />}
        isOpen={openSections.has('cylinders')}
        onToggle={handleSectionToggle}
      >
        {fieldErrors.cylinders && (
          <div className="px-4 pb-2">
            <p className="text-sm text-destructive" role="alert">{fieldErrors.cylinders}</p>
          </div>
        )}
        <CardContent className="space-y-4">
          {cylinders.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-xl">
              {branch === "montados"
                ? "No hay cilindros registrados. Puede continuar sin ellos."
                : "Agregue al menos un cilindro desmontado."}
            </div>
          ) : (
            <div className="space-y-4">
              {cylinders.map((cyl, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-muted/30 border border-border rounded-xl space-y-4 relative"
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => removeCylinder(idx)}
                    disabled={pending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <h4 className="font-medium text-sm">Cilindro #{idx + 1}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Marca</Label>
                      <Select
                        value={cyl.brand}
                        onValueChange={(val) =>
                          updateCylinder(idx, "brand", val)
                        }
                      >
                        <SelectTrigger
                          disabled={pending}
                          className="flex h-10 w-full rounded-lg border border-input bg-input-bg px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <SelectValue placeholder="Seleccione marca" />
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
                    <div className="space-y-2">
                      <Label>Capacidad (L)</Label>
                      <Select
                        value={cyl.capacity}
                        onValueChange={(val) =>
                          updateCylinder(idx, "capacity", val)
                        }
                      >
                        <SelectTrigger
                          disabled={pending}
                          className="flex h-10 w-full rounded-lg border border-input bg-input-bg px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <SelectValue placeholder="Seleccione capacidad" />
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
                    <div className="space-y-2">
                      <Label>N° Serie</Label>
                      <Input
                        value={cyl.initialSerial}
                        onChange={(e) =>
                          updateCylinder(idx, "initialSerial", e.target.value.toUpperCase())
                        }
                        disabled={pending}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Fecha de Prueba</Label>
                      <MonthYearPicker
                        value={cyl.manufactureDate}
                        onChange={(val) =>
                          updateCylinder(idx, "manufactureDate", val)
                        }
                        disabled={pending}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Ubicación</Label>
                      <Select
                        value={cyl.location}
                        onValueChange={(val) =>
                          updateCylinder(idx, "location", val)
                        }
                      >
                        <SelectTrigger
                          disabled={pending}
                          className="flex h-10 w-full rounded-lg border border-input bg-input-bg px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <SelectValue placeholder="Seleccione ubicación" />
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
        </CardContent>
      </CollapsibleSection>

      {/* Photos */}
      <CollapsibleSection
        id="photos"
        title="Fotografías"
        icon={<Camera className="w-5 h-5 text-violet-600" />}
        isOpen={openSections.has('photos')}
        onToggle={handleSectionToggle}
      >
        <CardContent>
          {filesReady && (
            <PhotoUpload
              key={`photos-${draftEpoch}`}
              category="initial"
              label="Fotos de inspección inicial"
              onFilesChange={handlePhotosChange}
              onVideosSelected={handleVideosSelected}
              initialFiles={draftFiles.photos}
            />
          )}
        </CardContent>
      </CollapsibleSection>

      {/* ── Signature (both montados and desmontados) ── */}
      <CollapsibleSection
        id="signature"
        title="Firma del Propietario"
        icon={<PenLine className="w-5 h-5 text-rose-600" />}
        isOpen={openSections.has('signature')}
        onToggle={handleSectionToggle}
      >
        <CardContent>
          {filesReady && (
            <SignaturePad
              key={`sig-${draftEpoch}`}
              onChange={setSignature}
              disabled={pending}
              initialValue={restored?.signature}
            />
          )}
          {fieldErrors.signature && (
            <p className="text-sm text-destructive mt-1" role="alert">{fieldErrors.signature}</p>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            Esta firma quedará registrada como constancia de la inspección.
          </p>
        </CardContent>
      </CollapsibleSection>

      {/* ── Vehicle Documents (both paths) ─────────────────────── */}
      <CollapsibleSection
        id="documents"
        title="Documentos del Vehículo"
        icon={<FileText className="w-5 h-5 text-teal-600" />}
        isOpen={openSections.has('documents')}
        onToggle={handleSectionToggle}
      >
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cédula */}
            <div className="space-y-2">
              <Label>Cédula del Vehículo</Label>
              <div className="flex flex-col gap-2">
                {cedulaFile && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-teal-200 bg-teal-50 dark:bg-teal-900/20">
                    <FileText className="w-4 h-4 text-teal-600 shrink-0" />
                    <span className="text-sm text-teal-700 dark:text-teal-300 truncate flex-1">
                      {cedulaFile.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCedulaChange(null)}
                      className="text-muted-foreground hover:text-red-500 transition-colors shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => cedulaInputRef.current?.click()}
                    disabled={pending}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-dashed border-border hover:border-teal-400 hover:bg-teal-50/50 dark:hover:bg-teal-900/10 cursor-pointer transition-all text-sm text-muted-foreground"
                  >
                    <FileText className="w-4 h-4" />
                    {cedulaFile ? "Reemplazar archivo" : "Seleccionar archivo"}
                  </button>
                  <input
                    ref={cedulaInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    className="sr-only"
                    onChange={(e) =>
                      handleCedulaChange(e.target.files?.[0] || null)
                    }
                    disabled={pending}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setScannerOpen("cedula")}
                    disabled={pending}
                    className="gap-1.5 border-teal-200 text-teal-700 hover:bg-teal-50"
                    title="Escanear documento con la cámara"
                  >
                    <ScanLine className="w-4 h-4" />
                    Escanear
                  </Button>
                </div>
              </div>
            </div>

            {/* Carnet */}
            <div className="space-y-2">
              <Label>Carnet de Circulación</Label>
              <div className="flex flex-col gap-2">
                {carnetFile && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-teal-200 bg-teal-50 dark:bg-teal-900/20">
                    <FileText className="w-4 h-4 text-teal-600 shrink-0" />
                    <span className="text-sm text-teal-700 dark:text-teal-300 truncate flex-1">
                      {carnetFile.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCarnetChange(null)}
                      className="text-muted-foreground hover:text-red-500 transition-colors shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => carnetInputRef.current?.click()}
                    disabled={pending}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-dashed border-border hover:border-teal-400 hover:bg-teal-50/50 dark:hover:bg-teal-900/10 cursor-pointer transition-all text-sm text-muted-foreground"
                  >
                    <FileText className="w-4 h-4" />
                    {carnetFile ? "Reemplazar archivo" : "Seleccionar archivo"}
                  </button>
                  <input
                    ref={carnetInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    className="sr-only"
                    onChange={(e) =>
                      handleCarnetChange(e.target.files?.[0] || null)
                    }
                    disabled={pending}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setScannerOpen("carnet")}
                    disabled={pending}
                    className="gap-1.5 border-teal-200 text-teal-700 hover:bg-teal-50"
                    title="Escanear documento con la cámara"
                  >
                    <ScanLine className="w-4 h-4" />
                    Escanear
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </CollapsibleSection>

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

      {/* ── Error Messages (above submit) ──────────────────────── */}
      <AnimatePresence>
        {(state?.error || formError) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
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

      {/* ── Submit  ────────────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/inspections")}
          disabled={pending}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 min-w-[200px]"
        >
          {pending ? (
            <div className="flex items-center gap-2">
              <svg
                className="animate-spin h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
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
    </form>
  );
}

// ─── Checklist Section Sub-component ─────────────────────────────────
interface ChecklistSectionProps {
  title: string;
  questions: ChecklistQuestion[];
  answers: Map<string, AnswerState>;
  setAnswer: (key: string, answer: boolean | null) => void;
  setObservation: (key: string, obs: string) => void;
  disabled: boolean;
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
          const current = answers.get(q.key) ?? {
            answer: undefined,
            observations: "",
          };

          return (
            <motion.div
              key={q.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="rounded-xl border border-border bg-secondary/30 p-4"
            >
              <div className="flex items-start gap-3">
                <span className="shrink-0 w-7 h-7 rounded-lg bg-primary/20 text-primary text-xs font-semibold flex items-center justify-center mt-0.5">
                  {idx + 1}
                </span>

                <div className="flex-1 space-y-3">
                  <p className="text-sm font-medium text-foreground">
                    {q.label}
                  </p>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAnswer(q.key, true)}
                      disabled={disabled}
                      className={`relative flex-1 flex items-center justify-center gap-1.5 px-3 py-3 rounded-xl border text-sm font-medium cursor-pointer transition-all duration-200 ${
                        current.answer === true
                          ? "bg-primary/10 border-primary text-primary dark:bg-primary/20 dark:border-primary dark:text-primary shadow-sm"
                          : "bg-background border-border text-muted-foreground hover:border-primary/30 hover:text-primary"
                      }`}
                    >
                      <span
                        className={`w-2.5 h-2.5 rounded-full transition-colors ${current.answer === true ? "bg-primary" : "bg-muted"}`}
                      />
                      Sí
                    </button>

                    <button
                      type="button"
                      onClick={() => setAnswer(q.key, false)}
                      disabled={disabled}
                      className={`relative flex-1 flex items-center justify-center gap-1.5 px-3 py-3 rounded-xl border text-sm font-medium cursor-pointer transition-all duration-200 ${
                        current.answer === false
                          ? "bg-red-50 border-red-300 text-red-700 dark:bg-red-900/20 dark:border-red-700 dark:text-red-400 shadow-sm"
                          : "bg-background border-border text-muted-foreground hover:border-red-200 hover:text-red-600"
                      }`}
                    >
                      <span
                        className={`w-2.5 h-2.5 rounded-full transition-colors ${current.answer === false ? "bg-red-500" : "bg-muted"}`}
                      />
                      No
                    </button>

                    <button
                      type="button"
                      onClick={() => setAnswer(q.key, null)}
                      disabled={disabled}
                      className={`relative flex-1 flex items-center justify-center gap-1.5 px-3 py-3 rounded-xl border text-sm font-medium cursor-pointer transition-all duration-200 ${
                        current.answer === null
                          ? "bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-400 shadow-sm"
                          : "bg-background border-border text-muted-foreground hover:border-amber-200 hover:text-amber-600"
                      }`}
                    >
                      <span
                        className={`w-2.5 h-2.5 rounded-full transition-colors ${current.answer === null ? "bg-amber-500" : "bg-muted"}`}
                      />
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
          );
        })}
      </CardContent>
    </div>
  );
}
