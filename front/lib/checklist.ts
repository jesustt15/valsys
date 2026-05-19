export interface ChecklistQuestion {
  section: 'front' | 'rear'
  key: string
  label: string
}

export const FRONT_QUESTIONS: ChecklistQuestion[] = [
  { section: 'front', key: 'front_chassis', label: 'Chasis — sin fisuras, deformaciones o corrosión' },
  { section: 'front', key: 'front_suspension', label: 'Suspensión delantera — estado de amortiguadores' },
  { section: 'front', key: 'front_brakes', label: 'Frenos delanteros — pastillas, discos, líquido' },
  { section: 'front', key: 'front_steering', label: 'Dirección — juego libre, terminales, caja' },
  { section: 'front', key: 'front_lights', label: 'Luces delanteras — altas, bajas, giro, niebla' },
  { section: 'front', key: 'front_windshield', label: 'Parabrisas — sin grietas, buena visibilidad' },
  { section: 'front', key: 'front_wipers', label: 'Limpiaparabrisas — funcionamiento, estado' },
  { section: 'front', key: 'front_horn', label: 'Bocina — funcionamiento' },
  { section: 'front', key: 'front_mirrors', label: 'Espejos retrovisores — presentes y funcionales' },
  { section: 'front', key: 'front_seatbelts', label: 'Cinturones de seguridad — estado y anclaje' },
]

export const REAR_QUESTIONS: ChecklistQuestion[] = [
  { section: 'rear', key: 'rear_chassis', label: 'Chasis trasero — sin fisuras, deformaciones' },
  { section: 'rear', key: 'rear_suspension', label: 'Suspensión trasera — ballestas, amortiguadores' },
  { section: 'rear', key: 'rear_brakes', label: 'Frenos traseros — tambores/discos, líquido' },
  { section: 'rear', key: 'rear_lights', label: 'Luces traseras — freno, giro, reversa, patente' },
  { section: 'rear', key: 'rear_tires', label: 'Neumáticos traseros — profundidad, desgaste' },
  { section: 'rear', key: 'rear_exhaust', label: 'Escape — sin fugas, soportes' },
  { section: 'rear', key: 'rear_license_plate', label: 'Patente — visible, legible, bien fijada' },
  { section: 'rear', key: 'rear_cylinder_mounts', label: 'Soportes de cilindros — estado, fijación' },
  { section: 'rear', key: 'rear_valves_lines', label: 'Válvulas y líneas — sin fugas, correcto estado' },
  { section: 'rear', key: 'rear_ground_clearance', label: 'Distancia al suelo — dentro de parámetros' },
]

export const ALL_QUESTIONS: ChecklistQuestion[] = [...FRONT_QUESTIONS, ...REAR_QUESTIONS]
