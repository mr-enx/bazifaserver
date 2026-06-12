import type { CSSProperties } from 'react';

export type TextPresetName =
  | 'body'
  | 'title'
  | 'dialogTitle'
  | 'outlinedWhite'
  | 'levelBadge';

export type TextPreset = {
  className?: string;
  style?: CSSProperties;
};

const outerTextOutline = `
  1px 0 0 #000,
  -1px 0 0 #000,
  0 1px 0 #000,
  0 -1px 0 #000,
  1px 1px 0 #000,
  -1px 1px 0 #000,
  1px -1px 0 #000,
  -1px -1px 0 #000
`;

const bottomTextShadow = '0 3px 0 rgba(0, 0, 0, 0.45)';

export const textPresets: Record<TextPresetName, TextPreset> = {
  body: {
    className: 'font-body text-base text-ink',
  },

  title: {
    className: 'font-display text-xl font-bold text-ink',
  },

  dialogTitle: {
    className: 'font-display text-2xl font-bold text-ink',
  },

  outlinedWhite: {
    className: 'text-white',
    style: {
      fontFamily: 'Supercell Magic, sans-serif',
      fontWeight: 400,
      textShadow: `${outerTextOutline}, ${bottomTextShadow}`,
    },
  },

  levelBadge: {
    className: 'text-[13px] leading-none tracking-[-0.5px] text-white',
    style: {
      fontFamily: 'Supercell Magic, sans-serif',
      fontWeight: 400,
      textShadow: `${outerTextOutline}, ${bottomTextShadow}`,
    },
  },
};
