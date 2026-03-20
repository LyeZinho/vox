import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useTheme } from '../theme.js';

interface Props {
  onSubmit: (value: string) => void;
  onCommand?: (cmd: string) => void;
}

export function InputBar({ onSubmit, onCommand }: Props) {
  const { colors } = useTheme();
  const [value, setValue] = useState('');

  useInput((input, key) => {
    if (key.return) {
      const trimmed = value.trim();
      if (!trimmed) return;
      if (trimmed.startsWith('/') && onCommand) {
        onCommand(trimmed);
      } else {
        onSubmit(trimmed);
      }
      setValue('');
      return;
    }
    if (key.backspace) {
      setValue(v => v.slice(0, -1));
      return;
    }
    if (input && !key.ctrl && !key.meta) {
      setValue(v => v + input);
    }
  });

  return (
    <Box
      width="100%"
      height={3}
      paddingX={1}
      borderStyle="round"
      borderColor={colors.primary}
      backgroundColor={colors.background}
    >
      <Text color={colors.text}>{'> '}{value}</Text>
      <Text color={colors.textMuted}>_</Text>
    </Box>
  );
}
