import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const INACTIVITY_LIMIT_MS = 60 * 60 * 1000;
const ACTIVITY_EVENTS: Array<keyof WindowEventMap> = [
  'click',
  'keydown',
  'mousemove',
  'scroll',
  'touchstart',
];

const clearSession = (): void => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('user_profile');
};

export const SessionTimeoutManager: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!localStorage.getItem('access_token')) {
      return;
    }

    let timeoutId: number;

    const resetTimeout = () => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        clearSession();
        navigate('/login', { replace: true });
      }, INACTIVITY_LIMIT_MS);
    };

    resetTimeout();
    ACTIVITY_EVENTS.forEach((eventName) => window.addEventListener(eventName, resetTimeout));

    return () => {
      window.clearTimeout(timeoutId);
      ACTIVITY_EVENTS.forEach((eventName) => window.removeEventListener(eventName, resetTimeout));
    };
  }, [navigate]);

  return null;
};
