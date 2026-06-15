const FIELD_NAME_MAP: Record<string, string> = {
  username: 'Nombre de usuario',
  email: 'Correo electrónico',
  password: 'Contraseña',
  identifier: 'Identificador',
};

const TECHNICAL_PREFIXES = [
  /^validation[_\s-]*error[:;,\s-]*/i,
  /^value[_\s-]*error[:;,\s-]*/i,
  /^value error[:;,\s-]*/i,
];

const capitalizeFirst = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }
  return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}`;
};

const normalizeMessage = (value: string): string => {
  let normalized = value.trim();

  for (const prefixRegex of TECHNICAL_PREFIXES) {
    normalized = normalized.replace(prefixRegex, '');
  }

  normalized = normalized.replace(/\s+/g, ' ');
  normalized = normalized.replace(/^[;:,\-\s]+/, '');

  if (/^field required$/i.test(normalized)) {
    normalized = 'Campo requerido';
  }

  return capitalizeFirst(normalized);
};

const formatArrayItem = (item: any): string => {
  if (typeof item === 'string') {
    return normalizeMessage(item);
  }

  if (!item || typeof item !== 'object') {
    return '';
  }

  const rawMessage = item.msg || item.message || '';
  const normalizedMessage = normalizeMessage(rawMessage);

  const loc = Array.isArray(item.loc) ? item.loc : [];
  const rawField = typeof loc[loc.length - 1] === 'string' ? String(loc[loc.length - 1]) : '';
  const fieldName = FIELD_NAME_MAP[rawField] || '';

  if (!normalizedMessage) {
    return fieldName;
  }

  const messageLower = normalizedMessage.toLowerCase();
  const fieldLower = fieldName.toLowerCase();
  if (fieldName && !messageLower.includes(fieldLower)) {
    return `${fieldName}: ${normalizedMessage}`;
  }

  return normalizedMessage;
};

export const getBackendErrorMessage = (error: unknown, fallbackMessage = 'Ha ocurrido un error.'): string => {
  const data = (error as any)?.response?.data;
  if (!data) {
    return capitalizeFirst(fallbackMessage);
  }

  if (typeof data.detail === 'string') {
    return normalizeMessage(data.detail);
  }

  if (Array.isArray(data.detail)) {
    const messages = data.detail.map(formatArrayItem).filter(Boolean);
    return messages.length > 0 ? messages.join('; ') : capitalizeFirst(fallbackMessage);
  }

  if (typeof data.message === 'string') {
    return normalizeMessage(data.message);
  }

  if (typeof data.detail === 'object' && data.detail !== null) {
    const errors = Object.values(data.detail)
      .flatMap((value: any) => {
        if (Array.isArray(value)) {
          return value.map((item) => formatArrayItem(item));
        }

        if (typeof value === 'string') {
          return [normalizeMessage(value)];
        }

        return [formatArrayItem(value)];
      })
      .filter(Boolean);

    if (errors.length > 0) {
      return errors.join('; ');
    }
  }

  if (typeof data === 'string') {
    return normalizeMessage(data);
  }

  return capitalizeFirst(fallbackMessage);
};
