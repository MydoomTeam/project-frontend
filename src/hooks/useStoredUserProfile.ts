import { useEffect, useMemo, useState } from 'react';
import { getStoredUserProfile, parseStoredUserProfile, StoredUserProfile } from '../utils/storage';

export const useStoredUserProfile = (): StoredUserProfile | null => {
  const [profile, setProfile] = useState<StoredUserProfile | null>(() => getStoredUserProfile());

  useEffect(() => {
    const handleStorageChange = () => {
      setProfile(parseStoredUserProfile(localStorage.getItem('user_profile')));
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return useMemo(() => profile, [profile]);
};
