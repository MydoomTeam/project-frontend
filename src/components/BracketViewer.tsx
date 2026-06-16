import React, { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Bracket, Model } from 'react-tournament-bracket';
import { EliminationType, Match } from '../types/models';
import { PlayerAvatar } from './PlayerAvatar';

type MatchWithScores = Match & {
  score_player1?: number | null;
  score_player2?: number | null;
};

const BRACKET_TYPE_LABEL: Record<string, string> = {
  ganadores: 'Ganadores',
  perdedores: 'Perdedores',
  gran_final: 'Gran Final',
};

interface BracketViewerProps {
  matches: Match[];
  eliminationType: EliminationType;
  playerNames?: Record<number, string>;
  playerAvatars?: Record<number, string | null>;
  isCreator: boolean;
  participantCount: number;
  usesScore?: boolean;
  onSelectWinner: (matchId: number, winnerId: number) => void;
}

const ZOOM_THRESHOLD_PARTICIPANTS = 32;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.2;

const BRACKET_GAME_WIDTH = 300;
const BRACKET_GAME_HEIGHT = 120;
const BRACKET_HEAD_HEIGHT = 26;
const BRACKET_ROW_HEIGHT = 36;
const BRACKET_SCORE_COL_WIDTH = 46;

const clampZoom = (value: number): number => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));

const toDisplayDate = (value?: string | null): string => {
  if (!value) return 'Sin definir';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: '2-digit' });
};

const scoreFromDetail = (value?: string | null): [string | null, string | null] => {
  if (!value) return [null, null];
  const parsed = value.match(/(\d+)\s*[-:]\s*(\d+)/);
  if (!parsed) return [null, null];
  return [parsed[1], parsed[2]];
};

const toNumericScore = (value: string): number | null => {
  if (!/^\d+$/.test(value.trim())) return null;
  return Number(value);
};

const BracketGameCard: React.FC<{
  game: Model.Game;
  x?: number;
  y?: number;
  homeOnTop?: boolean;
  playerAvatars?: Record<number, string | null>;
  onOpenPlayerProfile?: (playerId: number) => void;
  selectableMatchIds?: Set<string>;
  onOpenMatchResult?: (matchId: number) => void;
}> = ({
  game,
  x = 0,
  y = 0,
  homeOnTop = true,
  playerAvatars,
  onOpenPlayerProfile,
  selectableMatchIds,
  onOpenMatchResult,
}) => {
  const { id, name, bracketLabel, scheduled, sides } = game;
  const top = homeOnTop ? sides.home : sides.visitor;
  const bottom = homeOnTop ? sides.visitor : sides.home;
  const topScore = top?.score?.score;
  const bottomScore = bottom?.score?.score;
  const topWon = typeof topScore === 'number' && typeof bottomScore === 'number' && topScore > bottomScore;
  const bottomWon = typeof topScore === 'number' && typeof bottomScore === 'number' && bottomScore > topScore;

  const topName = top?.team?.name || top?.seed?.displayName || 'BYE';
  const bottomName = bottom?.team?.name || bottom?.seed?.displayName || 'BYE';

  const getTeamAvatar = (team?: { id: string; name: string }): string | undefined => {
    if (!team?.id) return undefined;
    const numericId = Number(team.id);
    if (!Number.isFinite(numericId)) return undefined;
    return playerAvatars?.[numericId] ?? undefined;
  };

  const topAvatarUrl = getTeamAvatar(top?.team);
  const bottomAvatarUrl = getTeamAvatar(bottom?.team);

  const parseTeamId = (team?: { id: string; name: string }): number | null => {
    if (!team?.id) return null;
    const parsed = Number(team.id);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const topPlayerId = parseTeamId(top?.team);
  const bottomPlayerId = parseTeamId(bottom?.team);

  const avatarInitials = (label: string): string => {
    const parts = label.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return label.slice(0, 2).toUpperCase();
  };

  const isSelectableMatch = selectableMatchIds?.has(String(id)) ?? false;
  const handleOpenMatchResult = () => {
    if (!isSelectableMatch || !onOpenMatchResult) return;
    const matchId = Number(id);
    if (!Number.isNaN(matchId)) {
      onOpenMatchResult(matchId);
    }
  };

  const renderSvgAvatar = (slot: 'top' | 'bottom', centerY: number, avatarUrl?: string, playerId?: number | null) => {
    const radius = 9;
    const centerX = 18;
    const clipId = `br-av-${String(id)}-${slot}`;
    const openProfile = () => {
      if (playerId && onOpenPlayerProfile) onOpenPlayerProfile(playerId);
    };
    return (
      <g onClick={openProfile} style={playerId ? { cursor: 'pointer' } : undefined}>
        <circle cx={centerX} cy={centerY} r={radius} fill="rgba(7, 29, 55, 0.95)" stroke="rgba(31, 216, 229, 0.62)" />
        {avatarUrl ? (
          <>
            <defs>
              <clipPath id={clipId}>
                <circle cx={centerX} cy={centerY} r={radius - 0.6} />
              </clipPath>
            </defs>
            <image
              href={avatarUrl}
              x={centerX - radius}
              y={centerY - radius}
              width={radius * 2}
              height={radius * 2}
              preserveAspectRatio="xMidYMid slice"
              clipPath={`url(#${clipId})`}
            />
          </>
        ) : (
          <text x={centerX} y={centerY + 3.4} textAnchor="middle" className="bracket-game-avatar-fallback">
            {avatarInitials(slot === 'top' ? topName : bottomName)}
          </text>
        )}
      </g>
    );
  };

  return (
    <g
      transform={`translate(${x}, ${y})`}
      onClick={handleOpenMatchResult}
      style={isSelectableMatch ? { cursor: 'pointer' } : undefined}
    >
      <rect x="0" y="0" width={BRACKET_GAME_WIDTH} height={BRACKET_GAME_HEIGHT} rx="10" className="bracket-game-shell" />
      <rect x="0" y="0" width={BRACKET_GAME_WIDTH} height={BRACKET_HEAD_HEIGHT} rx="10" className="bracket-game-head" />
      <text x="12" y="17" className="bracket-game-head-text">{name}</text>
      <text x={BRACKET_GAME_WIDTH - 12} y="17" textAnchor="end" className="bracket-game-head-text">{scheduled ? new Date(scheduled).toLocaleDateString('es-CO') : ''}</text>

      <rect x="0" y={BRACKET_HEAD_HEIGHT} width={BRACKET_GAME_WIDTH} height={BRACKET_ROW_HEIGHT} className={topWon ? 'bracket-game-row win' : 'bracket-game-row'} />
      <rect x="0" y={BRACKET_HEAD_HEIGHT + BRACKET_ROW_HEIGHT} width={BRACKET_GAME_WIDTH} height={BRACKET_ROW_HEIGHT} className={bottomWon ? 'bracket-game-row win' : 'bracket-game-row'} />

      {renderSvgAvatar('top', BRACKET_HEAD_HEIGHT + 18, topAvatarUrl, topPlayerId)}
      {renderSvgAvatar('bottom', BRACKET_HEAD_HEIGHT + BRACKET_ROW_HEIGHT + 18, bottomAvatarUrl, bottomPlayerId)}

      <text
        x="32"
        y={BRACKET_HEAD_HEIGHT + 23}
        className="bracket-game-player-name"
        style={topPlayerId ? { cursor: 'pointer' } : undefined}
        onClick={() => {
          if (topPlayerId && onOpenPlayerProfile) onOpenPlayerProfile(topPlayerId);
        }}
      >
        {topName}
      </text>
      <text
        x="32"
        y={BRACKET_HEAD_HEIGHT + BRACKET_ROW_HEIGHT + 23}
        className="bracket-game-player-name"
        style={bottomPlayerId ? { cursor: 'pointer' } : undefined}
        onClick={() => {
          if (bottomPlayerId && onOpenPlayerProfile) onOpenPlayerProfile(bottomPlayerId);
        }}
      >
        {bottomName}
      </text>

      <rect x={BRACKET_GAME_WIDTH - BRACKET_SCORE_COL_WIDTH} y={BRACKET_HEAD_HEIGHT} width={BRACKET_SCORE_COL_WIDTH} height={BRACKET_ROW_HEIGHT * 2} className="bracket-game-score-col" />
      <text x={BRACKET_GAME_WIDTH - BRACKET_SCORE_COL_WIDTH / 2} y={BRACKET_HEAD_HEIGHT + 23} textAnchor="middle" className={topWon ? 'bracket-game-score win' : 'bracket-game-score'}>
        {typeof topScore === 'number' ? topScore : ''}
      </text>
      <text x={BRACKET_GAME_WIDTH - BRACKET_SCORE_COL_WIDTH / 2} y={BRACKET_HEAD_HEIGHT + BRACKET_ROW_HEIGHT + 23} textAnchor="middle" className={bottomWon ? 'bracket-game-score win' : 'bracket-game-score'}>
        {typeof bottomScore === 'number' ? bottomScore : ''}
      </text>

      <text x={BRACKET_GAME_WIDTH / 2} y={BRACKET_GAME_HEIGHT - 6} textAnchor="middle" className="bracket-game-foot">
        {bracketLabel || `Partido #${id}`}
      </text>
    </g>
  );
};

export const BracketViewer: React.FC<BracketViewerProps> = ({
  matches,
  eliminationType,
  playerNames,
  playerAvatars,
  isCreator,
  participantCount,
  usesScore = false,
  onSelectWinner,
}) => {
  const navigate = useNavigate();
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragOrigin = useRef<{ x: number; y: number } | null>(null);

  const toPlayerLabel = (playerId: number | null | undefined): string => {
    if (playerId == null) return 'BYE';
    return playerNames?.[playerId] || `Jugador #${playerId}`;
  };

  const toPlayerAvatar = (playerId: number | null | undefined): string | null => {
    if (playerId == null) return null;
    return playerAvatars?.[playerId] ?? null;
  };

  const renderPlayerLabel = (playerId: number | null | undefined) => {
    const label = toPlayerLabel(playerId);
    if (playerId == null) return <span>{label}</span>;
    return (
      <Link to={`/profile/${playerId}`} className="player-profile-link">
        {label}
      </Link>
    );
  };

  const isLargeBracket = participantCount > ZOOM_THRESHOLD_PARTICIPANTS;
  const isEliminationFormat = eliminationType === 'Eliminación Sencilla' || eliminationType === 'Eliminación Doble';
  const isRoundRobin = eliminationType === 'Round Robin';
  const isSwiss = eliminationType === 'Swiss';

  const totalMatches = matches.length;
  const finishedMatches = matches.filter((match) => match.status === 'Finalizado').length;
  const isTournamentFinished = totalMatches > 0 && finishedMatches === totalMatches;

  const toStatusWithIcon = (status: Match['status'] | 'En progreso' | 'Finalizado'): string => {
    if (status === 'Finalizado') return '✓ Finalizado';
    if (status === 'En curso') return '⏳ En curso';
    if (status === 'Programado') return '🕒 Programado';
    if (status === 'Pendiente') return '🕒 Pendiente';
    if (status === 'En progreso') return '⏳ En progreso';
    return status;
  };

  const getRenderedScore = (match: MatchWithScores, playerSlot: 'player1' | 'player2'): string => {
    const [detail1, detail2] = scoreFromDetail(match.score_detail);
    const directScore = playerSlot === 'player1' ? match.score_player1 : match.score_player2;
    if (directScore != null) return String(directScore);
    if (playerSlot === 'player1' && detail1 != null) return detail1;
    if (playerSlot === 'player2' && detail2 != null) return detail2;

    const playerId = playerSlot === 'player1' ? match.player1_id : match.player2_id;
    if (match.status === 'Finalizado' && match.winner_id != null && playerId != null) {
      return playerId === match.winner_id ? 'WIN' : 'LOSE';
    }
    return '—';
  };

  const stageChampionLabel = (stageMatches: MatchWithScores[]): string | null => {
    const stageFinals = stageMatches
      .filter((match) => match.next_match_id == null && typeof match.winner_id === 'number')
      .sort((a, b) => (a.round - b.round) || (a.position - b.position));
    const finalMatch = stageFinals.length > 0 ? stageFinals[stageFinals.length - 1] : null;
    if (!finalMatch?.winner_id) return null;
    return toPlayerLabel(finalMatch.winner_id);
  };

  const championLabel = useMemo(() => stageChampionLabel(matches as MatchWithScores[]), [matches, playerNames]);

  const toRoundLabel = (round: number): string => {
    if (round <= 0) return 'Clasificatoria';
    return `Ronda ${round}`;
  };

  const toKnockoutRoundLabel = (round: number, totalRounds: number): string => {
    if (round === totalRounds) return 'Final';
    if (round === totalRounds - 1) return 'Semifinales';
    if (round === totalRounds - 2) return 'Cuartos';
    return `Ronda ${round}`;
  };

  const toScoreText = (match: MatchWithScores, playerSlot: 'player1' | 'player2'): string => {
    const [detail1, detail2] = scoreFromDetail(match.score_detail);
    const directScore = playerSlot === 'player1' ? match.score_player1 : match.score_player2;
    if (directScore != null) return String(directScore);
    if (playerSlot === 'player1' && detail1 != null) return detail1;
    if (playerSlot === 'player2' && detail2 != null) return detail2;

    const playerId = playerSlot === 'player1' ? match.player1_id : match.player2_id;
    if (!usesScore && match.status === 'Finalizado' && match.winner_id != null && playerId != null) {
      return playerId === match.winner_id ? 'WIN' : 'LOSE';
    }
    return '—';
  };

  const selectableMatchIds = useMemo(
    () => new Set(
      (matches as MatchWithScores[])
        .filter((match) => isCreator && match.status === 'En curso' && match.player1_id && match.player2_id)
        .map((match) => String(match.id)),
    ),
    [matches, isCreator],
  );

  const bracketGames = useMemo<Model.Game[]>(() => {
    if (!isEliminationFormat) return [];

    const gameMap = new Map<number, Model.Game>();
    const matchList = (matches as MatchWithScores[])
      .slice()
      .sort((a, b) => (a.round - b.round) || (a.position - b.position));

    for (const match of matchList) {
      gameMap.set(match.id, {
        id: String(match.id),
        name: `Partido #${match.id}`,
        bracketLabel: `${BRACKET_TYPE_LABEL[match.bracket_type] ?? match.bracket_type} · ${toRoundLabel(match.round)}`,
        scheduled: match.scheduled_datetime ? Date.parse(match.scheduled_datetime) : Date.now(),
        sides: {
          home: {
            team: match.player1_id != null
              ? {
                  id: String(match.player1_id),
                  name: toPlayerLabel(match.player1_id),
                }
              : undefined,
            score: (() => {
              const value = toNumericScore(toScoreText(match, 'player1'));
              return value != null ? { score: value } : undefined;
            })(),
          },
          visitor: {
            team: match.player2_id != null
              ? {
                  id: String(match.player2_id),
                  name: toPlayerLabel(match.player2_id),
                }
              : undefined,
            score: (() => {
              const value = toNumericScore(toScoreText(match, 'player2'));
              return value != null ? { score: value } : undefined;
            })(),
          },
        },
      });
    }

    const parentToChildren = new Map<number, MatchWithScores[]>();
    for (const match of matchList) {
      if (!match.next_match_id) continue;
      const current = parentToChildren.get(match.next_match_id) ?? [];
      current.push(match);
      parentToChildren.set(match.next_match_id, current);
    }

    for (const [parentId, children] of parentToChildren.entries()) {
      const parentGame = gameMap.get(parentId);
      if (!parentGame) continue;
      const orderedChildren = children.sort((a, b) => a.position - b.position);
      const homeSource = orderedChildren[0] ? gameMap.get(orderedChildren[0].id) : undefined;
      const visitorSource = orderedChildren[1] ? gameMap.get(orderedChildren[1].id) : undefined;

      if (homeSource) {
        parentGame.sides.home.seed = {
          displayName: `Ganador ${homeSource.name}`,
          rank: 1,
          sourceGame: homeSource,
          sourcePool: {},
        };
      }
      if (visitorSource) {
        parentGame.sides.visitor.seed = {
          displayName: `Ganador ${visitorSource.name}`,
          rank: 1,
          sourceGame: visitorSource,
          sourcePool: {},
        };
      }
    }

    return Array.from(gameMap.values());
  }, [matches, eliminationType, playerNames]);

  const eliminationFinalGames = useMemo(() => {
    if (!isEliminationFormat) return [] as Model.Game[];

    const referencedGameIds = new Set<string>();
    for (const game of bracketGames) {
      const homeSource = game.sides.home.seed?.sourceGame?.id;
      const visitorSource = game.sides.visitor.seed?.sourceGame?.id;
      if (homeSource) referencedGameIds.add(homeSource);
      if (visitorSource) referencedGameIds.add(visitorSource);
    }

    return bracketGames.filter((game) => !referencedGameIds.has(game.id));
  }, [bracketGames, eliminationType]);

  const singleEliminationMatch = useMemo(() => {
    if (!isEliminationFormat || matches.length !== 1) return null;
    return (matches[0] as MatchWithScores) ?? null;
  }, [matches, eliminationType]);

  const eliminationRoundLabels = useMemo(() => {
    if (!isEliminationFormat) return [] as string[];
    const winnersRounds = Array.from(new Set((matches as MatchWithScores[])
      .filter((match) => match.bracket_type === 'ganadores')
      .map((match) => match.round)))
      .sort((a, b) => a - b);

    if (winnersRounds.length === 0) return [];
    const totalRounds = winnersRounds[winnersRounds.length - 1];
    return winnersRounds.map((round) => toKnockoutRoundLabel(round, totalRounds));
  }, [matches, eliminationType]);

  const roundsForLeague = useMemo(() => {
    if (isEliminationFormat) return [] as Array<{ round: number; matches: MatchWithScores[] }>;

    const roundMap = new Map<number, MatchWithScores[]>();
    for (const match of matches as MatchWithScores[]) {
      const current = roundMap.get(match.round) ?? [];
      current.push(match);
      roundMap.set(match.round, current);
    }

    return Array.from(roundMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([round, roundMatches]) => ({
        round,
        matches: roundMatches.sort((a, b) => a.position - b.position),
      }));
  }, [matches, eliminationType]);

  const roundRobinStandings = useMemo(() => {
    if (!isRoundRobin) return [] as Array<{
      playerId: number;
      playerName: string;
      played: number;
      wins: number;
      draws: number;
      losses: number;
      points: number;
      scored: number;
      conceded: number;
      diff: number;
    }>;

    type Row = {
      playerId: number;
      playerName: string;
      played: number;
      wins: number;
      draws: number;
      losses: number;
      points: number;
      scored: number;
      conceded: number;
    };

    const table = new Map<number, Row>();
    const ensureRow = (playerId: number): Row => {
      const existing = table.get(playerId);
      if (existing) return existing;
      const created: Row = {
        playerId,
        playerName: toPlayerLabel(playerId),
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        points: 0,
        scored: 0,
        conceded: 0,
      };
      table.set(playerId, created);
      return created;
    };

    for (const match of matches as MatchWithScores[]) {
      if (match.player1_id == null || match.player2_id == null) continue;
      const row1 = ensureRow(match.player1_id);
      const row2 = ensureRow(match.player2_id);

      if (match.status !== 'Finalizado') continue;

      row1.played += 1;
      row2.played += 1;

      const [detail1, detail2] = scoreFromDetail(match.score_detail);
      const s1 = match.score_player1 ?? (detail1 != null ? Number(detail1) : null);
      const s2 = match.score_player2 ?? (detail2 != null ? Number(detail2) : null);

      if (s1 != null && !Number.isNaN(s1) && s2 != null && !Number.isNaN(s2)) {
        row1.scored += s1;
        row1.conceded += s2;
        row2.scored += s2;
        row2.conceded += s1;

        if (s1 > s2) {
          row1.wins += 1;
          row2.losses += 1;
          row1.points += 3;
        } else if (s2 > s1) {
          row2.wins += 1;
          row1.losses += 1;
          row2.points += 3;
        } else {
          row1.draws += 1;
          row2.draws += 1;
          row1.points += 1;
          row2.points += 1;
        }
        continue;
      }

      if (match.winner_id === match.player1_id) {
        row1.wins += 1;
        row2.losses += 1;
        row1.points += 3;
      } else if (match.winner_id === match.player2_id) {
        row2.wins += 1;
        row1.losses += 1;
        row2.points += 3;
      }
    }

    return Array.from(table.values())
      .map((row) => ({ ...row, diff: row.scored - row.conceded }))
      .sort((a, b) => (b.points - a.points) || (b.diff - a.diff) || (b.wins - a.wins) || a.playerName.localeCompare(b.playerName));
  }, [matches, eliminationType, playerNames]);

  const handleZoomIn = () => setZoom((current) => clampZoom(current + ZOOM_STEP));
  const handleZoomOut = () => setZoom((current) => clampZoom(current - ZOOM_STEP));
  const handleResetView = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isLargeBracket) return;
    dragOrigin.current = { x: event.clientX - offset.x, y: event.clientY - offset.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragOrigin.current) return;
    setOffset({ x: event.clientX - dragOrigin.current.x, y: event.clientY - dragOrigin.current.y });
  };

  const handlePointerUp = () => {
    dragOrigin.current = null;
  };

  const handleOpenMatchWinnerSelection = (match: MatchWithScores) => {
    if (!isCreator || match.status !== 'En curso' || !match.player1_id || !match.player2_id) return;
    const suggestedWinner = match.winner_id ?? match.player1_id;
    onSelectWinner(match.id, suggestedWinner);
  };

  const actionableMatches = (matches as MatchWithScores[]).filter(
    (match) => isCreator && match.status === 'En curso' && match.player1_id && match.player2_id,
  );

  const swissSummary = useMemo(() => {
    if (!isSwiss) return [] as Array<{ round: number; total: number; finished: number; live: number }>;
    return roundsForLeague.map((round) => ({
      round: round.round,
      total: round.matches.length,
      finished: round.matches.filter((match) => match.status === 'Finalizado').length,
      live: round.matches.filter((match) => match.status === 'En curso').length,
    }));
  }, [roundsForLeague, eliminationType]);

  const renderSwissBoard = () => (
    <div className="league-shell">
      <div className="league-summary-card">
        <h3>Tabla por jornada</h3>
        <table className="league-summary-table">
          <thead>
            <tr>
              <th>Jornada</th>
              <th>Partidos</th>
              <th>Finalizados</th>
              <th>En curso</th>
            </tr>
          </thead>
          <tbody>
            {swissSummary.map((row) => (
              <tr key={row.round}>
                <td>{toRoundLabel(row.round)}</td>
                <td>{row.total}</td>
                <td>{row.finished}</td>
                <td>{row.live}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="league-board">
        {roundsForLeague.map((round) => (
          <section key={round.round} className="league-round-column">
            <h3>{toRoundLabel(round.round)}</h3>
            {round.matches.map((match) => (
              <motion.article
                key={match.id}
                className="match-box bracket-match-card"
                onClick={() => handleOpenMatchWinnerSelection(match)}
                style={isCreator && match.status === 'En curso' ? { cursor: 'pointer' } : undefined}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <header className="bracket-match-meta">
                  <span>Partido #{match.id}</span>
                  <span>{match.status}</span>
                </header>
                <div className="bracket-player-row">
                  <span className="player-name-cell">
                    <PlayerAvatar username={toPlayerLabel(match.player1_id)} avatarUrl={toPlayerAvatar(match.player1_id)} size="xs" />
                    {renderPlayerLabel(match.player1_id)}
                  </span>
                  <span className="bracket-player-score">{toScoreText(match, 'player1')}</span>
                </div>
                <div className="bracket-player-row">
                  <span className="player-name-cell">
                    <PlayerAvatar username={toPlayerLabel(match.player2_id)} avatarUrl={toPlayerAvatar(match.player2_id)} size="xs" />
                    {renderPlayerLabel(match.player2_id)}
                  </span>
                  <span className="bracket-player-score">{toScoreText(match, 'player2')}</span>
                </div>
              </motion.article>
            ))}
          </section>
        ))}
      </div>
    </div>
  );

  const renderRoundRobinBoard = () => (
    <div className="league-shell">
      <div className="league-summary-card">
        <h3>Tabla de posiciones</h3>
        <table className="league-summary-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Jugador</th>
              <th>PJ</th>
              <th>G</th>
              <th>E</th>
              <th>P</th>
              <th>DG</th>
              <th>PTS</th>
            </tr>
          </thead>
          <tbody>
            {roundRobinStandings.map((row, index) => (
              <tr key={row.playerId}>
                <td>{index + 1}</td>
                <td>
                  <Link to={`/profile/${row.playerId}`} className="player-profile-link">{row.playerName}</Link>
                </td>
                <td>{row.played}</td>
                <td>{row.wins}</td>
                <td>{row.draws}</td>
                <td>{row.losses}</td>
                <td>{row.diff}</td>
                <td><strong>{row.points}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="league-board">
        {roundsForLeague.map((round) => (
          <section key={round.round} className="league-round-column">
            <h3>{toRoundLabel(round.round)} · Fixtures</h3>
            {round.matches.map((match) => (
              <motion.article
                key={match.id}
                className="match-box bracket-match-card"
                onClick={() => handleOpenMatchWinnerSelection(match)}
                style={isCreator && match.status === 'En curso' ? { cursor: 'pointer' } : undefined}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <header className="bracket-match-meta">
                  <span>Partido #{match.id}</span>
                  <span>{match.status}</span>
                </header>
                <div className="bracket-player-row">
                  <span className="player-name-cell">
                    <PlayerAvatar username={toPlayerLabel(match.player1_id)} avatarUrl={toPlayerAvatar(match.player1_id)} size="xs" />
                    {renderPlayerLabel(match.player1_id)}
                  </span>
                  <span className="bracket-player-score">{toScoreText(match, 'player1')}</span>
                </div>
                <div className="bracket-player-row">
                  <span className="player-name-cell">
                    <PlayerAvatar username={toPlayerLabel(match.player2_id)} avatarUrl={toPlayerAvatar(match.player2_id)} size="xs" />
                    {renderPlayerLabel(match.player2_id)}
                  </span>
                  <span className="bracket-player-score">{toScoreText(match, 'player2')}</span>
                </div>
              </motion.article>
            ))}
          </section>
        ))}
      </div>
    </div>
  );

  const renderGenericLeagueBoard = () => (
    <div className="league-board">
      {roundsForLeague.map((round) => (
        <section key={round.round} className="league-round-column">
          <h3>{toRoundLabel(round.round)}</h3>
          {round.matches.map((match) => (
            <motion.article
              key={match.id}
              className="match-box bracket-match-card"
              onClick={() => handleOpenMatchWinnerSelection(match)}
              style={isCreator && match.status === 'En curso' ? { cursor: 'pointer' } : undefined}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <header className="bracket-match-meta">
                <span>Partido #{match.id}</span>
                <span>{match.status}</span>
              </header>
              <div className="bracket-player-row">
                <span className="player-name-cell">
                  <PlayerAvatar username={toPlayerLabel(match.player1_id)} avatarUrl={toPlayerAvatar(match.player1_id)} size="xs" />
                  {renderPlayerLabel(match.player1_id)}
                </span>
                <span className="bracket-player-score">{toScoreText(match, 'player1')}</span>
              </div>
              <div className="bracket-player-row">
                <span className="player-name-cell">
                  <PlayerAvatar username={toPlayerLabel(match.player2_id)} avatarUrl={toPlayerAvatar(match.player2_id)} size="xs" />
                  {renderPlayerLabel(match.player2_id)}
                </span>
                <span className="bracket-player-score">{toScoreText(match, 'player2')}</span>
              </div>
              {match.scheduled_datetime && (
                <p className="match-next-line">Programado: <code>{toDisplayDate(match.scheduled_datetime)}</code></p>
              )}
            </motion.article>
          ))}
        </section>
      ))}
    </div>
  );

  const renderBracketBoard = () => {
    if (isRoundRobin) {
      return renderRoundRobinBoard();
    }

    if (isSwiss) {
      return renderSwissBoard();
    }

    if (!isEliminationFormat) {
      return renderGenericLeagueBoard();
    }

    if (singleEliminationMatch) {
      const winner = singleEliminationMatch.winner_id ? toPlayerLabel(singleEliminationMatch.winner_id) : 'Por definir';
      return (
        <div className="bracket-library-shell">
          <div className="bracket-overview-head">
            <span className="bracket-overview-type">{eliminationType}</span>
            <span>{toStatusWithIcon(singleEliminationMatch.status)} · 1 partido</span>
          </div>
          <div className="single-final-stage">
            <div className="bracket-column-labels bracket-column-labels--compact">
              <span className="bracket-column-title">Partido final</span>
              <span className="bracket-column-title">Ganador</span>
            </div>
            <div className="single-final-wrap">
              <article
                className="single-final-card bracket-match-card"
                onClick={() => handleOpenMatchWinnerSelection(singleEliminationMatch)}
                style={isCreator && singleEliminationMatch.status === 'En curso' ? { cursor: 'pointer' } : undefined}
              >
                <header className="bracket-match-meta">
                  <span>Partido #{singleEliminationMatch.id}</span>
                  <span>{singleEliminationMatch.status}</span>
                </header>
                {singleEliminationMatch.scheduled_datetime && (
                  <p className="single-final-date">{toDisplayDate(singleEliminationMatch.scheduled_datetime)}</p>
                )}
                <div className="bracket-player-row">
                <span className="player-name-cell">
                  <PlayerAvatar username={toPlayerLabel(singleEliminationMatch.player1_id)} avatarUrl={toPlayerAvatar(singleEliminationMatch.player1_id)} size="xs" />
                  {renderPlayerLabel(singleEliminationMatch.player1_id)}
                </span>
                <span className="bracket-player-score">{toScoreText(singleEliminationMatch, 'player1')}</span>
              </div>
              <div className="bracket-player-row">
                <span className="player-name-cell">
                  <PlayerAvatar username={toPlayerLabel(singleEliminationMatch.player2_id)} avatarUrl={toPlayerAvatar(singleEliminationMatch.player2_id)} size="xs" />
                  {renderPlayerLabel(singleEliminationMatch.player2_id)}
                </span>
                  <span className="bracket-player-score">{toScoreText(singleEliminationMatch, 'player2')}</span>
                </div>
              </article>

              <div className="single-final-connector" aria-hidden="true" />

              <div className="bracket-champion-box bracket-winner-card">
                <span className="champ-label">🏆 Campeón del torneo</span>
                <span className="champ-name">{winner}</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="bracket-library-shell">
        <div className="bracket-overview-head">
          <span className="bracket-overview-type">{eliminationType}</span>
          <span>{toStatusWithIcon(isTournamentFinished ? 'Finalizado' : 'En progreso')} · {totalMatches} partidos</span>
        </div>
        {championLabel && (
          <div className="bracket-champion-banner">
            <span>Campeon del torneo</span>
            <strong>{championLabel}</strong>
          </div>
        )}
        <div className="bracket-library-wrap">
          <div className="bracket-column-labels">
            {eliminationRoundLabels.map((label, index) => (
              <span key={`${label}-${index}`}>{label}</span>
            ))}
            {championLabel && <span>Ganador</span>}
          </div>

          <div className="bracket-elimination-main">
            <div className="bracket-library-finals">
              {eliminationFinalGames.map((game) => (
                <div key={game.id} className="bracket-library-final-item">
                  <Bracket
                    game={game}
                    GameComponent={(props) => (
                      <BracketGameCard
                        {...props}
                        playerAvatars={playerAvatars}
                        onOpenPlayerProfile={(playerId) => navigate(`/profile/${playerId}`)}
                        selectableMatchIds={selectableMatchIds}
                        onOpenMatchResult={(matchId) => {
                          const match = (matches as MatchWithScores[]).find((item) => item.id === matchId);
                          if (match) {
                            handleOpenMatchWinnerSelection(match);
                          }
                        }}
                      />
                    )}
                    gameDimensions={{ width: BRACKET_GAME_WIDTH, height: BRACKET_GAME_HEIGHT }}
                    roundSeparatorWidth={62}
                    lineInfo={{ yOffset: 0, separation: 10, homeVisitorSpread: 16 }}
                  />
                </div>
              ))}
            </div>

            {championLabel && (
              <div className="bracket-winner-side">
                <div className="bracket-winner-side-line" aria-hidden="true" />
                <div className="bracket-champion-box bracket-winner-card">
                  <span className="champ-label">🏆 Campeón del torneo</span>
                  <span className="champ-name">{championLabel}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const board = renderBracketBoard();

  return (
    <div>
      {isLargeBracket ? (
        <>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem' }}>
            <button onClick={handleZoomOut} className="btn btn-secondary" style={{ padding: '0.2rem 0.7rem' }}>
              −
            </button>
            <span style={{ minWidth: '3.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              {Math.round(zoom * 100)}%
            </span>
            <button onClick={handleZoomIn} className="btn btn-secondary" style={{ padding: '0.2rem 0.7rem' }}>
              +
            </button>
            <button onClick={handleResetView} className="btn btn-secondary" style={{ padding: '0.2rem 0.7rem' }}>
              Restablecer vista
            </button>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Arrastra para desplazarte ({participantCount} participantes)
            </span>
          </div>
          <div
            className="bracket-viewport"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            <div
              className="bracket-canvas"
              style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }}
            >
              {board}
            </div>
          </div>
        </>
      ) : (
        <div className="bracket-inline-wrap">
          {board}
        </div>
      )}
      {actionableMatches.length > 0 && isCreator && (
        <p className="match-next-line" style={{ marginTop: '0.6rem' }}>
          Haz clic sobre un partido en curso para registrar resultado.
        </p>
      )}
    </div>
  );
};
