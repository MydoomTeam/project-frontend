import React, { RefObject } from 'react';
import { FiCamera } from 'react-icons/fi';
import { PlayerAvatar } from '../../ui/PlayerAvatar';

interface Props {
  username: string;
  avatarUrl?: string | null;
  email: string;
  roleLabel: string;
  lastAccessDate?: string | null;
  globalElo: number;
  isOwnProfile: boolean;
  avatarFile: File | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFileChange: (file: File | null) => void;
  onOpenPicker: () => void;
  onUploadAvatar: () => Promise<void>;
  onRemoveAvatar: () => Promise<void>;
  isUploading: boolean;
  avatarMessage: string;
}

export const ProfileHero: React.FC<Props> = ({
  username,
  avatarUrl,
  email,
  roleLabel,
  lastAccessDate,
  globalElo,
  isOwnProfile,
  avatarFile,
  fileInputRef,
  onFileChange,
  onOpenPicker,
  onUploadAvatar,
  onRemoveAvatar,
  isUploading,
  avatarMessage,
}) => (
  <div className="pr-hero-grid">
    <div className="pr-hero-avatar-wrap">
      <PlayerAvatar
        username={username}
        avatarUrl={avatarUrl}
        size="lg"
        className="pr-hero-avatar"
      />
      <span className="pr-avatar-overlay" aria-hidden="true">
        <FiCamera />
      </span>
    </div>

    <div className="pr-hero-main">
      <div className="pr-name-row">
        <h1>{username}</h1>
        <span className="pr-role-chip">{roleLabel}</span>
      </div>
      <p className="pr-subline">{email}</p>
      <div className="pr-meta-row">
        <span>Último acceso: {lastAccessDate ?? 'Sin registro'}</span>
        <span>ELO global: {globalElo}</span>
      </div>

      <div className="pr-avatar-row">
        {isOwnProfile ? (
          <>
            <input
              ref={fileInputRef}
              id="avatar-file-input"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="pr-file-input"
              onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
            />
            <button type="button" className="tn-cta tn-cta-secondary pr-file-label" onClick={onOpenPicker}>
              <FiCamera aria-hidden="true" />
              Cambiar foto
            </button>
            <button
              type="button"
              className="tn-cta tn-cta-primary pr-avatar-btn"
              onClick={onUploadAvatar}
              disabled={!avatarFile || isUploading}
            >
              {isUploading ? 'Subiendo...' : 'Subir foto'}
            </button>
            <button
              type="button"
              className="tn-cta tn-cta-secondary pr-avatar-btn"
              onClick={onRemoveAvatar}
              disabled={!avatarUrl || isUploading}
            >
              Quitar foto
            </button>
          </>
        ) : (
          <span className="pr-side-soft">Perfil público</span>
        )}
      </div>

      {isOwnProfile && avatarFile && <p className="pr-avatar-file-name">Archivo listo: {avatarFile.name}</p>}
      {isOwnProfile && avatarMessage && <p className="pr-avatar-message">{avatarMessage}</p>}
    </div>
  </div>
);
