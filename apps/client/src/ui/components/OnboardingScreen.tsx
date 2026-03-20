import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Modal } from './Modal.js';
import { Spinner } from './Spinner.js';
import { useTheme } from '../theme.js';
import { store } from '../../core/store.js';

interface Props {
  onSuccess: (pubKey: string) => void;
  onCancel: () => void;
}

export function OnboardingScreen({ onSuccess, onCancel }: Props) {
  const { colors } = useTheme();
  const [step, setStep] = useState<'email' | 'password' | 'confirm' | 'submitting' | 'mnemonic'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [entropyProgress, setEntropyProgress] = useState(0);
  const [mnemonic, setMnemonic] = useState('');

  useInput((input, key) => {
    if (step === 'submitting' || step === 'mnemonic') return;
    setEntropyProgress(p => Math.min(100, p + 2));
    if (input) {
      if (step === 'email') setEmail(e => e + input);
      else if (step === 'password') setPassword(p => p + input);
      else if (step === 'confirm') setConfirm(c => c + input);
    }
    if (key.backspace) {
      if (step === 'email') setEmail(e => e.slice(0, -1));
      else if (step === 'password') setPassword(p => p.slice(0, -1));
      else if (step === 'confirm') setConfirm(c => c.slice(0, -1));
    }
    if (key.return) handleSubmit();
    if (key.tab) {
      if (step === 'email') setStep('password');
      else if (step === 'password') setStep('confirm');
      else if (step === 'confirm') setStep('email');
    }
  });

  async function handleSubmit() {
    if (step !== 'submitting' && step !== 'mnemonic') {
      if (!email || !password) { setError('Preencha todos os campos'); return; }
      if (password !== confirm) {
        setError('As senhas não coincidem');
        setStep('confirm');
        setConfirm('');
        return;
      }
      setStep('submitting');
      setError('');
      try {
        const pubKey = await store.createVault(password, email);
        const words = await (store as any).generateMnemonic();
        setMnemonic(words);
        setStep('mnemonic');
      } catch (e: any) {
        setError(`Erro: ${e.message}`);
        setStep('confirm');
      }
    } else if (step === 'mnemonic') {
      onSuccess(store.getState().pubKey || '');
    }
  }

  if (step === 'submitting') {
    return (
      <Modal width={60} height={10} label=" ▓ CRIANDO COFRE ▓ ">
        <Box justifyContent="center" alignItems="center" flexDirection="column" height={8}>
          <Spinner label="Criando cofre..." />
        </Box>
      </Modal>
    );
  }

  if (step === 'mnemonic') {
    return (
      <Modal width={70} height={15} label=" ▓ BACKUP DE SEGURANÇA ▓ ">
        <Box flexDirection="column" gap={1}>
          <Text color="yellow">Anote estas 12 palavras. Elas são a única forma de recuperar sua conta:</Text>
          <Text bold color="cyan">{mnemonic}</Text>
          <Box marginTop={1}>
            <Spinner label="Pressione ENTER para continuar..." />
          </Box>
          <Box>
            <Text>Tab=mudar campo · Backspace=deletar · Enter=continuar</Text>
          </Box>
        </Box>
      </Modal>
    );
  }

  const barLen = Math.floor(entropyProgress / 5);
  const bar = '█'.repeat(barLen) + '▒'.repeat(20 - barLen);

  return (
    <Modal width={70} height={26} label=" ▓ CRIAR NOVO COFRE ▓ ">
      <Box flexDirection="column" gap={1}>
        <Text bold color={colors.primary}>🮇 Bem-vindo ao VAX Chat! 🮇</Text>

        <Box>
          <Text>Entropia: </Text>
          <Text color={entropyProgress < 50 ? 'yellow' : 'green'}>{bar}</Text>
          <Text> {entropyProgress}%</Text>
        </Box>

        <Box>
          <Text>Email:  </Text>
          <Text color={colors.textMuted}>{email || '(digite)'}</Text>
          {step === 'email' && <Text color={colors.primary}> ◀</Text>}
        </Box>

        <Box>
          <Text>Senha:  </Text>
          <Text color={colors.textMuted}>{'*'.repeat(password.length) || '(digite)'}</Text>
          {step === 'password' && <Text color={colors.primary}> ◀</Text>}
        </Box>

        <Box>
          <Text>Confirm: </Text>
          <Text color={colors.textMuted}>{'*'.repeat(confirm.length) || '(digite)'}</Text>
          {step === 'confirm' && <Text color={colors.primary}> ◀</Text>}
        </Box>

        {error && <Text color={colors.danger}>{error}</Text>}

        <Box marginTop={1}>
          <Text>Tab=próximo · Enter=submeter · Backspace=deletar</Text>
        </Box>
      </Box>
    </Modal>
  );
}
