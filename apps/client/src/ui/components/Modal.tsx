import { Box, Text } from 'ink';
import { useTheme } from '../theme.js';
import type { ReactNode } from 'react';

interface Props {
  width?: number;
  height?: number;
  label?: string;
  children: ReactNode;
}

export function Modal({ width = 60, height = 12, label, children }: Props) {
  const { colors } = useTheme();
  return (
    <Box
      flexDirection="column"
      width={width}
      height={height}
      borderStyle="round"
      paddingX={1}
      borderColor={colors.primary}
      backgroundColor={colors.background}
    >
      {label && (
        <Text bold color={colors.primary}>{` ${label} `}</Text>
      )}
      <Box paddingTop={1}>{children}</Box>
    </Box>
  );
}
