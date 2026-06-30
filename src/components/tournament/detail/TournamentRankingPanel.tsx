import React from 'react';
import { Link } from 'react-router-dom';
import { PlayerAvatar } from '../../ui/PlayerAvatar';
import { RankingItem } from '../../../types/models';

interface Props {
  ranking: RankingItem[];
  playerNames: Record<number, string>;
  playerAvatars: Record<number, string | null>;
}

export const TournamentRankingPanel: React.FC<Props> = ({ ranking, playerNames, playerAvatars }) => {
  if (ranking.length === 0) {
    return <p className="dashboard-empty">No hay clasificación disponible.</p>;
  }

  return (
    <div className="dashboard-table-wrap">
      <table className="dashboard-table">
        <thead>
          <tr>
            <th>Posición</th>
            <th>Jugador</th>
            <th>Victorias</th>
            <th>ELO global</th>
          </tr>
        </thead>
        <tbody>
          {ranking.map((row) => {
            const medal = row.position === 1 ? '🥇' : row.position === 2 ? '🥈' : row.position === 3 ? '🥉' : `#${row.position}`;
            return (
              <tr key={row.player_id}>
                <td data-label="Posición" style={{ fontWeight: row.position <= 3 ? 800 : 400 }}>{medal}</td>
                <td data-label="Jugador">
                  <span className="player-name-cell">
                    <PlayerAvatar
                      username={playerNames[row.player_id] || undefined}
                      avatarUrl={playerAvatars[row.player_id]}
                      size="xs"
                    />
                    <Link to={`/profile/${row.player_id}`} className="player-profile-link">
                      {playerNames[row.player_id] || `Jugador #${row.player_id}`}
                    </Link>
                  </span>
                </td>
                <td data-label="Victorias">{row.wins}</td>
                <td data-label="ELO global">{row.global_elo}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
