import { RefObject, useRef, useState } from 'react';
import { uploadMyAvatarFile, updateMyAvatarUrl } from '../services/players';
import { Player } from '../types/models';
import { getBackendErrorMessage } from '../services/errorHandler';
import { mergeStoredUserProfile } from '../utils/storage';

export interface AvatarUploadResult {
  avatarFile: File | null;
  isUploading: boolean;
  message: string;
  setAvatarFile: (file: File | null) => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  openFilePicker: () => void;
  uploadAvatar: () => Promise<Player | null>;
  removeAvatar: () => Promise<Player | null>;
}

export const useAvatarUpload = (isOwnProfile: boolean): AvatarUploadResult => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState('');

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const clearAvatarState = () => {
    setAvatarFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadAvatar = async (): Promise<Player | null> => {
    if (!isOwnProfile || !avatarFile) return null;
    setMessage('');
    setIsUploading(true);
    try {
      const updated = await uploadMyAvatarFile(avatarFile);
      mergeStoredUserProfile({ avatar_url: updated.avatar_url });
      clearAvatarState();
      setMessage('Foto subida y actualizada correctamente.');
      return updated;
    } catch (error: unknown) {
      setMessage(getBackendErrorMessage(error, 'No se pudo subir la foto de perfil.'));
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const removeAvatar = async (): Promise<Player | null> => {
    if (!isOwnProfile) return null;
    setMessage('');
    setIsUploading(true);
    try {
      const updated = await updateMyAvatarUrl(null);
      mergeStoredUserProfile({ avatar_url: updated.avatar_url });
      clearAvatarState();
      setMessage('Foto eliminada. Se muestra avatar por iniciales.');
      return updated;
    } catch (error: unknown) {
      setMessage(getBackendErrorMessage(error, 'No se pudo eliminar la foto de perfil.'));
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    avatarFile,
    isUploading,
    message,
    setAvatarFile,
    fileInputRef,
    openFilePicker,
    uploadAvatar,
    removeAvatar,
  };
};
