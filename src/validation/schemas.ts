import { z } from 'zod';

export const TOURNAMENT_MIN_PARTICIPANTS = {
  'Eliminación Sencilla': 2,
  'Eliminación Doble': 4,
  'Round Robin': 3,
  Swiss: 4,
} as const;

export const TOURNAMENT_MAX_ROUNDS = {
  'Eliminación Sencilla': 7,
  'Eliminación Doble': 5,
  'Round Robin': 3,
  Swiss: 7,
} as const;

type TournamentFormat = keyof typeof TOURNAMENT_MIN_PARTICIPANTS;

const MAX_TOURNAMENT_PARTICIPANTS = 128;
const MAX_ROUND_DURATION_MINUTES = 480;

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const log2ceil = (value: number): number => Math.ceil(Math.log2(Math.max(1, value)));

export const getMinParticipantsForFormat = (format: TournamentFormat): number => TOURNAMENT_MIN_PARTICIPANTS[format];

export const getMaxRoundsForFormat = (format: TournamentFormat): number => TOURNAMENT_MAX_ROUNDS[format];

export const getSuggestedRoundsForConfig = (format: TournamentFormat, participantTarget?: number): number => {
  const participants = Math.max(getMinParticipantsForFormat(format), participantTarget ?? getMinParticipantsForFormat(format));

  if (format === 'Eliminación Sencilla') {
    return clamp(log2ceil(participants), 1, getMaxRoundsForFormat(format));
  }
  if (format === 'Eliminación Doble') {
    return clamp(log2ceil(participants) + 1, 1, getMaxRoundsForFormat(format));
  }
  if (format === 'Round Robin') {
    return getMaxRoundsForFormat(format);
  }
  return clamp(log2ceil(participants), 1, getMaxRoundsForFormat(format));
};

export const getParticipantRangeForRounds = (format: TournamentFormat, rounds: number): { min: number; max: number } => {
  const normalizedRounds = clamp(rounds, 1, getMaxRoundsForFormat(format));

  if (format === 'Eliminación Sencilla') {
    if (normalizedRounds === 1) return { min: 2, max: 2 };
    return {
      min: (2 ** (normalizedRounds - 1)) + 1,
      max: 2 ** normalizedRounds,
    };
  }

  if (format === 'Eliminación Doble') {
    if (normalizedRounds <= 3) return { min: 4, max: 4 };
    return {
      min: (2 ** (normalizedRounds - 2)) + 1,
      max: 2 ** (normalizedRounds - 1),
    };
  }

  return {
    min: getMinParticipantsForFormat(format),
    max: MAX_TOURNAMENT_PARTICIPANTS,
  };
};

export const getRoundRangeForParticipants = (format: TournamentFormat, participantTarget?: number): { min: number; max: number } => {
  const participants = Math.max(getMinParticipantsForFormat(format), participantTarget ?? getMinParticipantsForFormat(format));

  if (format === 'Eliminación Sencilla') {
    const exactRounds = clamp(log2ceil(participants), 1, getMaxRoundsForFormat(format));
    return { min: exactRounds, max: exactRounds };
  }

  if (format === 'Eliminación Doble') {
    const exactRounds = clamp(log2ceil(participants) + 1, 1, getMaxRoundsForFormat(format));
    return { min: exactRounds, max: exactRounds };
  }

  if (format === 'Round Robin') {
    return { min: 1, max: getMaxRoundsForFormat(format) };
  }

  return {
    min: 1,
    max: Math.min(getMaxRoundsForFormat(format), Math.max(1, participants - 1)),
  };
};

const USERNAME_PATTERN = /^[A-Za-z0-9]+$/;
const PASSWORD_LETTER = /[A-Za-z]/;
const PASSWORD_NUMBER = /[0-9]/;
const PASSWORD_SYMBOL = /[^A-Za-z0-9]/;

export const passwordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .refine((value) => PASSWORD_LETTER.test(value), 'La contraseña debe contener al menos una letra')
  .refine((value) => PASSWORD_NUMBER.test(value), 'La contraseña debe contener al menos un número')
  .refine((value) => PASSWORD_SYMBOL.test(value), 'La contraseña debe contener al menos un carácter especial');

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Ingresa tu usuario o correo electrónico'),
  password: z.string().min(1, 'Ingresa tu contraseña'),
});

export const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'El nombre de usuario debe tener entre 3 y 30 caracteres')
    .max(30, 'El nombre de usuario debe tener entre 3 y 30 caracteres')
    .regex(USERNAME_PATTERN, 'El nombre de usuario solo admite letras y números'),
  email: z.string().trim().email('Ingresa un correo electrónico válido'),
  password: passwordSchema,
});

const optionalPositiveInteger = (max?: number, maxMessage?: string) => z.preprocess(
  (value) => (value === '' || value === null || value === undefined ? undefined : Number(value)),
  (max !== undefined
    ? z.number({ error: 'Debe ser un número' }).int('Debe ser un número entero').positive('Debe ser mayor a 0').max(max, maxMessage ?? `Debe ser menor o igual a ${max}`).optional()
    : z.number({ error: 'Debe ser un número' }).int('Debe ser un número entero').positive('Debe ser mayor a 0').optional()),
);

const optionalTrimmedText = z.preprocess(
  (value) => {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  },
  z.string().optional(),
);

export const createTournamentSchema = z.object({
  name: z.string().trim().min(1, 'Ingresa el nombre del torneo'),
  elimination_type: z.enum(['Eliminación Sencilla', 'Eliminación Doble', 'Round Robin', 'Swiss']),
  rounds: z
    .number({ error: 'Las rondas deben ser un número' })
    .int('Las rondas deben ser un número entero')
    .positive('Las rondas deben ser mayores a 0'),
  participant_target: optionalPositiveInteger(MAX_TOURNAMENT_PARTICIPANTS, `Máximo ${MAX_TOURNAMENT_PARTICIPANTS} participantes`),
  round_duration_minutes: optionalPositiveInteger(MAX_ROUND_DURATION_MINUTES, `Máximo ${MAX_ROUND_DURATION_MINUTES} min por ronda`),
  uses_score: z.boolean().optional(),
  game_name: optionalTrimmedText,
  game_category: optionalTrimmedText,
  start_date: optionalTrimmedText,
  end_date: optionalTrimmedText,
  language: optionalTrimmedText,
  region: optionalTrimmedText,
}).superRefine((value, ctx) => {
  const format = value.elimination_type;
  const participantTarget = value.participant_target;
  const rounds = value.rounds;

  if (participantTarget !== undefined) {
    const minParticipants = getMinParticipantsForFormat(format);
    if (participantTarget < minParticipants) {
      ctx.addIssue({
        code: 'custom',
        path: ['participant_target'],
        message: `${format} requiere al menos ${minParticipants} participantes`,
      });
    }

    const participantRange = getParticipantRangeForRounds(format, rounds);
    if (participantTarget < participantRange.min || participantTarget > participantRange.max) {
      const participantMessage = participantRange.min === participantRange.max
        ? `${rounds} ronda(s) en ${format} solo admite ${participantRange.min} participante(s)`
        : `${rounds} ronda(s) en ${format} admite entre ${participantRange.min} y ${participantRange.max} participantes`;
      ctx.addIssue({
        code: 'custom',
        path: ['participant_target'],
        message: participantMessage,
      });
    }

    const roundRange = getRoundRangeForParticipants(format, participantTarget);
    if (rounds < roundRange.min || rounds > roundRange.max) {
      const roundMessage = roundRange.min === roundRange.max
        ? `Con ${participantTarget} participantes, ${format} usa ${roundRange.min} ronda(s)`
        : `Con ${participantTarget} participantes, ${format} permite entre ${roundRange.min} y ${roundRange.max} rondas`;
      ctx.addIssue({
        code: 'custom',
        path: ['rounds'],
        message: roundMessage,
      });
    }
  }

  if (value.start_date && value.end_date && value.end_date < value.start_date) {
    ctx.addIssue({
      code: 'custom',
      path: ['end_date'],
      message: 'La fecha de fin no puede ser anterior a la fecha de inicio',
    });
  }
});

export const passwordUpdateSchema = z
  .object({
    current_password: z.string().min(1, 'Ingresa tu contraseña actual'),
    password: passwordSchema,
    password_confirm: z.string().min(1, 'Confirma la contraseña'),
  })
  .refine((value) => value.password === value.password_confirm, {
    message: 'Las contraseñas no coinciden',
    path: ['password_confirm'],
  });

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type CreateTournamentFormInput = z.input<typeof createTournamentSchema>;
export type CreateTournamentFormValues = z.output<typeof createTournamentSchema>;
export type PasswordUpdateFormValues = z.infer<typeof passwordUpdateSchema>;
