import React, { useEffect, useState } from 'react';
import { getAlerts, ackAlert } from '../services/alerts';
import { AlertItem } from '../types/models';
import { getBackendErrorMessage } from '../services/errorHandler';

export const Alerts: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  const loadAlerts = async () => {
    try {
      const data = await getAlerts();
      setAlerts(data.items || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const handleAck = async (id: number) => {
    try {
      await ackAlert(id);
      loadAlerts();
    } catch (err: any) {
      alert(getBackendErrorMessage(err, 'No se pudo reconocer la alerta'));
    }
  };

  return (
    <div className="container" style={{ marginTop: '2rem' }}>
      <h1>🔔 Panel de Alertas del Scheduler (Matches Vencidos)</h1>
      <div className="card" style={{ marginTop: '1.5rem' }}>
        {alerts.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No hay alertas activas en el sistema.</p>
        ) : (
          alerts.map((a) => (
            <div
              key={a.id}
              style={{
                padding: '1rem',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: a.status === 'nueva' ? 'rgba(239, 68, 68, 0.05)' : 'transparent',
              }}
            >
              <div>
                <p style={{ margin: 0, fontWeight: a.status === 'nueva' ? 'bold' : 'normal' }}>{a.message}</p>
                <small style={{ color: 'var(--text-muted)' }}>
                  Fecha: {a.created_at} | Estado: {a.status}
                </small>
              </div>
              {a.status === 'nueva' && (
                <button
                  onClick={() => handleAck(a.id)}
                  className="btn btn-secondary"
                  style={{ padding: '0.3rem 0.8rem', fontSize: '0.85rem' }}
                >
                  Marcar como Leída
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
