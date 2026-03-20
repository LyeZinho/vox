import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../theme.js';

interface Props {
  users: string[];
  onSelect: (pubKey: string) => void;
}

export function UserList({ users, onSelect }: Props) {
  const { colors } = useTheme();

  return (
    <Box
      width={22}
      height="100%"
      flexDirection="column"
      borderStyle="round"
      borderColor={colors.primary}
      backgroundColor={colors.sidebar}
    >
      <Box paddingX={1} paddingY={0}>
        <Text bold color={colors.primary}>🮇 ONLINE</Text>
      </Box>
      <Box flexDirection="column" flexGrow={1}>
        {users.length === 0 && (
          <Text color={colors.textMuted}>  Nenhum usuário</Text>
        )}
        {users.map((user, i) => (
          <Box key={i} paddingX={1}>
            <Text
              color={colors.textMuted}
            >
              {' '}🮇 {user.slice(0, 8)}
            </Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
