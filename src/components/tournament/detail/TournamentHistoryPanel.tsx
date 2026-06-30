import React from 'react';
import { Link } from 'react-router-dom';
import { PlayerAvatar } from '../../ui/PlayerAvatar';
import { Match } from '../../../types/models';

interface Props {
  history: Match[] | null;
  currentUserId: number | null;
  playerNames: Record<number, string>;
  playerAvatars: Record<number, string | null>;
  loadMyHistory: () => void;
}

const getPlayerDisplayName = (playerId: number | null | undefined, playerNames: Record<number, string>): string => {
  if (playerId == null) return 'BYE';
  return playerNames[playerId] || `Jugador #${playerId}`;
};

export const TournamentHistoryPanel: React.FC<Props> = ({
  history,
  currentUserId,
  playerNames,
  playerAvatars,
  loadMyHistory,
}) => {
  if (history === null) {
    return (
      <p className="dashboard-empty">Pulsa el botón para cargar tu historial.</p>
    );
  }

  if (history.length === 0) {
    return (
      <p className="dashboard-empty">Todavía no tienes enfrentamientos registrados en este torneo.</p>
    );
  }

  return (
    <div className="dashboard-table-wrap">
      <table className="dashboard-table">
        <thead>
          <tr>
            <th>Ronda</th>
            <th>Jugador 1</th>
            <th>Jugador 2</th>
            <th>Estado</th>
            <th>Resultado</th>
          </tr>
        </thead>
        <tbody>
          {history.map((match) => (
            <tr key={match.id}>
              <td data-label="Ronda">Ronda {match.round}</td>
              <td data-label="Jugador 1">
                <span className="player-name-cell">
                  <PlayerAvatar
                    username={match.player1_id ? getPlayerDisplayName(match.player1_id, playerNames) : undefined}
                    avatarUrl={match.player1_id ? playerAvatars[match.player1_id] : null}
                    size="xs"
                  />
                  {match.player1_id ? (
                    <Link to={`/profile/${match.player1_id}`} className="player-profile-link">
                      {getPlayerDisplayName(match.player1_id, playerNames)}
                    </Link>
                  ) : (
                    <code>BYE</code>
                  )}
                </span>
              </td>
              <td data-label="Jugador 2">
                <span className="player-name-cell">
                  <PlayerAvatar
                    username={match.player2_id ? getPlayerDisplayName(match.player2_id, playerNames) : undefined}
                    avatarUrl={match.player2_id ? playerAvatars[match.player2_id] : null}
                    size="xs"
                  />
                  {match.player2_id ? (
                    <Link to={`/profile/${match.player2_id}`} className="player-profile-link">
                      {getPlayerDisplayName(match.player2_id, playerNames)}
                    </Link>
                  ) : (
                    <code>Ninguno</code>
                  )}
                </span>
              </td>
              <td data-label="Estado">{match.status}</td>
              <td data-label="Resultado">
                {match.winner_id ? (
                  <span style={{ color: match.winner_id === currentUserId ? 'var(--success)' : 'var(--text-muted)', fontWeight: 700 }}>
                    {match.winner_id === currentUserId ? '✓ Victoria' : `Ganó ${getPlayerDisplayName(match.winner_id, playerNames)}`}
                  </span>
                ) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
