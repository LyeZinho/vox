import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Modal } from './Modal.js';
import { Spinner } from './Spinner.js';
import { useTheme } from '../theme.js';
import { store } from '../../core/store.js';

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
}

export function UnlockScreen({ onSuccess, onCancel }: Props) {
  const { colors } = useTheme();
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState('');

  useInput((input, key) => {
    if (status === 'loading') return;
    if (input) setPassword(p => p + input);
    if (key.backspace) setPassword(p => p.slice(0, -1));
    if (key.return) handleSubmit();
  });

  async function handleSubmit() {
    if (!password) { setError('Digite a senha'); return; }
    setStatus('loading');
    try {
      await store.unlockVault(password);
      onSuccess();
    } catch (e: any) {
      setError('Senha incorreta');
      setPassword('');
      setStatus('error');
    }
  }

  return (
    <Modal width={62} height={14} label=" 🮄 Desbloquear Cofre 🮄 ">
      <Box flexDirection="column" gap={1}>
        <Text bold color={colors.primary}>🮄 Desbloquear Cofre 🮄</Text>
        <Box>
          <Text>Senha: </Text>
          <Text color={colors.textMuted}>{'*'.repeat(password.length) || '(digite)'}</Text>
        </Box>
        {error && <Text color={colors.danger}>{error}</Text>}
        {status === 'loading' && <Spinner label="Desbloqueando..." />}
        <Box marginTop={1}>
          <Text>Enter=submeter · Backspace=deletar</Text>
        </Box>
      </Box>
    </Modal>
  );
}
