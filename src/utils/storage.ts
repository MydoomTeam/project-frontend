export type StoredUserProfile = {
  id?: number;
  username?: string;
  role?: string;
  global_elo?: number;
  avatar_url?: string | null;
};

const USER_PROFILE_KEY = 'user_profile';

export const parseStoredUserProfile = (rawUser: string | null): StoredUserProfile | null => {
  if (!rawUser) return null;

  try {
    return JSON.parse(rawUser) as StoredUserProfile;
  } catch {
    return null;
  }
};

export const getStoredUserProfile = (): StoredUserProfile | null =>
  parseStoredUserProfile(localStorage.getItem(USER_PROFILE_KEY));

export const setStoredUserProfile = (profile: StoredUserProfile): void => {
  localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
};

export const mergeStoredUserProfile = (next: StoredUserProfile): void => {
  const current = getStoredUserProfile();
  if (!current) return;
  setStoredUserProfile({ ...current, ...next });
};
