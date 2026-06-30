import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = 'Cargando...' }) => {
  return (
    <div className="loading-spinner-wrap" role="status" aria-live="polite">
      <div className="loading-trophy" aria-hidden="true">🏆</div>
      <p className="loading-message">{message}</p>
    </div>
  );
};
