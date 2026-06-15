import { z } from 'zod';

const USERNAME_PATTERN = /^[A-Za-z0-9]+$/;
const PASSWORD_LETTER = /[A-Za-z]/;
const PASSWORD_NUMBER = /[0-9]/;
const PASSWORD_SYMBOL = /[^A-Za-z0-9]/;

const passwordSchema = z
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

const optionalPositiveInteger = z.preprocess(
  (value) => (value === '' || value === null || value === undefined ? undefined : Number(value)),
  z.number({ error: 'Debe ser un número' }).int('Debe ser un número entero').positive('Debe ser mayor a 0').optional(),
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
  participant_target: optionalPositiveInteger,
  round_duration_minutes: optionalPositiveInteger,
  game_name: optionalTrimmedText,
  game_category: optionalTrimmedText,
  start_date: optionalTrimmedText,
  end_date: optionalTrimmedText,
  language: optionalTrimmedText,
  region: optionalTrimmedText,
}).refine(
  (value) => {
    if (!value.start_date || !value.end_date) return true;
    return new Date(value.end_date) >= new Date(value.start_date);
  },
  {
    message: 'La fecha de fin no puede ser anterior a la fecha de inicio',
    path: ['end_date'],
  },
);

export const passwordUpdateSchema = z
  .object({
    password: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres')
      .refine((value) => /[A-Z]/.test(value), 'La contraseña debe contener al menos una mayúscula')
      .refine((value) => /[a-z]/.test(value), 'La contraseña debe contener al menos una minúscula')
      .refine((value) => /[0-9]/.test(value), 'La contraseña debe contener al menos un número'),
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
