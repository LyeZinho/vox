import blessed from 'neo-blessed';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createLayout, type Layout, applyCurvedBorder } from './ui/layout.js';
import { colors, theme } from './ui/theme.js';
import { showSplashScreen, showOnboardingScreen, showUnlockScreen } from './ui/screens/onboarding.js';
import { store } from './core/store.js';
import { api, type Message } from './core/api.js';

let layout: Layout | null = null;

async function main() {
    const screen = blessed.screen({
        smartCSR: true,
        title: 'VAX Chat - Secure Identity & Privacy',
        dockBorders: true,
        autoPadding: true,
    });

    try {
        await showSplashScreen(screen);

        await store.initialize();
        const state = store.getState();

        if (!state.isVaultInitialized) {
            const result = await showOnboardingScreen(screen);
            if (!result.success) {
                screen.destroy();
                process.exit(0);
            }
        } else {
            const result = await showUnlockScreen(screen);
            if (!result.success) {
                screen.destroy();
                process.exit(0);
            }
        }

        layout = createLayout(screen);

        const currentState = store.getState();
        const shortPubKey = currentState.pubKey ? currentState.pubKey.slice(0, 8) + '...' : 'unknown';

        layout.chatLog.log('{blue-fg}[SYSTEM]{/blue-fg} Bem-vindo ao {bold}VAX Chat{/bold}!');
        layout.chatLog.log(`{blue-fg}[SYSTEM]{/blue-fg} Identidade: {cyan-fg}${shortPubKey}{/cyan-fg}`);
        layout.chatLog.log('{blue-fg}[SYSTEM]{/blue-fg} Status: {green-fg}SECURE{/green-fg} (Cofre desbloqueado)');
        layout.chatLog.log('---');

        const defaultRoom = 'general';
        try {
            layout.chatLog.log(`{yellow-fg}[CONECTANDO]{/yellow-fg} Entrando na sala #${defaultRoom}...`);
            screen.render();

            await store.joinRoom(defaultRoom);

            layout.chatLog.log(`{green-fg}[CONECTADO]{/green-fg} Sala #${defaultRoom}`);
            updateStatusBar('connected');
        } catch (err: any) {
            layout.chatLog.log(`{red-fg}[ERRO]{/red-fg} Falha ao conectar: ${err.message}`);
            updateStatusBar('error');
        }

        setupEventListeners(screen, layout);

        layout.inputBar.focus();
        screen.render();

    } catch (error: any) {
        const errorBox = blessed.box({
            parent: screen,
            top: 'center',
            left: 'center',
            width: 60,
            height: 10,
            border: theme.border,
            style: {
                border: { fg: colors.danger },
                fg: colors.text,
                bg: colors.background,
            },
            tags: true,
        });
        applyCurvedBorder(errorBox);

        errorBox.setContent(`
{bold}{red-fg}Erro Fatal{/red-fg}

${error.message}

Pressione qualquer tecla para sair...
        `);

        screen.render();
        screen.key('press', () => {
            process.exit(1);
        });
    }
}

function setupEventListeners(screen: blessed.Widgets.Screen, layout: Layout) {
    screen.key(['escape', 'q', 'C-c'], () => {
        store.leaveRoom();
        store.lockVault();
        return process.exit(0);
    });

    let isPrivacyMode = false;
    screen.key('C-p', () => {
        isPrivacyMode = !isPrivacyMode;
        if (isPrivacyMode) {
            layout.chatLog.setContent('{center}{yellow-fg}MODO PRIVACIDADE ATIVO{/}\n(Pressione Ctrl+P para mostrar mensagens){/center}');
        } else {
            layout.chatLog.setContent('{center}{green-fg}MODO PRIVACIDADE DESATIVADO{/center}');
            setTimeout(() => {
                (layout.chatLog as any).clear();
                const currentMessages = store.getMessages(store.getState().currentRoom || '');
                currentMessages.forEach(m => store.emit('message:received', m));
            }, 1000);
        }
        screen.render();
    });

    screen.key('C-l', () => {
        screen.realloc();
        screen.render();
    });

    layout.inputBar.on('submit', async (value: string) => {
        if (!value.trim()) {
            layout.inputBar.clearValue();
            layout.inputBar.focus();
            screen.render();
            return;
        }

        const trimmed = value.trim();

        if (trimmed.startsWith('/')) {
            await handleCommand(trimmed, layout);
        } else {
            try {
                await store.sendMessage(trimmed);
                layout.chatLog.log(`{green-fg}[VOCÊ]{/green-fg}: ${trimmed}`);
            } catch (err: any) {
                layout.chatLog.log(`{red-fg}[ERRO]{/red-fg}: ${err.message}`);
            }
        }

        layout.inputBar.clearValue();
        layout.inputBar.focus();
        screen.render();
    });

    layout.channelSidebar.on('select', async (item: any, index: number) => {
        const roomName = item.getText();
        if (roomName) {
            try {
                const roomId = roomName.replace('#', '');
                layout.chatLog.log(`{yellow-fg}[ENTRANDO]{/yellow-fg} Sala #${roomId}...`);
                screen.render();

                await store.joinRoom(roomId);

                layout.chatLog.log(`{green-fg}[SALA]{/green-fg} Entrou na sala #${roomId}`);
            } catch (err: any) {
                layout.chatLog.log(`{red-fg}[ERRO]{/red-fg} ${err.message}`);
            }
            screen.render();
        }
    });

    // --- Pro Feature: Click-to-Copy PubKey ---
    layout.userList.on('select', (item: any, index: number) => {
        const state = store.getState();
        const fullPubKey = state.onlineUsers[index];
        if (fullPubKey) {
            (store as any).copyToClipboard(fullPubKey);
            layout.chatLog.log(`{green-fg}[CLI]{/green-fg} Chave pública copiada para o clipboard! 📋`);
            layout.screen.render();
        }
    });

    // --- Pro Feature: Tooltips ---
    const showTooltip = (el: any, text: string) => {
        layout.tooltip.setContent(text);
        layout.tooltip.show();
        layout.tooltip.top = (el.atop || 0) + 1;
        layout.tooltip.left = (el.aleft || 0) + 2;
        layout.screen.render();
    };

    const hideTooltip = () => {
        layout.tooltip.hide();
        layout.screen.render();
    };

    // Show tooltip on status bar info
    layout.statusBar.on('mouseover', () => {
        const state = store.getState();
        const info = state.isUnlocked
            ? '{cyan-fg}Criptografia:{/cyan-fg} XChaCha20-Poly1305\n{cyan-fg}Assinatura:{/cyan-fg} Ed25519'
            : '{red-fg}Cofre Bloqueado{/red-fg}';
        showTooltip(layout.statusBar, info);
    });

    layout.statusBar.on('mouseout', hideTooltip);

    let lastMessageDate: string | null = null;

    store.on('message:received', (message: any) => {
        const date = new Date(message.createdAt);
        const dateStr = date.toLocaleDateString('pt-BR');
        const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        if (dateStr !== lastMessageDate) {
            layout.chatLog.log(`\n{center}─── ${dateStr} ───{/center}\n`);
            lastMessageDate = dateStr;
        }

        const sender = message.senderPubKey.slice(0, 8);
        const rawContent = Buffer.from(message.content, 'base64').toString();

        let displayContent = rawContent;
        try {
            const parsed = JSON.parse(rawContent);
            displayContent = parsed.content || rawContent;
        } catch (e) {
            // Use raw content if not JSON
        }

        displayContent = displayContent.trim().replace(/^['"]|['"]$/g, '');

        const levelIcon = '{green-fg}▚{/}';
        layout.chatLog.log(`{blue-fg}${time}{/blue-fg} ${levelIcon} {bold}${sender}{/bold} ${displayContent}`);

        const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
        const blobMatch = displayContent.match(/\[blob:([^\]]+)\]/);
        const isLocalImage = imageExtensions.some(ext => displayContent.toLowerCase().endsWith(ext)) && fs.existsSync(displayContent);

        if (blobMatch || isLocalImage) {
            const blobId = blobMatch ? blobMatch[1] : null;
            const log = layout.chatLog as any;
            const blobsDir = path.join(os.homedir(), '.vax', 'blobs');
            if (!fs.existsSync(blobsDir)) fs.mkdirSync(blobsDir, { recursive: true });

            const processImage = async (imagePath: string) => {
                const imgHeight = Math.floor(log.height / 3);
                for (let i = 0; i < imgHeight + 1; i++) log.log('');

                await new Promise(r => setTimeout(r, 200));

                const absX = (log.aleft || 0) + 2;
                const absY = (log.atop || 0) + (log._clines ? log._clines.length : 0) - imgHeight - 1;
                const maxWidth = Math.floor(log.width / 2);
                const maxHeight = imgHeight;

                try {
                    await store.renderImage(imagePath, absX, absY > 0 ? absY : 1, maxWidth > 0 ? maxWidth : 40, maxHeight > 0 ? maxHeight : 15);
                    screen.realloc();
                    screen.render();
                    layout.inputBar.focus();
                } catch (err: any) {
                    log.log(`{red-fg}[RENDER ERROR]{/red-fg} ${err.message}`);
                    layout.inputBar.focus();
                }
            };

            if (blobId) {
                const cachedPath = path.join(blobsDir, blobId);
                if (fs.existsSync(cachedPath)) {
                    processImage(cachedPath);
                } else {
                    api.downloadBlob(blobId).then(buffer => {
                        fs.writeFileSync(cachedPath, buffer);
                        processImage(cachedPath);
                    }).catch(err => {
                        log.log(`{red-fg}[BLOB ERROR]{/red-fg} Falha ao baixar imagem: ${err.message}`);
                    });
                }
            } else if (isLocalImage) {
                processImage(displayContent);
            }
        }

        screen.render();

        // If it's an image, the setTimeout will handle focus/refresh after viuer
        if (!imageExtensions.some(ext => displayContent.toLowerCase().endsWith(ext))) {
            layout.inputBar.focus();
        }
    });

    store.on('messages:history', ({ roomId, messages }) => {
        (layout.chatLog as any).clear();
        lastMessageDate = null;
        layout.chatLog.log(`{blue-fg}[SISTEMA]{/blue-fg} Carregando histórico de #${roomId}...`);
        messages.forEach((msg: any) => store.emit('message:received', msg));
        layout.chatLog.log(`{blue-fg}[SISTEMA]{/blue-fg} Histórico carregado.`);
        layout.inputBar.focus();
        screen.render();
    });

    store.on('connection:status', (status: string) => {
        updateStatusBar(status as any);
    });

    store.on('error', (error: Error) => {
        layout.chatLog.log(`{red-fg}[ERRO]{/red-fg} ${error.message}`);
        screen.render();
    });
}

async function handleCommand(command: string, layout: Layout) {
    const parts = command.slice(1).split(' ');
    const cmd = (parts[0] || '').toLowerCase();
    const args = parts.slice(1);

    switch (cmd) {
        case 'audit':
            try {
                const info = (store as any).getAuditInfo();
                layout.chatLog.log(`{cyan-fg}[AUDIT]{/cyan-fg}\n${info}`);
            } catch (e) {
                layout.chatLog.log(`{red-fg}[ERROR]{/red-fg} Falha ao obter dados de auditoria.`);
            }
            break;

        case 'theme':
            const themeName = args[0] as any;
            if ((theme as any).switchTheme(themeName)) {
                layout.chatLog.log(`{green-fg}[TEMA]{/green-fg} Tema alterado para: {bold}${themeName}{/bold}`);
                layout.chatLog.log(`{yellow-fg}[RECOMENDADO]{/yellow-fg} Reinicie para aplicar em todos os componentes.`);
            } else {
                layout.chatLog.log(`{red-fg}[ERRO]{/red-fg} Tema não encontrado. Disponíveis: default, dracula, nord`);
            }
            break;

        case 'help':
            layout.chatLog.log('{yellow-fg}Comandos disponíveis:{/yellow-fg}');
            layout.chatLog.log('  /help    - Mostrar esta ajuda');
            layout.chatLog.log('  /join    - Entrar em uma sala');
            layout.chatLog.log('  /create  - Criar uma nova sala');
            layout.chatLog.log('  /rooms   - Listar salas disponíveis');
            layout.chatLog.log('  /leave   - Sair da sala atual');
            layout.chatLog.log('  /users   - Listar usuários online');
            layout.chatLog.log('  /clear   - Limpar o chat');
            layout.chatLog.log('  /theme   - Mudar tema (default, dracula, nord)');
            layout.chatLog.log('  /audit   - Ver informações de auditoria');
            layout.chatLog.log('  /quit    - Sair do aplicativo');
            break;

        case 'join':
            if (args[0]) {
                try {
                    await store.joinRoom(args[0]);
                    layout.chatLog.log(`{green-fg}[SALA]{/green-fg} Entrou na sala #${args[0]}`);
                } catch (err: any) {
                    layout.chatLog.log(`{red-fg}[ERRO]{/red-fg} ${err.message}`);
                }
            } else {
                layout.chatLog.log('{yellow-fg}Uso: /join <sala>{/yellow-fg}');
            }
            break;

        case 'create':
            if (args[0]) {
                try {
                    const room = await store.createRoom(args.join(' '));
                    layout.chatLog.log(`{green-fg}[SALA]{/green-fg} Sala "${room.name}" criada com ID: ${room.id}`);
                    await store.joinRoom(room.id);
                } catch (err: any) {
                    layout.chatLog.log(`{red-fg}[ERRO]{/red-fg} ${err.message}`);
                }
            } else {
                layout.chatLog.log('{yellow-fg}Uso: /create <nome da sala>{/yellow-fg}');
            }
            break;

        case 'rooms':
            try {
                const rooms = await store.listRooms();
                if (rooms.length === 0) {
                    layout.chatLog.log('{yellow-fg}Nenhuma sala disponível{/yellow-fg}');
                } else {
                    layout.chatLog.log(`{yellow-fg}Salas disponíveis (${rooms.length}):{/yellow-fg}`);
                    rooms.forEach(room => {
                        layout.chatLog.log(`  #${room.id} - ${room.name || 'Sem nome'}`);
                    });
                }
            } catch (err: any) {
                layout.chatLog.log(`{red-fg}[ERRO]{/red-fg} ${err.message}`);
            }
            break;

        case 'leave':
            store.leaveRoom();
            layout.chatLog.log('{yellow-fg}[SALA]{/yellow-fg} Saiu da sala');
            break;

        case 'users':
            const state = store.getState();
            layout.chatLog.log(`{yellow-fg}Usuários online (${state.onlineUsers.length}):{/yellow-fg}`);
            state.onlineUsers.forEach(user => {
                layout.chatLog.log(`  - ${user.slice(0, 8)}...`);
            });
            break;

        case 'clear':
            (layout.chatLog as any).clear();
            layout.chatLog.log('{blue-fg}[SYSTEM]{/blue-fg} Chat limpo');
            break;

        case 'quit':
        case 'exit':
            store.leaveRoom();
            store.lockVault();
            process.exit(0);
            break;

        default:
            layout.chatLog.log(`{red-fg}Comando desconhecido: /${cmd}{/red-fg}`);
            layout.chatLog.log('{yellow-fg}Digite /help para ver comandos disponíveis{/yellow-fg}');
    }
}

function updateStatusBar(status: 'connected' | 'connecting' | 'disconnected' | 'error') {
    if (!layout) return;

    const statusConfig: Record<string, { indicator: string; color: string; text: string }> = {
        connected: { indicator: '█', color: 'green', text: 'Online' },
        connecting: { indicator: '▒', color: 'yellow', text: 'Connecting' },
        disconnected: { indicator: '░', color: 'red', text: 'Off' },
        error: { indicator: '▓', color: 'red', text: 'Error' },
    };

    const config = statusConfig[status] || { indicator: '░', color: 'red', text: 'Off' };
    const state = store.getState();
    const pubKey = state.pubKey ? state.pubKey.slice(0, 8) : '---';

    const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    layout.statusBar.setContent(
        ` {${config.color}-fg}${config.indicator}{/} ${config.text} ┃ ` +
        `{bold}${state.isUnlocked ? '▓ SECURE' : '░ LOCKED'}{/bold} ┃ ` +
        `🮇 ${pubKey} ┃ ` +
        `🕒 ${time}`
    );

    const statusColors: Record<string, string> = {
        connected: '#bd93f9',   // Cyan/Violet Glow
        connecting: '#f1fa8c',  // Yellow Glow
        disconnected: '#ff5555', // Red Glow
        error: '#ff5555',        // Red Glow
    };

    const glowColor = statusColors[status] || colors.primary;
    layout.updateBorderColor(layout.chatLog, glowColor);
    layout.updateBorderColor(layout.inputBar, glowColor);

    const statusLabelText = {
        connected: '{green-fg}▚ ONLINE{/green-fg}',
        connecting: '{yellow-fg}▒ CONECTANDO{/yellow-fg}',
        disconnected: '{red-fg}░ OFF{/red-fg}',
        error: '{red-fg}▓ ERRO{/red-fg}',
    }[status] || status;

    layout.userList.setLabel(` 🮇 ONLINE ${statusLabelText} `);
    layout.userList.setItems(state.onlineUsers.map(u => ` 🮇 ${u.slice(0, 8)}`));
    layout.screen.render();
}

main().catch(console.error);
