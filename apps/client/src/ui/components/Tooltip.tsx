import { Box, Text } from 'ink';
import { useTheme } from '../theme.js';

interface Props {
  text: string;
  x: number;
  y: number;
}

export function Tooltip({ text, x, y }: Props) {
  const { colors } = useTheme();
  return (
    <Box
      position="absolute"
      marginLeft={x}
      marginTop={y}
      borderStyle="round"
      paddingX={1}
      paddingY={0}
      borderColor={colors.primary}
      backgroundColor={colors.sidebar}
    >
      <Text color={colors.text}>{text}</Text>
    </Box>
  );
}
