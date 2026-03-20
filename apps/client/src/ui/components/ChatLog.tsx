import React, { useState, useMemo } from 'react';
import { Box, Text, Static, useInput } from 'ink';
import { useTheme } from '../theme.js';
import type { Message } from '../../core/api.js';

interface Props {
  messages: Message[];
  privacyMode?: boolean;
}

const VISIBLE_LINES = 20;

export function ChatLog({ messages, privacyMode = false }: Props) {
  const { colors } = useTheme();
  const [scrollOffset, setScrollOffset] = useState(0);

  useInput((input, key) => {
    if (key.upArrow) {
      setScrollOffset(o => Math.min(o + 1, Math.max(0, messages.length - VISIBLE_LINES)));
    }
    if (key.downArrow) {
      setScrollOffset(o => Math.max(0, o - 1));
    }
  });

  const visibleMessages = useMemo(() => {
    const start = Math.max(0, messages.length - VISIBLE_LINES - scrollOffset);
    const end = Math.max(0, messages.length - scrollOffset);
    return messages.slice(start, end);
  }, [messages, scrollOffset]);

  if (privacyMode) {
    return (
      <Box flexGrow={1} flexDirection="column"
        borderStyle="round" paddingX={1}
        borderColor={colors.primary}
        backgroundColor={colors.background}
      >
        <Box justifyContent="center" alignItems="center" flexGrow={1}>
          <Text bold color="yellow">🔒 MODO PRIVACIDADE ATIVO</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexGrow={1} flexDirection="column"
      borderStyle="round" paddingX={1}
      borderColor={colors.primary}
      backgroundColor={colors.background}
    >
      {messages.length === 0 && (
        <Text color={colors.textMuted}>Nenhuma mensagem. Digite algo abaixo.</Text>
      )}
      <Static items={visibleMessages}>
        {(msg) => {
          const time = new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          const sender = msg.senderPubKey.slice(0, 8);
          let content: string;
          try {
            const parsed = JSON.parse(Buffer.from(msg.content, 'base64').toString());
            content = parsed.content || msg.content;
          } catch {
            content = Buffer.from(msg.content, 'base64').toString();
          }
          return (
            <Box key={msg.nonce}>
              <Text color="blue">{time}</Text>
              <Text> </Text>
              <Text bold color="cyan">{sender}</Text>
              <Text>: </Text>
              <Text>{content.trim().replace(/^['"]|['"]$/g, '')}</Text>
            </Box>
          );
        }}
      </Static>
    </Box>
  );
}
