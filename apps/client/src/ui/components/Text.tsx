import { Text as InkText } from 'ink';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  bold?: boolean | undefined;
  color?: string | undefined;
}

export function T({ children, bold, color }: Props) {
  const textProps: any = { children };
  if (bold !== undefined) textProps.bold = bold;
  if (color !== undefined) textProps.color = color;
  
  return <InkText {...textProps} />;
}
