import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../theme.js';

interface Props {
  rooms: { id: string; name: string }[];
  currentRoom: string | null;
  onSelect: (roomId: string) => void;
}

export function Sidebar({ rooms, currentRoom, onSelect }: Props) {
  const { colors } = useTheme();

  return (
    <Box
      width={25}
      height="100%"
      flexDirection="column"
      borderStyle="round"
      borderColor={colors.primary}
      backgroundColor={colors.sidebar}
    >
      <Box paddingX={1} paddingY={0}>
        <Text bold color={colors.primary}>🮇 CANAIS</Text>
      </Box>
      <Box flexDirection="column" flexGrow={1}>
        {rooms.map(room => (
          <Box key={room.id} paddingX={1}>
            <Text
              bold={currentRoom === room.id}
              color={currentRoom === room.id ? colors.header : colors.textMuted}
              backgroundColor={currentRoom === room.id ? (colors.primary as any) : undefined}
            >
              {`# ${room.name || room.id}`}
            </Text>
          </Box>
        ))}
        {rooms.length === 0 && (
          <Text color={colors.textMuted}>  Nenhuma sala</Text>
        )}
      </Box>
    </Box>
  );
}
