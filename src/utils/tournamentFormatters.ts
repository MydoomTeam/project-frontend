import React from 'react';
import { formatDateForDisplay } from './dateDisplay';

export const formatISO = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatDateForInput = (date?: Date): string => {
  if (!date) return 'Sin definir';
  return date.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const coercePositiveInteger = (value: unknown, fallback: number): number => {
  const num = Number(value);
  return !Number.isNaN(num) && num > 0 ? num : fallback;
};

export const displayValue = (value?: unknown): string => {
  if (value === undefined || value === null || value === '') return 'Sin definir';
  return String(value);
};

export const displayParticipantCount = (value: unknown): string => {
  if (
    !value ||
    value === '' ||
    Number.isNaN(Number(value))
  ) {
    return 'Sin definir';
  }
  return String(Number(value));
};

export const displayDuration = (value: unknown): string => {
  if (
    !value ||
    value === '' ||
    Number.isNaN(Number(value))
  ) {
    return 'Sin definir';
  }
  return `${Number(value)} min`;
};

export const displayDate = (value?: string | null): string => {
  if (!value) {
    return 'Sin definir';
  }
  return formatDateForDisplay(value);
};
