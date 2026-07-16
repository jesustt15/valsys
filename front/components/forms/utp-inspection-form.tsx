"use client";

import { useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  FRONT_QUESTIONS,
  REAR_QUESTIONS,
  UTP_FRONT_QUESTIONS,
  UTP_REAR_QUESTIONS,
  type ChecklistQuestion,
} from "@/lib/checklist";
import {
  createUtpInspectionAction,
  type UtpFormState,
} from "@/lib/actions/utp";
import { PhotoUpload } from "@/components/inspections/photo-upload";
import { SignaturePad } from "@/components/inspections/signature-pad";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
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
} from "lucide-react";
import type { OwnerRecord } from "@/lib/services/owner";
import type { VehicleRecord } from "@/lib/services/vehicle";

interface UtpInspectionFormProps {
  owners: OwnerRecord[];
  vehicles: VehicleRecord[];
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
  status: "instalado";
}

// ─── Main Component ───────────────────────────────────────────────
export function UtpInspectionForm({
  owners,
  vehicles,
}: UtpInspectionFormProps) {
  const router = useRouter();

  const [state, formAction, pending] = useActionState<
    UtpFormState | null,
    FormData
  >(createUtpInspectionAction, null);

  // ── Form Error ──────────────────────────────────────────────
  const [formError, setFormError] = useState<string | null>(null);

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
  const [observations, setObservations] = useState("");

  // ── Checklist ───────────────────────────────────────────────
  const [answers, setAnswers] = useState<Map<string, AnswerState>>(() => {
    const map = new Map<string, AnswerState>();
    for (const q of [...UTP_FRONT_QUESTIONS, ...UTP_REAR_QUESTIONS]) {
      map.set(q.key, { answer: undefined, observations: "" });
    }
    return map;
  });

  // ── Signature ───────────────────────────────────────────────
  const [signature, setSignature] = useState("");

  // ── Cylinders ───────────────────────────────────────────────
  const [cylinders, setCylinders] = useState<CylinderEntry[]>([]);

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
        status: "instalado",
      },
    ]);
  };

  const updateCylinder = (
    idx: number,
    field: keyof CylinderEntry,
    value: string,
  ) => {
    setCylinders((prev) =>
      prev.map((cyl, i) => (i === idx ? { ...cyl, [field]: value } : cyl)),
    );
  };

  const removeCylinder = (idx: number) => {
    setCylinders(cylinders.filter((_, i) => i !== idx));
  };

  // ── Pre-submit validation ───────────────────────────────────
  const validate = (): boolean => {
    setFormError(null);

    // Owner validation
    if (!foundOwner && !ownerFullName.trim()) {
      setFormError(
        "Debe proporcionar un propietario (buscar existente o crear nuevo)",
      );
      return false;
    }

    // Vehicle validation
    if (!foundVehicle && !licensePlate.trim()) {
      setFormError("Debe proporcionar la placa del vehículo");
      return false;
    }

    if (
      !foundVehicle &&
      licensePlate.trim() &&
      !/^[A-Z][A-Z0-9]{5,6}$/.test(licensePlate.trim())
    ) {
      setFormError(
        "La placa debe comenzar con una letra y tener entre 6 y 7 caracteres alfanuméricos",
      );
      return false;
    }

    if (!foundVehicle && brand.trim() && brand.trim().length < 2) {
      setFormError("La marca debe tener al menos 2 caracteres");
      return false;
    }

    if (!foundVehicle && model.trim() && model.trim().length < 1) {
      setFormError("El modelo es requerido");
      return false;
    }

    if (
      kmCurrent !== "" &&
      (Number.isNaN(Number(kmCurrent)) || Number(kmCurrent) <= 0)
    ) {
      setFormError("Los kilómetros deben ser mayores a 0");
      return false;
    }

    // UTP always requires complete checklist
    const unanswered = [...UTP_FRONT_QUESTIONS, ...UTP_REAR_QUESTIONS].filter(
      (q) => answers.get(q.key)?.answer === undefined,
    );
    if (unanswered.length > 0) {
      setFormError(
        `Faltan responder ${unanswered.length} preguntas del checklist`,
      );
      return false;
    }

    // Signature required
    if (!signature) {
      setFormError("La firma del propietario es obligatoria");
      return false;
    }

    // Cylinder completeness (if any are present)
    const incompleteCyl = cylinders.some(
      (c) => !c.brand || !c.capacity || !c.initialSerial || !c.manufactureDate || !c.location,
    );
    if (incompleteCyl) {
      setFormError("Complete todos los campos de los cilindros o elimínelos");
      return false;
    }

    return true;
  };

  // ── Submit ──────────────────────────────────────────────────
  const handleSubmit = async (formData: FormData) => {
    if (!validate()) {
      return; // formError is set by validate()
    }

    // Create a fresh FormData to ensure we control exactly what's sent
    const submitData = new FormData();

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
    submitData.set("kmCurrent", kmCurrent);
    if (observations) submitData.set("observations", observations);

    // Answers (always required in UTP)
    const allQuestions = [...UTP_FRONT_QUESTIONS, ...UTP_REAR_QUESTIONS];
    const answersArray = allQuestions.map((q) => ({
      section: q.section,
      questionKey: q.key,
      answer: answers.get(q.key)?.answer ?? null,
      observations: answers.get(q.key)?.observations || undefined,
    }));
    submitData.set("answers", JSON.stringify(answersArray));

    // Signature
    submitData.set("signature", signature);

    // Cylinders
    if (cylinders.length > 0) {
      submitData.set("cylinders", JSON.stringify(cylinders));
    }

    // Photos - collect from all PhotoUpload inputs in the form
    const photos = formData.getAll("photos") as File[];
    for (const photo of photos) {
      if (photo && photo.size > 0) {
        submitData.append("photos", photo);
      }
    }

    formAction(submitData);
  };

  // ── Success State ───────────────────────────────────────────
  if (state?.success) {
    return (
      <Card className="max-w-2xl mx-auto mt-8">
        <CardContent className="p-12 text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold">Inspección UTP Creada</h2>
          <p className="text-muted-foreground">
            La inspección UTP se registró correctamente.
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <Button onClick={() => router.push("/utp")}>
              Ver Inspecciones UTP
            </Button>
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              Volver al Inicio
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-6" noValidate>
      {/* ── Error Messages ──────────────────────────────────── */}
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
      </AnimatePresence>

      {/* ── Owner Section ────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 dark:bg-primary/20 rounded-xl flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>Propietario</CardTitle>
              <CardDescription>
                {foundOwner
                  ? "Propietario existente seleccionado"
                  : "Ingrese los datos del propietario"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
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

          {/* Contenedor Tipo Doc, Nro Documento y Teléfono */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Contenedor Tipo Doc y Número Doc */}
            <div className="grid grid-cols-3 gap-2 md:col-span-3">
              {/* Tipo Doc */}
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

              {/* Número Doc */}
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
              type="email"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              disabled={pending || !!foundOwner}
              placeholder="correo@ejemplo.com"
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Vehicle Section ──────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 dark:bg-primary/20 rounded-xl flex items-center justify-center">
              <Truck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>Vehículo</CardTitle>
              <CardDescription>
                {foundVehicle
                  ? "Vehículo existente seleccionado"
                  : "Ingrese los datos del vehículo"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
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

          {/* Contenedor Tipo, Marca y Modelo */}
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
            </div>
          </div>

          {/* Contenedor Placa, Código Único GNC y VIN */}
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
              />
              <p className="text-xs text-muted-foreground">
                6 a 7 caracteres alfanuméricos (comienza con letra)
              </p>
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
                <SelectItem value="MAT">MAT</SelectItem>
                <SelectItem value="Tartarini">Tartarini</SelectItem>
                <SelectItem value="OMVL">OMVL</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ── Inspection Fields ─────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/20 rounded-xl flex items-center justify-center">
              <ClipboardCheck className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <CardTitle>Datos de Inspección</CardTitle>
              <CardDescription>
                Kilometraje y observaciones generales
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="kmCurrent">Kilómetros Actuales</Label>
            <Input
              id="kmCurrent"
              name="kmCurrent"
              type="number"
              min={1}
              value={kmCurrent}
              onChange={(e) => setKmCurrent(e.target.value)}
              disabled={pending}
              placeholder="Ej: 45000 (Opcional)"
            />
            <p className="text-xs text-muted-foreground">Opcional</p>
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
      </Card>

      {/* ── Checklist (always shown for UTP) ──────────────────── */}
      {/* Front Questions */}
      <Card>
        <ChecklistSection
          title="Checklist - Frente"
          questions={UTP_FRONT_QUESTIONS}
          answers={answers}
          setAnswer={setAnswer}
          setObservation={setObservation}
          disabled={pending}
        />
      </Card>

      {/* Rear Questions */}
      <Card>
        <ChecklistSection
          title="Checklist - Parte Trasera"
          questions={UTP_REAR_QUESTIONS}
          answers={answers}
          setAnswer={setAnswer}
          setObservation={setObservation}
          disabled={pending}
        />
      </Card>

      {/* ── Cylinders ──────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center">
                <Database className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <CardTitle>Cilindros GNC</CardTitle>
                <CardDescription>
                  Opcional: Registre los cilindros actuales del vehículo
                </CardDescription>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={addCylinder}
              disabled={pending}
            >
              <Plus className="w-4 h-4 mr-2" /> Añadir Cilindro
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {cylinders.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-xl">
              No hay cilindros registrados. Puede continuar sin ellos.
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
                  <h4 className="font-medium text-sm">
                    Cilindro #{idx + 1}
                  </h4>
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
                      <Label>Nº Serial</Label>
                      <Input
                        value={cyl.initialSerial}
                        onChange={(e) =>
                          updateCylinder(idx, "initialSerial", e.target.value)
                        }
                        disabled={pending}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Fecha de Prueba</Label>
                      <Input
                        type="date"
                        value={cyl.manufactureDate}
                        onChange={(e) =>
                          updateCylinder(idx, "manufactureDate", e.target.value)
                        }
                        disabled={pending}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Ubicación</Label>
                      <Input
                        value={cyl.location}
                        onChange={(e) =>
                          updateCylinder(idx, "location", e.target.value)
                        }
                        disabled={pending}
                        placeholder="Ej: Baúl"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Photos ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-50 dark:bg-violet-900/20 rounded-xl flex items-center justify-center">
              <Camera className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <CardTitle>Fotografías</CardTitle>
              <CardDescription>
                Fotos del estado actual del vehículo (opcional)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <PhotoUpload
            category="initial"
            label="Fotos de la inspección UTP"
          />
        </CardContent>
      </Card>

      {/* ── Signature ──────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-50 dark:bg-rose-900/20 rounded-xl flex items-center justify-center">
              <PenLine className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <CardTitle>Firma del Propietario</CardTitle>
              <CardDescription>
                El propietario debe firmar en la pantalla
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <SignaturePad onChange={setSignature} disabled={pending} />
          <p className="text-xs text-muted-foreground mt-2">
            Esta firma quedará registrada como constancia de la inspección.
          </p>
        </CardContent>
      </Card>

      {/* ── Submit ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/utp")}
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
              Crear Inspección UTP
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
