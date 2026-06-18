const ISO_DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const parseDateLike = (value: string): Date | null => {
  const isoMatch = ISO_DATE_ONLY_PATTERN.exec(value);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    return new Date(year, month - 1, day);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

export const formatDateForDisplay = (value?: string | Date | null): string => {
  if (!value) return 'Sin definir';

  const parsed = value instanceof Date ? value : parseDateLike(value);
  if (!parsed) {
    return typeof value === 'string' ? value : 'Sin definir';
  }

  return parsed.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
};
