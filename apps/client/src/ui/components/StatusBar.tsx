import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../theme.js';
import type { AppState } from '../../core/store.js';

interface Props {
  state: AppState;
}

export function StatusBar({ state }: Props) {
  const { colors } = useTheme();
  const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const pubKey = state.pubKey ? state.pubKey.slice(0, 8) : '---';

  const connMap = {
    connected: { icon: '█', color: 'green', label: 'Online' },
    connecting: { icon: '▒', color: 'yellow', label: 'Connecting' },
    disconnected: { icon: '░', color: 'red', label: 'Off' },
    error: { icon: '▓', color: 'red', label: 'Error' },
  };

  const conn = connMap[state.connectionStatus] || connMap.disconnected;

  return (
    <Box width="100%" height={1} paddingX={1} backgroundColor={colors.serverRail}>
      <Text color={conn.color}>{conn.icon}</Text>
      <Text color={colors.text}> {conn.label} ┃ </Text>
      <Text bold color={colors.text}>{state.isUnlocked ? '▓ SECURE' : '░ LOCKED'}</Text>
      <Text color={colors.text}> ┃ 🮇 {pubKey} ┃ 🕒 {time}</Text>
    </Box>
  );
}
