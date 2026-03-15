import blessed from 'neo-blessed';
import { colors, theme } from './theme.js';

interface RoomMeta {
    isModerated: boolean;
    name: string;
}

export interface Layout {
    screen: blessed.Widgets.Screen;
    serverRail: blessed.Widgets.BoxElement;
    channelSidebar: blessed.Widgets.ListElement;
    chatLog: blessed.Widgets.Log;
    inputBar: blessed.Widgets.TextboxElement;
    userList: blessed.Widgets.ListElement;
    statusBar: blessed.Widgets.BoxElement;
    tooltip: blessed.Widgets.BoxElement;
    updateBorderColor: (el: any, color: string) => void;
}

export function applyCurvedBorder(el: any) {
    if (!el.border || el.border.type !== 'line') return el;
    const oldRender = el._renderBorder;
    el._renderBorder = function () {
        const ret = oldRender.call(this);
        const { xi, xl, yi, yl } = this;
        const style = this.style.border || this.style;
        this.screen.put(xi, yi, '╭', style);
        this.screen.put(xl - 1, yi, '╮', style);
        this.screen.put(xi, yl - 1, '╰', style);
        this.screen.put(xl - 1, yl - 1, '╯', style);
        return ret;
    };
    return el;
}

export function createLayout(screen: blessed.Widgets.Screen, roomMeta: RoomMeta = { isModerated: false, name: 'geral' }): Layout {
    // 1. Server Rail (Far Left)
    const serverRail = blessed.box({
        parent: screen,
        left: 0,
        top: 0,
        width: 8,
        height: '100%-1',
        style: {
            bg: colors.serverRail,
        }
    });

    // 2. Channel List (Left)
    const channelSidebar = blessed.list({
        parent: screen,
        left: 8,
        top: 0,
        width: 25,
        height: '100%-1',
        label: ' 🮇 CANAIS ',
        border: theme.border,
        style: theme.sidebar,
        keys: true,
        vi: true,
        mouse: true,
        items: ['# geral', '# dev', '# cafe', '# off-topic'],
    });
    applyCurvedBorder(channelSidebar);

    // 3. Main Chat Area
    const chatLog = blessed.log({
        parent: screen,
        left: 33,
        top: 0,
        width: '100%-53', // Subtracting sidebar (33) and User list (20)
        height: '100%-4', // 1 for status bar, 3 for input bar
        label: roomMeta.isModerated ? ` 🮄 VAX MODERADO: ${roomMeta.name} ` : ` 🮄 VAX CHAT: ${roomMeta.name} `,
        border: theme.border,
        tags: true,
        style: {
            fg: colors.text,
            bg: roomMeta.isModerated ? colors.moderatedBg : colors.background,
            border: {
                fg: roomMeta.isModerated ? colors.warning : colors.primary
            }
        },
        mouse: true,
        scrollable: true,
        alwaysScroll: true,
        scrollbar: {
            ch: ' ',
            track: {
                bg: 'cyan'
            },
            style: {
                inverse: true
            }
        }
    });
    applyCurvedBorder(chatLog);

    // 4. Input Area
    const inputBar = blessed.textbox({
        parent: screen,
        left: 33,
        bottom: 1, // Above status bar
        width: '100%-53',
        height: 3,
        border: theme.border,
        style: {
            ...theme.input,
            border: {
                ...theme.input.border,
                fg: roomMeta.isModerated ? colors.warning : colors.primary
            }
        },
        keys: true,
        mouse: true,
        inputOnFocus: true,
    });
    applyCurvedBorder(inputBar);

    // 5. User List (Far Right)
    const userList = blessed.list({
        parent: screen,
        right: 0,
        top: 0,
        width: 22,
        height: '100%-1', // Leave room for status bar
        label: ' 🮇 ONLINE ',
        border: theme.border,
        style: theme.sidebar,
        mouse: true,
        tags: true,
        items: ['alice', 'bob', 'mallory'],
    });
    applyCurvedBorder(userList);

    // Status Bar (Bottom)
    const statusBar = blessed.box({
        parent: screen,
        left: 0,
        bottom: 0,
        width: '100%',
        height: 1,
        style: {
            fg: colors.text,
            bg: colors.serverRail,
        },
        content: ` ▒ Online ┃ ▓ SECURE ┃ 🔑 unknown ┃ 🕒 00:00`,
        tags: true,
    });

    // 6. Tooltip (Hidden by default)
    const tooltip = blessed.box({
        parent: screen,
        width: 'shrink',
        height: 'shrink',
        hidden: true,
        padding: { left: 1, right: 1 },
        border: theme.border,
        style: {
            bg: colors.sidebar,
            fg: colors.text,
            border: { fg: colors.primary },
        },
        tags: true,
    });

    const updateBorderColor = (el: any, color: string) => {
        if (el.style && el.style.border) {
            el.style.border.fg = color;
            el.screen.render();
        }
    };

    return {
        screen,
        serverRail,
        channelSidebar,
        chatLog,
        inputBar,
        userList,
        statusBar,
        tooltip,
        updateBorderColor,
    };
}
