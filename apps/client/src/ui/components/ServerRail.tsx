import { Box } from 'ink';
import { useTheme } from '../theme.js';

export function ServerRail() {
  const { colors } = useTheme();
  return (
    <Box width={8} height="100%" style={{ bg: colors.serverRail }} />
  );
}
