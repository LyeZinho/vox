import React from 'react';
import { Box } from 'ink';
import { ServerRail } from './ServerRail.js';
import { Sidebar } from './Sidebar.js';
import { ChatLog } from './ChatLog.js';
import { StatusBar } from './StatusBar.js';
import type { AppState } from '../../core/store.js';
import type { Message } from '../../core/api.js';

interface Props {
  state: AppState;
  messages: Message[];
  onRoomSelect: (roomId: string) => void;
}

export function ChatLayout({ state, messages, onRoomSelect }: Props) {
  const rooms = Array.from(state.rooms.values());

  return (
    <Box flexDirection="column" width="100%" flexGrow={1}>
      <Box flexGrow={1} flexDirection="row">
        <ServerRail />
        <Sidebar
          rooms={rooms}
          currentRoom={state.currentRoom}
          onSelect={onRoomSelect}
        />
        <Box flexGrow={1} flexDirection="column">
          <ChatLog messages={messages} />
        </Box>
      </Box>
      <StatusBar state={state} />
    </Box>
  );
}
