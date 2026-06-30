export const TOURNAMENT_STEP_LABELS = ['Configuración', 'Resumen'] as const;

export const TOURNAMENT_CONSTANTS = {
  MAX_PARTICIPANTS: 128,
  DEFAULT_ROUND_DURATION: 30,
  MAX_ROUND_DURATION: 480,
} as const;

export const CALENDAR_POPUP = {
  WIDTH: 340,
  HEIGHT: 360,
} as const;

export const ELIMINATION_OPTIONS = [
  {
    value: 'Eliminación Sencilla' as const,
    label: 'Eliminación Sencilla',
    description: 'Un solo partido por ronda. La derrota elimina al jugador.',
  },
  {
    value: 'Eliminación Doble' as const,
    label: 'Eliminación Doble',
    description: 'Los jugadores tienen dos oportunidades antes de ser eliminados.',
  },
  {
    value: 'Round Robin' as const,
    label: 'Round Robin',
    description: 'Todos contra todos. Clasifica por puntos acumulados.',
  },
  {
    value: 'Swiss' as const,
    label: 'Swiss',
    description: 'Emparejamientos dinámicos por rendimiento. Sin eliminación directa.',
  },
] as const;

export const DEFAULT_FORM_VALUES = {
  name: '',
  elimination_type: 'Eliminación Sencilla' as const,
  rounds: 3,
  participant_target: undefined,
  round_duration_minutes: undefined,
  uses_score: false,
  game_name: '',
  game_category: '',
  language: '',
  region: '',
  start_date: '',
  end_date: '',
} as const;
