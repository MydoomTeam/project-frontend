import React, { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';

import { updateAdminPassword } from '../services/players';
import { passwordUpdateSchema, PasswordUpdateFormValues } from '../validation/schemas';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useAvatarUpload } from '../hooks/useAvatarUpload';
import { useProfileData } from '../hooks/useProfileData';
import { ProfileHero } from '../components/profile/overview/ProfileHero';
import { ProfilePasswordPanel } from '../components/profile/security/ProfilePasswordPanel';
import { ProfileEloHistory } from '../components/profile/history/ProfileEloHistory';
import { ProfileStats } from '../components/profile/overview/ProfileStats';
import { ProfileSummaryPanel } from '../components/profile/overview/ProfileSummaryPanel';
import { ProfileTournamentHistoryPanel } from '../components/profile/history/ProfileTournamentHistoryPanel';

const formatDate = (value?: string): string => {
  if (!value) return 'Sin registro';
  const normalized = value.trim();
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return `${day}/${month}/${year}`;
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return normalized;
  return parsed.toLocaleDateString('es-CO');
};

const toRoleLabel = (role?: string): string => {
  if (!role) return 'Usuario';
  return role.toUpperCase().includes('ADMIN') ? 'Administrador' : 'Jugador';
};

export const Profile: React.FC = () => {
  const {
    player,
    tournamentHistory,
    eloHistory,
    errorMessage,
    isOwnProfile,
    setPlayer,
    setErrorMessage,
  } = useProfileData();

  const {
    avatarFile,
    isUploading,
    message: avatarMessage,
    setAvatarFile,
    fileInputRef,
    openFilePicker,
    uploadAvatar,
    removeAvatar,
  } = useAvatarUpload(isOwnProfile);

  const [successMessage, setSuccessMessage] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordUpdateFormValues>({
    resolver: zodResolver(passwordUpdateSchema),
    defaultValues: {
      current_password: '',
      password: '',
      password_confirm: '',
    },
  });

  const handlePasswordUpdate = async (values: PasswordUpdateFormValues) => {
    if (!isOwnProfile) return;
    setSuccessMessage('');
    setErrorMessage('');

    try {
      await updateAdminPassword(values);
      setSuccessMessage('Contraseña actualizada correctamente.');
      reset();
    } catch (error: unknown) {
      setSuccessMessage('');
      setErrorMessage('No se pudo actualizar la contraseña.');
    }
  };

  const handleAvatarUpload = async () => {
    setErrorMessage('');
    const updated = await uploadAvatar();
    if (updated) {
      setPlayer(updated);
    }
  };

  const handleAvatarRemove = async () => {
    setErrorMessage('');
    const updated = await removeAvatar();
    if (updated) {
      setPlayer(updated);
    }
  };

  const createdCount = tournamentHistory.filter((entry) => entry.is_creator).length;
  const participantCount = tournamentHistory.filter((entry) => !entry.is_creator).length;
  const activeCount = tournamentHistory.filter(
    (entry) => entry.status === 'Listo para iniciar' || entry.status === 'En curso',
  ).length;
  const eloEntriesCount = eloHistory.length;

  const recentHistory = useMemo(
    () => [...tournamentHistory].sort((a, b) => b.id - a.id).slice(0, 6),
    [tournamentHistory],
  );

  const sortedEloHistory = useMemo(
    () => [...eloHistory].sort((first, second) => {
      const firstDate = new Date(first.change_date).getTime();
      const secondDate = new Date(second.change_date).getTime();
      if (firstDate !== secondDate) return firstDate - secondDate;
      return first.id - second.id;
    }),
    [eloHistory],
  );

  const eloCurrentValue = player?.global_elo ?? 0;
  const eloMin = sortedEloHistory.length ? Math.min(...sortedEloHistory.map((item) => item.current_elo)) : null;
  const eloMax = sortedEloHistory.length ? Math.max(...sortedEloHistory.map((item) => item.current_elo)) : null;
  const latestEloDelta = sortedEloHistory.length
    ? sortedEloHistory[sortedEloHistory.length - 1].current_elo - sortedEloHistory[sortedEloHistory.length - 1].previous_elo
    : 0;

  return (
    <div className="pr-page">
      {errorMessage && <div className="dashboard-error-banner">{errorMessage}</div>}

      <motion.section className="dashboard-panel pr-hero" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
        {player ? (
          <ProfileHero
            username={player.username}
            avatarUrl={player.avatar_url}
            email={player.email}
            roleLabel={toRoleLabel(player.role)}
            lastAccessDate={player.last_access_date}
            globalElo={player.global_elo}
            isOwnProfile={isOwnProfile}
            avatarFile={avatarFile}
            fileInputRef={fileInputRef}
            onFileChange={setAvatarFile}
            onOpenPicker={openFilePicker}
            onUploadAvatar={handleAvatarUpload}
            onRemoveAvatar={handleAvatarRemove}
            isUploading={isUploading}
            avatarMessage={avatarMessage}
          />
        ) : (
          <LoadingSpinner message="Cargando perfil..." />
        )}
      </motion.section>

      <ProfileStats
        createdCount={createdCount}
        participantCount={participantCount}
        eloCurrentValue={eloCurrentValue}
        eloEntriesCount={eloEntriesCount}
      />

      <section className="pr-main-grid">
        <div className="pr-main-left">
          <ProfilePasswordPanel
            isOwnProfile={isOwnProfile}
            successMessage={successMessage}
            errors={errors}
            isSubmitting={isSubmitting}
            register={register}
            handleSubmit={handleSubmit}
            onSubmitPassword={handlePasswordUpdate}
          />

          <ProfileEloHistory
            sortedEntries={sortedEloHistory}
            entriesCount={eloEntriesCount}
            minValue={eloMin}
            maxValue={eloMax}
            latestDelta={latestEloDelta}
            currentElo={eloCurrentValue}
            formatDate={formatDate}
          />
        </div>

        <aside className="pr-main-right">
          <ProfileSummaryPanel
            player={player}
            isOwnProfile={isOwnProfile}
            activeCount={activeCount}
            recentHistory={recentHistory}
            formatDate={formatDate}
          />
        </aside>
      </section>

      <ProfileTournamentHistoryPanel tournamentHistory={tournamentHistory} />
    </div>
  );
};
