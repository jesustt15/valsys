export interface ChecklistQuestion {
  section: 'front' | 'rear'
  key: string
  label: string
}

export const FRONT_QUESTIONS: ChecklistQuestion[] = [
  { section: 'front', key: 'Selector de Combustible', label: 'Selector de Combustible' },
  { section: 'front', key: 'ECU (Fijación y Funcionamiento)', label: 'ECU (Fijación y Funcionamiento)' },
  { section: 'front', key: 'Regulador (Fijación y Funcionamiento)', label: 'Regulador (Fijación y Funcionamiento)' },
  { section: 'front', key: 'Inyectores (Fijación y Funcionamiento)', label: 'Inyectores (Fijación y Funcionamiento)' },
  { section: 'front', key: 'Pico de Carga (Fijación y Funcionamiento)', label: 'Pico de Carga (Fijación y Funcionamiento)' },
  { section: 'front', key: 'Manómetro (Funcionamiento y Fijación)', label: 'Manómetro (Funcionamiento y Fijación)' },
  { section: 'front', key: 'Tubería en Acero Inoxidable', label: 'Tubería en Acero Inoxidable' },
  { section: 'front', key: 'Cédula y Título del Vehículo', label: 'Cédula y Título del Vehículo' },
  { section: 'front', key: 'Revisión de Rosca de Cada Válvula', label: 'Revisión de Rosca de Cada Válvula' },
  { section: 'front', key: 'Revisión de Rosca de Cada Conexión', label: 'Revisión de Rosca de Cada Conexión' },
]

export const REAR_QUESTIONS: ChecklistQuestion[] = [
  { section: 'rear', key: 'Sin Fuga', label: 'Sin Fuga' },
  { section: 'rear', key: 'Sin Movimiento Cuna', label: 'Sin Movimiento Cuna' },
  { section: 'rear', key: 'Tornillos Grado 8', label: 'Tornillos Grado 8' },
  { section: 'rear', key: 'Cuna', label: 'Cuna' },
  { section: 'rear', key: 'Sin Corrosión', label: 'Sin Corrosión' },
  { section: 'rear', key: 'Válvula Cilindro (Abre/Cierra)', label: 'Válvula Cilindro (Abre/Cierra)' },
  { section: 'rear', key: 'Flejes sin soldadura y con aislante 360° del cilindro', label: 'Flejes sin soldadura y con aislante 360° del cilindro' },
  { section: 'rear', key: 'Tubería (rabo de cochino y grapas cada 60 cm)', label: 'Tubería (rabo de cochino y grapas cada 60 cm)' },
]

export const ALL_QUESTIONS: ChecklistQuestion[] = [...FRONT_QUESTIONS, ...REAR_QUESTIONS]
