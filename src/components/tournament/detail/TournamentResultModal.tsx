import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PlayerAvatar } from '../../ui/PlayerAvatar';
import { Match } from '../../../types/models';

interface Props {
  pendingResult: { matchId: number; winnerId: number } | null;
  pendingMatch: Match | null;
  playerNames: Record<number, string>;
  playerAvatars: Record<number, string | null>;
  playerElos: Record<number, number | null>;
  currentUserId: number | null;
  usesScoreMode: boolean;
  pendingScore1: string;
  pendingScore2: string;
  canSubmitScore: boolean;
  onSelectWinner: (winnerId: number) => void;
  onScore1Change: (value: string) => void;
  onScore2Change: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

const getPlayerDisplayName = (playerId: number | null | undefined, playerNames: Record<number, string>): string => {
  if (playerId == null) return 'BYE';
  return playerNames[playerId] || `Jugador #${playerId}`;
};

const getPlayerEloLabel = (playerId: number | null | undefined, playerElos: Record<number, number | null>): string => {
  if (playerId == null) return '—';
  const value = playerElos[playerId];
  return typeof value === 'number' ? value.toLocaleString('es-CO') : '—';
};

export const TournamentResultModal: React.FC<Props> = ({
  pendingResult,
  pendingMatch,
  playerNames,
  playerAvatars,
  playerElos,
  currentUserId,
  usesScoreMode,
  pendingScore1,
  pendingScore2,
  canSubmitScore,
  onSelectWinner,
  onScore1Change,
  onScore2Change,
  onClose,
  onConfirm,
}) => (
  <AnimatePresence>
    {pendingResult && (
      <motion.div
        className="dashboard-create-modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        role="dialog"
        aria-modal="true"
      >
        <motion.div
          className="dashboard-create-modal td-result-modal"
          initial={{ scale: 0.93, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.93, opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <div className="dashboard-create-modal-head">
            <div>
              <h2>Registrar ganador del encuentro</h2>
              <p className="td-result-subhead">Partido #{pendingResult.matchId} · Selecciona el ganador para avanzar el bracket</p>
            </div>
            <button onClick={onClose} className="dashboard-create-close">✕</button>
          </div>

          {pendingMatch ? (
            <>
              <div className="td-result-cards">
                {[pendingMatch.player1_id, pendingMatch.player2_id].map((playerId) => {
                  if (playerId == null) return null;
                  const selected = pendingResult.winnerId === playerId;
                  const displayName = getPlayerDisplayName(playerId, playerNames);
                  return (
                    <button
                      key={playerId}
                      type="button"
                      className={`td-result-card ${selected ? 'is-selected' : ''}`}
                      onClick={() => onSelectWinner(playerId)}
                    >
                      <div className="td-result-card-head">
                        <PlayerAvatar
                          username={displayName}
                          avatarUrl={playerAvatars[playerId]}
                          size="sm"
                        />
                        <div>
                          <p className="td-result-name">{displayName}</p>
                          <p className="td-result-elo">ELO actual: {getPlayerEloLabel(playerId, playerElos)}</p>
                        </div>
                      </div>
                      <div className="td-result-card-foot">
                        {selected ? 'Ganador seleccionado' : 'Seleccionar ganador'}
                      </div>
                    </button>
                  );
                })}
              </div>

              {usesScoreMode && (
                <div className="td-result-score-grid">
                  <label className="td-result-score-field">
                    <span>{getPlayerDisplayName(pendingMatch.player1_id, playerNames)}</span>
                    <input
                      type="number"
                      min={0}
                      value={pendingScore1}
                      onChange={(event) => onScore1Change(event.target.value)}
                    />
                  </label>
                  <label className="td-result-score-field">
                    <span>{getPlayerDisplayName(pendingMatch.player2_id, playerNames)}</span>
                    <input
                      type="number"
                      min={0}
                      value={pendingScore2}
                      onChange={(event) => onScore2Change(event.target.value)}
                    />
                  </label>
                </div>
              )}

              <div className="td-result-note">
                {usesScoreMode
                  ? 'Modo actual: Con puntuación. Debes registrar la puntuación de ambos jugadores.'
                  : 'Modo actual: WIN/LOSE. Se registra el ganador del match y actualiza el ELO.'}
              </div>

              <div className="dashboard-inline-actions td-result-actions">
                <button onClick={onClose} className="btn btn-secondary">
                  Cancelar
                </button>
                <button
                  onClick={onConfirm}
                  className="btn td-btn-success td-result-confirm"
                  disabled={!canSubmitScore}
                >
                  Confirmar resultado
                </button>
              </div>
            </>
          ) : (
            <>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                ¿Confirmas este resultado? Esta acción actualiza el ELO y avanza el cuadro.
              </p>
              <div className="dashboard-inline-actions">
                <button onClick={onClose} className="btn btn-secondary">
                  Cancelar
                </button>
                <button onClick={onConfirm} className="btn td-btn-success">
                  Confirmar resultado
                </button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);
