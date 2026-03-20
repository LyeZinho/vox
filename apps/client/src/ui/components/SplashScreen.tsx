import { Box, Text } from 'ink';
import { useState, useEffect } from 'react';
import { Spinner } from './Spinner.js';

interface Props {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: Props) {
  const [status, setStatus] = useState('Iniciando verificação de segurança...');

  useEffect(() => {
    const timer = setTimeout(() => {
      setStatus('VAX Chat v1.0.0 - Sistema íntegro.');
      setTimeout(onComplete, 1000);
    }, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <Box justifyContent="center" alignItems="center" flexDirection="column" height={20}>
      <Text bold color="cyan">{`
  ██╗   ██╗ █████╗ ██╗  ██╗
  ██║   ██║██╔══██╗╚██╗██╔╝
   ╚██╗ ██╔╝███████║ ╚███╔╝
    ╚████╔╝ ██╔══██║ ██╔██╗
     ╚██╔╝  ██║  ██║██╔╝ ██╗
      ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝
  ── Identity & Privacy ──`}</Text>
      <Box marginTop={2}>
        <Spinner label={status} />
      </Box>
    </Box>
  );
}
