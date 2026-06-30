import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useTournamentDetail } from '../hooks/useTournamentDetail';
import { TournamentDetailHeader } from '../components/tournament/detail/TournamentDetailHeader';
import { TournamentDetailTabs } from '../components/tournament/detail/TournamentDetailTabs';
import { TournamentParticipantsPanel } from '../components/tournament/detail/TournamentParticipantsPanel';
import { TournamentResultModal } from '../components/tournament/detail/TournamentResultModal';
import { TournamentTechnicalPanel } from '../components/tournament/detail/TournamentTechnicalPanel';
import { TournamentHistoryPanel } from '../components/tournament/detail/TournamentHistoryPanel';
import { TournamentRankingPanel } from '../components/tournament/detail/TournamentRankingPanel';
import { BracketViewer } from '../components/tournament/detail/BracketViewer';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { PlayerAvatar } from '../components/ui/PlayerAvatar';
import { formatDateForDisplay } from '../utils/dateDisplay';

const toDisplayDate = (value?: string | null): string => formatDateForDisplay(value);

const getPlayerDisplayName = (playerId: number | null | undefined, playerNames: Record<number, string>): string => {
  if (playerId == null) return 'BYE';
  return playerNames[playerId] || `Jugador #${playerId}`;
};

const getPlayerEloLabel = (playerId: number | null | undefined, playerElos: Record<number, number | null>): string => {
  if (playerId == null) return '—';
  const value = playerElos[playerId];
  return typeof value === 'number' ? value.toLocaleString('es-CO') : '—';
};

export const TournamentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const tournamentId = Number(id ?? '0');
  const {
    tournament,
    matches,
    ranking,
    history,
    registrations,
    playerNames,
    playerAvatars,
    playerElos,
    currentUserId,
    isRegistered,
    hasPendingRegistration,
    hasConfirmedRegistration,
    isPlayerInTournament,
    isCreator,
    participantStatusLabel,
    error,
    registrationFilter,
    activeTab,
    pendingResult,
    pendingScore1,
    pendingScore2,
    isLoading,
    updatingRegistrationIds,
    registrationSummary,
    filteredRegistrations,
    canShowHistoryTab,
    canShowRankingTab,
    usesScoreMode,
    loadMyHistory,
    setActiveTab,
    setRegistrationFilter,
    setPendingScore1,
    setPendingScore2,
    closeResultModal,
    handleRegister,
    handleUnregister,
    handleCancelTournament,
    handleGenerateBracket,
    handleStartTournament,
    handleReportWinner,
    confirmPendingResult,
    handleRegistrationStatusChange,
    selectModalWinner,
  } = useTournamentDetail(tournamentId);

  const canSubmitScore = !usesScoreMode || (pendingScore1.trim() !== '' && pendingScore2.trim() !== '');

  if (!id || tournamentId <= 0) {
    return (
      <div className="dashboard-error-banner">
        Identificador de torneo inválido.
        <Link to="/tournaments" className="td-back-link">Volver a torneos</Link>
      </div>
    );
  }

  if (isLoading) {
    return <LoadingSpinner message="Cargando torneo..." />;
  }

  if (!tournament) {
    return (
      <div className="dashboard-error-banner">
        No se encontró el torneo.
        <Link to="/tournaments" className="td-back-link">Volver a torneos</Link>
      </div>
    );
  }

  const technicalRows = [
    {
      label: 'Creador',
      value: (
        <Link to={`/profile/${tournament.creator_id}`} className="player-profile-link" title="Ver perfil del creador">
          {playerNames[tournament.creator_id] || tournament.creator_name || `Administrador #${tournament.creator_id}`}
        </Link>
      ),
    },
    { label: 'Mi rol', value: isCreator ? 'Administrador del torneo' : (isPlayerInTournament ? 'Jugador inscrito' : 'No inscrito') },
    { label: 'Participantes confirmados', value: tournament.total_participants },
    { label: 'Juego', value: tournament.game_name },
    { label: 'Categoría', value: tournament.game_category },
    { label: 'Cupo objetivo', value: tournament.participant_target },
    { label: 'Duración por ronda', value: tournament.round_duration_minutes ? `${tournament.round_duration_minutes} min` : null },
    { label: 'Fecha de inicio', value: tournament.start_date ? toDisplayDate(tournament.start_date) : null },
    { label: 'Fecha de cierre', value: tournament.end_date ? toDisplayDate(tournament.end_date) : null },
    { label: 'Idioma', value: tournament.language },
    { label: 'Región', value: tournament.region },
  ].filter((row) => row.value !== null && row.value !== undefined && String(row.value).trim() !== '');

  return (
    <div className="td-page">
      <motion.div
        className="dashboard-panel td-header-panel"
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
      >
        <TournamentDetailHeader
          tournament={tournament}
          isCreator={isCreator}
          isRegistered={isRegistered}
          hasPendingRegistration={hasPendingRegistration}
          hasConfirmedRegistration={hasConfirmedRegistration}
          isPlayerInTournament={isPlayerInTournament}
          participantStatusLabel={participantStatusLabel}
          onRegister={handleRegister}
          onUnregister={handleUnregister}
          onCancelTournament={handleCancelTournament}
          onGenerateBracket={handleGenerateBracket}
          onStartTournament={handleStartTournament}
        />
      </motion.div>

      <motion.div
        className="dashboard-panel td-tabs-panel"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.03 }}
      >
        <TournamentDetailTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          canShowHistoryTab={canShowHistoryTab}
          canShowRankingTab={canShowRankingTab}
        />
      </motion.div>

      {error && <div className="dashboard-error-banner">{error}</div>}

      {activeTab === 'technical' && (
        <motion.div
          className="dashboard-panel"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 }}
        >
          <TournamentTechnicalPanel rows={technicalRows} />
        </motion.div>
      )}

      {activeTab === 'bracket' && (
        <motion.div
          className="dashboard-panel"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
        >
          <div className="dashboard-panel-head">
            <h2>Cuadro del torneo</h2>
          </div>
          {matches.length > 0 ? (
            <BracketViewer
              matches={matches}
              eliminationType={tournament.elimination_type}
              playerNames={playerNames}
              playerAvatars={playerAvatars}
              isCreator={isCreator}
              participantCount={tournament.total_participants ?? 0}
              usesScore={usesScoreMode}
              onSelectWinner={handleReportWinner}
            />
          ) : (
            <p className="dashboard-empty">
              Aún no se ha generado el cuadro del torneo.
            </p>
          )}
        </motion.div>
      )}

      {activeTab === 'technical' && isCreator && tournament.status === 'Pendiente' && (
        <motion.div
          className="dashboard-panel td-participants-panel"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <TournamentParticipantsPanel
            registrations={registrations}
            filteredRegistrations={filteredRegistrations}
            registrationFilter={registrationFilter}
            registrationSummary={registrationSummary}
            updatingRegistrationIds={updatingRegistrationIds}
            playerAvatars={playerAvatars}
            onFilterChange={setRegistrationFilter}
            onStatusChange={handleRegistrationStatusChange}
          />
        </motion.div>
      )}

      {activeTab === 'history' && currentUserId !== null && tournament.status !== 'Pendiente' && (
        <motion.div
          className="dashboard-panel"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
        >
          <div className="dashboard-panel-head">
            <div>
              <h2>Mi historial en este torneo</h2>
              <p>Tus enfrentamientos registrados.</p>
            </div>
            <button onClick={loadMyHistory} className="dashboard-panel-link">Ver historial</button>
          </div>
          <TournamentHistoryPanel
            history={history}
            currentUserId={currentUserId}
            playerNames={playerNames}
            playerAvatars={playerAvatars}
            loadMyHistory={loadMyHistory}
          />
        </motion.div>
      )}

      {activeTab === 'ranking' && tournament.status === 'Finalizado' && (
        <motion.div
          className="dashboard-panel"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
        >
          <div className="dashboard-panel-head">
            <h2>Clasificación final</h2>
          </div>
          <TournamentRankingPanel
            ranking={ranking}
            playerNames={playerNames}
            playerAvatars={playerAvatars}
          />
        </motion.div>
      )}

      <TournamentResultModal
        pendingResult={pendingResult}
        pendingMatch={matches.find((match) => match.id === pendingResult?.matchId) ?? null}
        playerNames={playerNames}
        playerAvatars={playerAvatars}
        playerElos={playerElos}
        currentUserId={currentUserId}
        usesScoreMode={usesScoreMode}
        pendingScore1={pendingScore1}
        pendingScore2={pendingScore2}
        canSubmitScore={canSubmitScore}
        onSelectWinner={selectModalWinner}
        onScore1Change={setPendingScore1}
        onScore2Change={setPendingScore2}
        onClose={closeResultModal}
        onConfirm={confirmPendingResult}
      />
    </div>
  );
};
