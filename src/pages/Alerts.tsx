import React, { useEffect, useMemo, useState } from 'react';
import { FiAlertTriangle, FiBell, FiCheckCircle, FiClock, FiRefreshCw } from 'react-icons/fi';
import { getAlerts, ackAlert } from '../services/alerts';
import { AlertActivityItem, AlertItem, AlertPanelStats } from '../types/models';
import { getBackendErrorMessage } from '../services/errorHandler';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

const ALERTS_REFRESH_MS = 15000;

const formatAlertDate = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const toAlertStatusLabel = (status: AlertItem['status']): string => status === 'nueva' ? 'Activa' : 'Resuelta';

const toAlertStatusTone = (status: AlertItem['status']): 'critical' | 'resolved' => status === 'nueva' ? 'critical' : 'resolved';

const toActivityLabel = (entry: AlertActivityItem): string => {
  if (entry.action_label && entry.action_label.trim()) return entry.action_label;
  if (entry.action === 'CREATE_ALERTA') return 'Nueva alerta registrada';
  if (entry.action === 'ACK_ALERTA') return 'Alerta marcada como resuelta';
  if (entry.action === 'CREATE_ALERTA_FAILED') return 'Fallo en generación automática';
  return 'Actividad del torneo';
};

export const Alerts: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [history, setHistory] = useState<AlertActivityItem[]>([]);
  const [stats, setStats] = useState<AlertPanelStats>({ total: 0, new: 0, acknowledged: 0, critical: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const loadAlerts = async () => {
    try {
      const data = await getAlerts();
      const sorted = [...(data.items || [])].sort((left, right) => {
        if (left.status !== right.status) {
          return left.status === 'nueva' ? -1 : 1;
        }
        return right.id - left.id;
      });
      setAlerts(sorted);
      setHistory(data.history ?? []);
      setStats(data.stats ?? { total: sorted.length, new: 0, acknowledged: 0, critical: 0 });
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
    const intervalId = window.setInterval(loadAlerts, ALERTS_REFRESH_MS);
    return () => window.clearInterval(intervalId);
  }, []);

  const handleAck = async (id: number) => {
    try {
      await ackAlert(id);
      loadAlerts();
    } catch (err: any) {
      alert(getBackendErrorMessage(err, 'No se pudo reconocer la alerta'));
    }
  };

  const featuredAlert = useMemo(() => alerts.find((item) => item.status === 'nueva') ?? alerts[0] ?? null, [alerts]);
  const secondaryAlerts = useMemo(
    () => alerts.filter((item) => item.id !== featuredAlert?.id).slice(0, 6),
    [alerts, featuredAlert],
  );

  if (isLoading) {
    return <LoadingSpinner message="Cargando centro de alertas..." />;
  }

  return (
    <div className="alerts-page">
      <header className="alerts-header">
        <div>
          <p className="alerts-eyebrow"><FiBell aria-hidden="true" /> Centro de monitoreo</p>
          <h1>Alertas del Sistema</h1>
        </div>
        <div className="alerts-live-pill">
          <FiRefreshCw aria-hidden="true" /> Monitoreo en vivo
        </div>
      </header>

      <section className="alerts-kpi-grid">
        <article className="alerts-kpi-card">
          <span className="alerts-kpi-label">Alertas activas</span>
          <strong>{stats.new}</strong>
        </article>
        <article className="alerts-kpi-card">
          <span className="alerts-kpi-label">Criticas</span>
          <strong>{stats.critical}</strong>
        </article>
        <article className="alerts-kpi-card">
          <span className="alerts-kpi-label">Resueltas</span>
          <strong>{stats.acknowledged}</strong>
        </article>
        <article className="alerts-kpi-card">
          <span className="alerts-kpi-label">Eventos totales</span>
          <strong>{stats.total}</strong>
        </article>
      </section>

      <section className="alerts-layout">
        <div className="alerts-main-column">
          <section className="alerts-panel alerts-panel-main">
            <div className="alerts-panel-head">
              <div>
                <h2>Alertas activas</h2>
                <p>{stats.new} pendientes de revisión</p>
              </div>
            </div>

            {!featuredAlert ? (
              <div className="alerts-empty-state">
                <FiCheckCircle aria-hidden="true" />
                <div>
                  <p>No hay alertas activas en el sistema.</p>
                  <small>El scheduler no reporta incidentes pendientes en este momento.</small>
                </div>
              </div>
            ) : (
              <>
                <article className={`alerts-feature-card is-${toAlertStatusTone(featuredAlert.status)}`}>
                  <div className="alerts-feature-head">
                    <div>
                      <span className="alerts-feature-kicker">{featuredAlert.event_type === 'match_overdue' ? 'Partida expirada' : 'Evento del sistema'}</span>
                      <h3>{featuredAlert.message}</h3>
                    </div>
                    <span className={`alerts-status-pill is-${toAlertStatusTone(featuredAlert.status)}`}>
                      {toAlertStatusLabel(featuredAlert.status)}
                    </span>
                  </div>
                  <p className="alerts-feature-copy">
                    {featuredAlert.status === 'nueva'
                      ? 'Supero la ventana operativa esperada y requiere revisión o resolución administrativa.'
                      : 'El incidente ya fue reconocido y queda disponible en el historial del panel.'}
                  </p>
                  <div className="alerts-feature-foot">
                    <span><FiClock aria-hidden="true" /> {formatAlertDate(featuredAlert.created_at)}</span>
                    {featuredAlert.status === 'nueva' ? (
                      <button onClick={() => handleAck(featuredAlert.id)} className="btn alerts-action-btn alerts-action-btn-primary">
                        Resolver ahora
                      </button>
                    ) : (
                      <span className="alerts-resolved-label">Incidente resuelto</span>
                    )}
                  </div>
                </article>

                <div className="alerts-card-stack">
                  {secondaryAlerts.map((alert) => (
                    <article key={alert.id} className={`alerts-list-card is-${toAlertStatusTone(alert.status)}`}>
                      <div className="alerts-list-card-head">
                        <div>
                          <p className="alerts-list-card-title">{alert.message}</p>
                          <small>{formatAlertDate(alert.created_at)}</small>
                        </div>
                        <span className={`alerts-status-pill is-${toAlertStatusTone(alert.status)}`}>
                          {toAlertStatusLabel(alert.status)}
                        </span>
                      </div>
                      {alert.status === 'nueva' && (
                        <div className="alerts-list-card-actions">
                          <button onClick={() => handleAck(alert.id)} className="btn alerts-action-btn alerts-action-btn-secondary">
                            Marcar resuelta
                          </button>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>

        <aside className="alerts-panel alerts-side-column">
          <div className="alerts-panel-head">
            <div>
              <h2>Historial de actividad</h2>
              <p>Auditoría reciente del sistema</p>
            </div>
          </div>

          <div className="alerts-history-list">
            {history.length === 0 ? (
              <p className="dashboard-empty">No hay actividad de alertas registrada todavía.</p>
            ) : (
              history.map((entry) => (
                <article key={entry.id} className="alerts-history-item">
                  <div className="alerts-history-meta">
                    <span>{formatAlertDate(entry.created_at)}</span>
                    <span className="alerts-history-badge">{toActivityLabel(entry)}</span>
                  </div>
                  <p>{entry.description || toActivityLabel(entry)}</p>
                  {entry.tournament_name && <small>Torneo: {entry.tournament_name}</small>}
                </article>
              ))
            )}
          </div>
        </aside>
      </section>
    </div>
  );
};
