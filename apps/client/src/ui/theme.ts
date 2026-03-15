export const themes = {
    default: {
        primary: '#5865F2',      // Discord Purple
        secondary: '#4f545c',
        success: '#3ba55d',
        danger: '#ed4245',
        warning: '#faa61a',
        background: '#36393f',
        sidebar: '#2f3136',
        serverRail: '#202225',
        text: '#dcddde',
        textMuted: '#72767d',
        header: '#ffffff',
        moderatedBg: '#40444b',
        accent: '#00aff4',
    },
    dracula: {
        primary: '#bd93f9',      // Purple
        secondary: '#44475a',
        success: '#50fa7b',
        danger: '#ff5555',
        warning: '#f1fa8c',
        background: '#282a36',
        sidebar: '#21222c',
        serverRail: '#191a21',
        text: '#f8f8f2',
        textMuted: '#6272a4',
        header: '#ffffff',
        moderatedBg: '#343746',
        accent: '#8be9fd',       // Cyan
    },
    nord: {
        primary: '#88c0d0',      // Frost Blue
        secondary: '#4c566a',
        success: '#a3be8c',
        danger: '#bf616a',
        warning: '#ebcb8b',
        background: '#2e3440',
        sidebar: '#3b4252',
        serverRail: '#2e3440',
        text: '#eceff4',
        textMuted: '#d8dee9',
        header: '#ffffff',
        moderatedBg: '#434c5e',
        accent: '#81a1c1',
    }
};

let currentTheme = themes.default;
export let colors = currentTheme;

export const switchTheme = (themeName: keyof typeof themes) => {
    if (themes[themeName]) {
        currentTheme = themes[themeName];
        (colors as any) = currentTheme;
        return true;
    }
    return false;
};

export const theme = {
    style: {
        fg: colors.text,
        bg: colors.background,
    },
    border: {
        type: 'line' as const,
        left: '│',
        right: '│',
        top: '─',
        bottom: '─',
        topLeft: '╭',
        topRight: '╮',
        bottomLeft: '╰',
        bottomRight: '╯',
        style: {
            fg: colors.primary,
        },
    },
    sidebar: {
        fg: colors.text,
        bg: colors.sidebar,
        selected: {
            bg: colors.primary,
            fg: colors.header,
        }
    },
    serverRail: {
        bg: colors.serverRail,
    },
    input: {
        fg: colors.text,
        bg: colors.background,
        border: {
            type: 'line' as const,
            left: '│',
            right: '│',
            top: '─',
            bottom: '─',
            topLeft: '╭',
            topRight: '╮',
            bottomLeft: '╰',
            bottomRight: '╯',
            style: {
                fg: colors.primary,
            },
        },
    },
};

export const messageStates = {
    secure: { fg: '#50fa7b', label: '[SECURE]' }, // Green
    system: { fg: '#f1fa8c', label: '[SYSTEM]' }, // Yellow
    error: { fg: '#ff5555', label: '[ALERTA]' },  // Red
};
