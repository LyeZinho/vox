import { useReducer, useEffect } from 'react';
import { store, type AppState } from '../../core/store.js';
import type { Message } from '../../core/api.js';

type Action =
  | { type: 'SET_STATE'; state: AppState }
  | { type: 'MESSAGE_RECEIVED'; message: Message }
  | { type: 'MESSAGES_HISTORY'; roomId: string; messages: Message[] }
  | { type: 'ROOM_JOINED'; roomId: string }
  | { type: 'CONNECTION_STATUS'; status: AppState['connectionStatus'] }
  | { type: 'VAULT_UNLOCKED'; pubKey: string };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_STATE':
      return action.state;
    case 'MESSAGE_RECEIVED': {
      const msgs = state.messages.get(action.message.roomId) || [];
      const next = new Map(state.messages);
      next.set(action.message.roomId, [...msgs, action.message]);
      return { ...state, messages: next };
    }
    case 'MESSAGES_HISTORY': {
      const next = new Map(state.messages);
      next.set(action.roomId, action.messages);
      return { ...state, messages: next };
    }
    case 'ROOM_JOINED':
      return { ...state, currentRoom: action.roomId };
    case 'CONNECTION_STATUS':
      return { ...state, connectionStatus: action.status };
    case 'VAULT_UNLOCKED':
      return { ...state, isUnlocked: true, pubKey: action.pubKey };
    default:
      return state;
  }
}

const INITIAL_STATE: AppState = {
  isVaultInitialized: false,
  isUnlocked: false,
  pubKey: null,
  privateKey: null,
  totpSecret: null,
  currentRoom: null,
  rooms: new Map(),
  messages: new Map(),
  onlineUsers: [],
  connectionStatus: 'disconnected',
};

export function useStore() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  useEffect(() => {
    const handler = (s: AppState) => dispatch({ type: 'SET_STATE', state: s });
    const msgHandler = (m: Message) => dispatch({ type: 'MESSAGE_RECEIVED', message: m });
    const histHandler = ({ roomId, messages }: { roomId: string; messages: Message[] }) =>
      dispatch({ type: 'MESSAGES_HISTORY', roomId, messages });
    const roomHandler = (roomId: string) => dispatch({ type: 'ROOM_JOINED', roomId });
    const statusHandler = (status: AppState['connectionStatus']) =>
      dispatch({ type: 'CONNECTION_STATUS', status });
    const unlockHandler = (pubKey: string) => dispatch({ type: 'VAULT_UNLOCKED', pubKey });

    store.on('state:change', handler);
    store.on('message:received', msgHandler);
    store.on('messages:history', histHandler);
    store.on('room:joined', roomHandler);
    store.on('connection:status', statusHandler);
    store.on('vault:unlocked', unlockHandler);

    // Sync initial state
    dispatch({ type: 'SET_STATE', state: store.getState() });

    return () => {
      store.off('state:change', handler);
      store.off('message:received', msgHandler);
      store.off('messages:history', histHandler);
      store.off('room:joined', roomHandler);
      store.off('connection:status', statusHandler);
      store.off('vault:unlocked', unlockHandler);
    };
  }, []);

  return { state, store };
}
