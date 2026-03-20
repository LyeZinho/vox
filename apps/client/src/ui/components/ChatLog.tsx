import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../theme.js';
import type { Message } from '../../core/api.js';

interface Props {
  messages: Message[];
}

export function ChatLog({ messages }: Props) {
  const { colors } = useTheme();
  return (
    <Box flexGrow={1} flexDirection="column"
      borderStyle="round" paddingX={1}
      style={{ borderColor: colors.primary, bg: colors.background }}
    >
      {messages.length === 0 && (
        <Text dim color={colors.textMuted}>Nenhuma mensagem. Digite algo abaixo.</Text>
      )}
      {messages.map(msg => (
        <Text key={msg.nonce}>
          {new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          {' '}{msg.senderPubKey.slice(0, 8)}: {Buffer.from(msg.content, 'base64').toString().trim()}
        </Text>
      ))}
    </Box>
  );
}
