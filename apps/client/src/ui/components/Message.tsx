import React from 'react';
import { Box, Text } from 'ink';

interface Props {
  message: {
    content: string;
    senderPubKey: string;
    createdAt: string;
    nonce: string;
  };
  isOwn: boolean;
}

export function MessageItem({ message, isOwn }: Props) {
  const time = new Date(message.createdAt).toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit'
  });
  const sender = message.senderPubKey.slice(0, 8);

  let content: string;
  try {
    const parsed = JSON.parse(Buffer.from(message.content, 'base64').toString());
    content = parsed.content || message.content;
  } catch {
    content = Buffer.from(message.content, 'base64').toString();
  }

  return (
    <Box>
      <Text color="blue">{time}</Text>
      <Text> {'▚ '} </Text>
      <Text bold color={isOwn ? 'green' : 'cyan'}>{sender}</Text>
      <Text>: </Text>
      <Text>{content.trim().replace(/^['"]|['"]$/g, '')}</Text>
    </Box>
  );
}
