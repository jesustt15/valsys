export interface ChecklistQuestion {
  section: 'front' | 'rear'
  key: string
  label: string
}

export const FRONT_QUESTIONS: ChecklistQuestion[] = [
  { section: 'front', key: 'front_fuel_selector', label: 'Selector de Combustible' },
  { section: 'front', key: 'front_ecu', label: 'ECU (Eje y Funcionamiento)' },
  { section: 'front', key: 'front_regulator', label: 'Regulador (Fijación y Funcionamiento)' },
  { section: 'front', key: 'front_injectors', label: 'Inyectores (Fijación y Funcionamiento)' },
  { section: 'front', key: 'front_fill_valve', label: 'Pico de Carga (Fijación y Funcionamiento)' },
  { section: 'front', key: 'front_pressure_gauge', label: 'Manómetro (Funcionamiento y Fijación)' },
  { section: 'front', key: 'front_stainless_pipe', label: 'Tubería en Acero Inoxidable' },
  { section: 'front', key: 'front_docs', label: 'Cédula y Título del Vehículo' },
  { section: 'front', key: 'front_valve_thread', label: 'Revisión de Rosca de Cada Válvula' },
  { section: 'front', key: 'front_connection_thread', label: 'Revisión de Rosca de Cada Conexión' },
]

export const REAR_QUESTIONS: ChecklistQuestion[] = [
  { section: 'rear', key: 'rear_leak', label: 'Fuga' },
  { section: 'rear', key: 'rear_cradle_movement', label: 'Movimiento Cuna' },
  { section: 'rear', key: 'rear_grade8_bolts', label: 'Tornillos Grado 8' },
  { section: 'rear', key: 'rear_cylinder', label: 'Cilindro' },
  { section: 'rear', key: 'rear_cradle', label: 'Cuna' },
  { section: 'rear', key: 'rear_corrosion', label: 'Corrosión' },
  { section: 'rear', key: 'rear_cylinder_valve', label: 'Válvula Cilindro (Abre/Cierra)' },
  { section: 'rear', key: 'rear_straps', label: 'Flejes sin soldadura y con aislante 360° del cilindro' },
  { section: 'rear', key: 'rear_piping', label: 'Tubería (rabo de cochino y grapas cada 60 cm)' },
]

export const ALL_QUESTIONS: ChecklistQuestion[] = [...FRONT_QUESTIONS, ...REAR_QUESTIONS]
