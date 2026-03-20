import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../theme.js';

interface Props {
  secret: string;
  onComplete: () => void;
}

export function QRCode({ secret, onComplete }: Props) {
  const { colors } = useTheme();

  const asciiQR = [
    ' ████████ ████████ ',
    ' ██    ██ ██    ██ ',
    ' ██ ██ ██ ██ ██ ██ ',
    ' ██    ██ ██    ██ ',
    ' ████████ ████████ ',
    '                 ',
    ' ████████████████ ',
    ' ██ ██  ██  ██ ██ ',
    ' ██ ██  ██  ██ ██ ',
    ' ██            ██ ',
    ' ████████████████ ',
  ];

  return (
    <Box flexDirection="column" borderStyle="round" paddingX={1} paddingY={1}
      borderColor={colors.primary} backgroundColor={colors.background}
    >
      <Text bold color={colors.primary}>🮇 2FA Setup</Text>
      <Box marginY={1} flexDirection="column">
        {asciiQR.map((line, i) => (
          <Text key={i} color={colors.accent}>{line}</Text>
        ))}
      </Box>
      <Box marginY={1}>
        <Text color={colors.textMuted}>
          Ou insira manualmente:
        </Text>
      </Box>
      <Text color={colors.warning}>{secret}</Text>
    </Box>
  );
}
