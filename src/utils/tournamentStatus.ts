export const toBusinessTournamentStatus = (status: string): string => {
  if (status === 'Listo para iniciar') {
    return 'Activo';
  }
  return status;
};

export const getTournamentStatusBadgeClass = (status: string): string => {
  switch (status) {
    case 'Pendiente':
      return 'badge-pending';
    case 'Listo para iniciar':
      return 'badge-ready';
    case 'En curso':
      return 'badge-active';
    default:
      return 'badge-finished';
  }
};
