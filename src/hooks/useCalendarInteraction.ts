import { useEffect, useState, RefObject } from 'react';
import { CALENDAR_POPUP } from '../constants/tournament';

export const useCalendarPlacement = (
  ref: RefObject<HTMLDivElement | null>,
  isOpen: boolean,
) => {
  const [placement, setPlacement] = useState({ up: true, right: false });

  useEffect(() => {
    if (!isOpen || !ref.current) return;

    const updatePlacement = () => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();

      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const spaceRight = window.innerWidth - rect.left;

      const up = spaceBelow < CALENDAR_POPUP.HEIGHT && spaceAbove > spaceBelow;
      const right = spaceRight < CALENDAR_POPUP.WIDTH && rect.right > CALENDAR_POPUP.WIDTH;

      setPlacement({ up, right });
    };

    updatePlacement();

    const resizeHandler = () => updatePlacement();
    const scrollHandler = () => updatePlacement();

    window.addEventListener('resize', resizeHandler);
    window.addEventListener('scroll', scrollHandler, true);

    return () => {
      window.removeEventListener('resize', resizeHandler);
      window.removeEventListener('scroll', scrollHandler, true);
    };
  }, [isOpen, ref]);

  return placement;
};

export const useClickOutside = (
  ref: RefObject<HTMLDivElement | null>,
  onClickOutside: () => void,
) => {
  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClickOutside();
      }
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, onClickOutside]);
};
