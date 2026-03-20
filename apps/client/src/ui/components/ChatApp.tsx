import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { ThemeProvider, useTheme, themes, type ThemeName } from '../theme.js';
import { useStore } from '../hooks/useStore.js';
import { SplashScreen } from './SplashScreen.js';
import { OnboardingScreen } from './OnboardingScreen.js';
import { UnlockScreen } from './UnlockScreen.js';
import { ChatLayout } from './ChatLayout.js';
import { InputBar } from './InputBar.js';
import { store } from '../../core/store.js';
import { setTheme as updateThemeConfig } from '../core/config.js';
import { useInput } from 'ink';

type Phase = 'splash' | 'onboarding' | 'unlock' | 'chat';

function ChatAppInner() {
  const { state } = useStore();
  const { switchTheme } = useTheme();
  const [phase, setPhase] = useState<Phase>('splash');
  const [privacyMode, setPrivacyMode] = useState(false);

  useEffect(() => {
    store.initialize().then(() => {
      const s = store.getState();
      if (!s.isVaultInitialized) {
        setPhase('onboarding');
      } else {
        setPhase('unlock');
      }
    });
  }, []);

  // Keyboard shortcuts (global, work in any phase)
  useInput((input, key) => {
    if ((key.ctrl && input === 'c') || input === 'q') {
      store.leaveRoom();
      store.lockVault();
      process.exit(0);
    }
    if (key.ctrl && input === 'p') {
      setPrivacyMode(p => !p);
    }
  });

  function handleVaultCreated(pubKey: string) {
    setPhase('chat');
  }

  function handleVaultUnlocked() {
    setPhase('chat');
    // Auto-join default room
    store.joinRoom('general').catch(() => {});
  }

  async function handleMessageSubmit(content: string) {
    try {
      await store.sendMessage(content);
    } catch (e: any) {
      // Error displayed via store event
    }
  }

  async function handleCommand(cmd: string) {
    const parts = cmd.slice(1).split(' ');
    const c = (parts[0] || '').toLowerCase();
    const args = parts.slice(1);

    switch (c) {
      case 'help':
        // Handled inline below
        break;
      case 'join':
        if (args[0]) await store.joinRoom(args[0]);
        break;
      case 'create':
        if (args[0]) {
          const room = await store.createRoom(args.join(' '));
          await store.joinRoom(room.id);
        }
        break;
      case 'rooms': {
        const rooms = await store.listRooms();
        // rooms shown via chat log (would need a system message)
        break;
      }
      case 'leave':
        store.leaveRoom();
        break;
      case 'theme': {
        const name = args[0] as ThemeName;
        if (!name || !themes[name]) {
          // Show available themes
          break;
        }
        switchTheme(name);
        updateThemeConfig(name);
        break;
      }
      case 'quit':
      case 'exit':
        store.leaveRoom();
        store.lockVault();
        process.exit(0);
        break;
      default:
        break;
    }
  }

  const currentMessages = state.currentRoom
    ? (state.messages.get(state.currentRoom) || [])
    : [];

  if (phase === 'splash') {
    return <SplashScreen onComplete={() => {/* splash transitions in useEffect */}} />;
  }

  if (phase === 'onboarding') {
    return (
      <Box justifyContent="center" alignItems="center" flexGrow={1}>
        <OnboardingScreen
          onSuccess={handleVaultCreated}
          onCancel={() => process.exit(0)}
        />
      </Box>
    );
  }

  if (phase === 'unlock') {
    return (
      <Box justifyContent="center" alignItems="center" flexGrow={1}>
        <UnlockScreen
          onSuccess={handleVaultUnlocked}
          onCancel={() => process.exit(0)}
        />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" width="100%" flexGrow={1}>
      <ChatLayout
        state={state}
        messages={currentMessages}
        onRoomSelect={(id) => store.joinRoom(id)}
        privacyMode={privacyMode}
      />
      <InputBar
        onSubmit={handleMessageSubmit}
        onCommand={handleCommand}
      />
    </Box>
  );
}

export function ChatApp() {
  return (
    <ThemeProvider>
      <ChatAppInner />
    </ThemeProvider>
  );
}
