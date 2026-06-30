import React from 'react';
import { motion } from 'framer-motion';

type StatusFilter = 'Todos' | 'Pendiente' | 'Listo para iniciar' | 'Finalizado';

interface Props {
  current: StatusFilter;
  counts: Record<StatusFilter, number>;
  onChange: (next: StatusFilter) => void;
}

export const TournamentsFilters: React.FC<Props> = ({ current, counts, onChange }) => {
  const STATUS_FILTERS: StatusFilter[] = ['Todos', 'Pendiente', 'Listo para iniciar', 'Finalizado'];
  const STATUS_LABELS: Record<StatusFilter, string> = {
    'Todos': 'Todos',
    'Pendiente': 'Pendiente',
    'Listo para iniciar': 'Activo',
    'Finalizado': 'Finalizado',
  };

  return (
    <motion.div
      className="tn-status-tabs"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 }}
    >
      {STATUS_FILTERS.map((statusOption) => (
        <button
          key={statusOption}
          type="button"
          className={`tn-status-tab ${current === statusOption ? 'active' : ''}`}
          onClick={() => onChange(statusOption)}
        >
          <span>{STATUS_LABELS[statusOption]}</span>
          <small>{counts[statusOption]}</small>
        </button>
      ))}
    </motion.div>
  );
};
