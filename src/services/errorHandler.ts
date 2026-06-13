export const getBackendErrorMessage = (error: unknown, fallbackMessage = 'Ha ocurrido un error.'): string => {
  const data = (error as any)?.response?.data;
  if (!data) {
    return fallbackMessage;
  }

  if (typeof data.detail === 'string') {
    return data.detail;
  }

  if (Array.isArray(data.detail)) {
    return data.detail
      .map((item: any) => item?.msg || item?.message || JSON.stringify(item))
      .join('; ');
  }

  if (typeof data.message === 'string') {
    return data.message;
  }

  if (typeof data.detail === 'object' && data.detail !== null) {
    const errors = Object.values(data.detail).flatMap((value: any) => {
      if (Array.isArray(value)) {
        return value.map((item) => (typeof item === 'string' ? item : JSON.stringify(item)));
      }
      return typeof value === 'string' ? value : JSON.stringify(value);
    });
    if (errors.length > 0) {
      return errors.join('; ');
    }
  }

  return typeof data === 'string' ? data : JSON.stringify(data);
};
