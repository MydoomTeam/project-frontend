import React from 'react';

interface PlayerAvatarProps {
  username?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

/** Deterministic palette — dark blue / teal tones matching the app design system. */
const AVATAR_PALETTE = [
  { bg: 'rgba(10, 46, 92, 0.92)', border: 'rgba(74, 144, 226, 0.55)', text: '#93c5fd' },
  { bg: 'rgba(8, 68, 90, 0.92)',  border: 'rgba(31, 216, 229, 0.45)', text: '#67e8f9' },
  { bg: 'rgba(14, 52, 84, 0.92)', border: 'rgba(96, 165, 250, 0.45)', text: '#bfdbfe' },
  { bg: 'rgba(20, 44, 76, 0.92)', border: 'rgba(129, 140, 248, 0.45)', text: '#c7d2fe' },
  { bg: 'rgba(7, 72, 80, 0.92)',  border: 'rgba(94, 234, 212, 0.45)', text: '#99f6e4' },
  { bg: 'rgba(16, 52, 72, 0.92)', border: 'rgba(125, 211, 252, 0.45)', text: '#7dd3fc' },
  { bg: 'rgba(24, 40, 68, 0.92)', border: 'rgba(167, 139, 250, 0.45)', text: '#ddd6fe' },
  { bg: 'rgba(10, 60, 76, 0.92)', border: 'rgba(52, 211, 153, 0.45)', text: '#6ee7b7' },
];

const SIZE_PX: Record<NonNullable<PlayerAvatarProps['size']>, number> = {
  xs: 22,
  sm: 30,
  md: 40,
  lg: 64,
};

const FONT_SIZE: Record<NonNullable<PlayerAvatarProps['size']>, string> = {
  xs: '0.58rem',
  sm: '0.65rem',
  md: '0.85rem',
  lg: '1.35rem',
};

const hashUsername = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) >>> 0;
  }
  return h;
};

const getInitials = (username?: string | null): string => {
  if (!username?.trim()) return 'AS';
  const clean = username.trim();
  if (clean.length <= 2) return clean.toUpperCase();
  const parts = clean.split(/[\s._\-#]+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return clean.slice(0, 2).toUpperCase();
};

export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({ username, size = 'md', className }) => {
  const initials = getInitials(username);
  const idx = username?.trim() ? hashUsername(username.trim()) % AVATAR_PALETTE.length : 0;
  const color = AVATAR_PALETTE[idx];
  const px = SIZE_PX[size];

  return (
    <span
      className={`player-avatar player-avatar--${size}${className ? ` ${className}` : ''}`}
      aria-hidden="true"
      style={{
        width: px,
        height: px,
        minWidth: px,
        background: color.bg,
        color: color.text,
        border: `1px solid ${color.border}`,
        fontSize: FONT_SIZE[size],
      }}
    >
      {initials}
    </span>
  );
};
