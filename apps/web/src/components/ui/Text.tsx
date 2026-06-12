import type { CSSProperties, ElementType, ReactNode } from 'react';
import { textPresets, type TextPresetName } from '../../lib/textPresets';

type TextProps<T extends ElementType = 'span'> = {
  as?: T;
  children: ReactNode;
  preset?: TextPresetName;
  className?: string;
  style?: CSSProperties;
} & Omit<
  React.ComponentPropsWithoutRef<T>,
  'as' | 'children' | 'className' | 'style'
>;

function mergeStyles(
  base?: CSSProperties,
  override?: CSSProperties,
): CSSProperties | undefined {
  if (!base && !override) {
    return undefined;
  }

  return {
    ...(base ?? {}),
    ...(override ?? {}),
  };
}

export function Text<T extends ElementType = 'span'>({
  as,
  children,
  preset = 'body',
  className = '',
  style,
  ...props
}: TextProps<T>) {
  const Component = as ?? 'span';
  const presetConfig = textPresets[preset];

  return (
    <Component
      className={`${presetConfig.className ?? ''} ${className}`.trim()}
      style={mergeStyles(presetConfig.style, style)}
      {...props}
    >
      {children}
    </Component>
  );
}
