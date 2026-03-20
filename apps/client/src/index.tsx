import React from 'react';
import { render } from 'ink';
import { ChatApp } from './ui/components/ChatApp.js';

render(<ChatApp />, {
  exitOnCtrlC: true,
});
