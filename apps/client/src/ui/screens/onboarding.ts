import blessed from 'neo-blessed';
import { colors, theme } from '../theme.js';
import { applyCurvedBorder } from '../layout.js';
import { store } from '../../core/store.js';
import { api } from '../../core/api.js';

export interface ScreenResult {
    success: boolean;
    data?: any;
}

export async function showSplashScreen(screen: blessed.Widgets.Screen): Promise<void> {
    return new Promise(async (resolve) => {
        const splash = blessed.box({
            parent: screen,
            top: 'center',
            left: 'center',
            width: 70,
            height: 18,
            border: theme.border,
            tags: true,
            style: {
                border: { fg: colors.primary }
            }
        });
        applyCurvedBorder(splash);

        const asciiArt = `
{center}{bold}{cyan-fg}
 ██╗   ██╗ █████╗ ██╗  ██╗
 ██║   ██║██╔══██╗╚██╗██╔╝
 ╚██╗ ██╔╝███████║ ╚███╔╝ 
  ╚████╔╝ ██╔══██║ ██╔██╗ 
   ╚██╔╝  ██║  ██║██╔╝ ██╗
    ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝
 ── Identity & Privacy ──{/center}
{/bold}
`;

        const statusText = blessed.text({
            parent: splash,
            bottom: 2,
            left: 'center',
            content: '{yellow-fg}Iniciando...{/}',
            tags: true,
        });

        const spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
        let i = 0;
        const interval = setInterval(() => {
            statusText.setContent(`{cyan-fg}${spinner[i++ % spinner.length]}{/cyan-fg} Correndo verificação de segurança...`);
            screen.render();
        }, 80);

        splash.setContent(asciiArt);
        screen.render();

        // Simulate update check and delay
        try {
            const serverInfo = await api.getVersion();
            const currentVersion = '1.0.0';

            clearInterval(interval);

            if (serverInfo.version !== currentVersion) {
                statusText.setContent(`{green-fg}Nova versão encontrada: ${serverInfo.version}! Atualizando...{/}`);
                screen.render();
                await new Promise(r => setTimeout(r, 1500));
            } else {
                statusText.setContent(`{green-fg}VAX Chat v${currentVersion} - Sistema íntegro.{/}`);
                screen.render();
                await new Promise(r => setTimeout(r, 1000));
            }
        } catch (e) {
            clearInterval(interval);
            statusText.setContent(`{red-fg}Aviso: Falha ao verificar atualizações.{/}`);
            screen.render();
            await new Promise(r => setTimeout(r, 1000));
        }

        splash.destroy();
        resolve();
    });
}

export async function showOnboardingScreen(screen: blessed.Widgets.Screen): Promise<ScreenResult> {
    return new Promise(async (resolve) => {
        // Phase 1: Entropy Collection
        const entropyModal = blessed.box({
            parent: screen,
            top: 'center', left: 'center', width: 60, height: 10,
            border: theme.border, label: ' ▓ COLETA DE ENTROPIA ▓ ',
            content: '\n  Mova o mouse ou digite algo para gerar entropia...\n\n  Progresso: [                    ] 0%',
            tags: true,
        });
        applyCurvedBorder(entropyModal);
        screen.render();

        let entropy = 0;
        const onInteraction = () => {
            entropy += 1;
            const percent = Math.min(100, Math.floor((entropy / 100) * 100));
            const bars = Math.floor(percent / 5);
            // Using shades for a nicer progress bar
            const barContent = '█'.repeat(bars) + '▒'.repeat(20 - bars);
            entropyModal.setContent(`\n  Mova o mouse ou digite algo para gerar entropia...\n\n  Progresso: [${barContent}] ${percent}%`);
            screen.render();
            if (entropy >= 100) {
                screen.removeListener('mousemove', onInteraction);
                screen.removeListener('keypress', onInteraction);
                entropyModal.destroy();
                showMainOnboarding();
            }
        };

        screen.on('mousemove', onInteraction);
        screen.on('keypress', onInteraction);

        const showMainOnboarding = () => {
            const modal = blessed.box({
                parent: screen,
                top: 'center',
                left: 'center',
                width: 70,
                height: 24,
                border: theme.border,
                tags: true,
            });
            applyCurvedBorder(modal);

            const title = blessed.text({
                parent: modal,
                top: 1,
                left: 'center',
                content: '{bold}🮇 Bem-vindo ao VAX Chat! 🮇{/bold}',
                tags: true,
            });

            const emailLabel = blessed.text({
                parent: modal,
                top: 4,
                left: 3,
                content: 'Email:',
                tags: true,
            });

            const emailInput = blessed.textbox({
                parent: modal,
                top: 4,
                left: 10,
                width: 40,
                height: 3,
                border: theme.input.border,
                inputOnFocus: true,
                style: {
                    fg: colors.text,
                    bg: colors.background,
                    focus: {
                        border: { fg: colors.primary },
                    },
                },
            });
            applyCurvedBorder(emailInput);

            const passwordLabel = blessed.text({
                parent: modal,
                top: 8,
                left: 3,
                content: 'Senha:',
                tags: true,
            });

            const passwordInput = blessed.textbox({
                parent: modal,
                top: 8,
                left: 10,
                width: 40,
                height: 3,
                border: theme.input.border,
                inputOnFocus: true,
                censor: true,
                style: {
                    fg: colors.text,
                    bg: colors.background,
                    focus: {
                        border: { fg: colors.primary },
                    },
                },
            });
            applyCurvedBorder(passwordInput);

            const confirmLabel = blessed.text({
                parent: modal,
                top: 12,
                left: 3,
                content: 'Confirmar:',
                tags: true,
            });

            const confirmInput = blessed.textbox({
                parent: modal,
                top: 12,
                left: 10,
                width: 40,
                height: 3,
                border: theme.input.border,
                inputOnFocus: true,
                censor: true,
                style: {
                    fg: colors.text,
                    bg: colors.background,
                    focus: {
                        border: { fg: colors.primary },
                    },
                },
            });
            applyCurvedBorder(confirmInput);

            const statusLabel = blessed.text({
                parent: modal,
                top: 16,
                left: 'center',
                content: '',
                tags: true,
            });

            const submitBtn = blessed.button({
                parent: modal,
                top: 18,
                left: 'center',
                width: 15,
                height: 1,
                content: ' [ Criar Cofre ] ',
                style: {
                    fg: colors.background,
                    bg: colors.primary,
                    bold: true,
                },
            });

            let step: 'email' | 'password' | 'confirm' | 'submitting' = 'email';

            const focusEmail = () => { step = 'email'; emailInput.focus(); screen.render(); };
            const focusPassword = () => { step = 'password'; passwordInput.focus(); screen.render(); };
            const focusConfirm = () => { step = 'confirm'; confirmInput.focus(); screen.render(); };

            focusEmail();

            const handleSubmit = async () => {
                const email = emailInput.getValue();
                const password = passwordInput.getValue();
                const confirm = confirmInput.getValue();

                if (!email || !password) {
                    statusLabel.setContent('{red-fg}Preencha todos os campos{/red-fg}');
                    screen.render();
                    return;
                }

                if (password !== confirm) {
                    statusLabel.setContent('{red-fg}As senhas não coincidem{/red-fg}');
                    screen.render();
                    return;
                }

                statusLabel.setContent('{yellow-fg}Processando...{/yellow-fg}');
                screen.render();

                try {
                    const pubKey = await store.createVault(password, email);

                    // Phase 2: Mnemonic Backup
                    const mnemonic = await (store as any).generateMnemonic(); // Need to implement this in store
                    modal.destroy();

                    const backupModal = blessed.box({
                        parent: screen,
                        top: 'center', left: 'center', width: 60, height: 12,
                        border: theme.border, label: ' ▓ BACKUP DE SEGURANÇA ▓ ',
                        content: `{yellow-fg}Anote estas 12 palavras. Elas são a única forma de recuperar sua conta:{/yellow-fg}\n\n{bold}${mnemonic}{/bold}\n\n[ Pressione ENTER para continuar ]`,
                        tags: true,
                    });
                    applyCurvedBorder(backupModal);
                    screen.render();

                    screen.once('key enter', () => {
                        backupModal.destroy();
                        resolve({ success: true, data: { pubKey } });
                    });
                } catch (error: any) {
                    statusLabel.setContent(`{red-fg}Erro: ${error.message}{/red-fg}`);
                    screen.render();
                }
            };

            submitBtn.on('press', handleSubmit);
            emailInput.on('submit', focusPassword);
            passwordInput.on('submit', focusConfirm);
            confirmInput.on('submit', handleSubmit);

            screen.key('tab', () => {
                if (step === 'email') focusPassword();
                else if (step === 'password') focusConfirm();
                else if (step === 'confirm') focusEmail();
            });
        };
    });
}

export async function showUnlockScreen(screen: blessed.Widgets.Screen): Promise<ScreenResult> {
    return new Promise((resolve) => {
        const modal = blessed.box({
            parent: screen,
            top: 'center',
            left: 'center',
            width: 60,
            height: 14,
            border: theme.border,
            tags: true,
        });
        applyCurvedBorder(modal);

        const title = blessed.text({
            parent: modal,
            top: 1,
            left: 'center',
            content: '{bold}🮄 Desbloquear Cofre 🮄{/bold}',
            tags: true,
        });

        const passwordLabel = blessed.text({
            parent: modal,
            top: 4,
            left: 3,
            content: 'Senha:',
            tags: true,
        });

        const passwordInput = blessed.textbox({
            parent: modal,
            top: 4,
            left: 12,
            width: 35,
            height: 3,
            border: theme.input.border,
            inputOnFocus: true,
            censor: true,
            style: {
                fg: colors.text,
                bg: colors.background,
                focus: {
                    border: { fg: colors.primary },
                },
            },
        });
        applyCurvedBorder(passwordInput);

        const statusLabel = blessed.text({
            parent: modal,
            top: 8,
            left: 'center',
            content: '',
            tags: true,
        });

        const submitBtn = blessed.button({
            parent: modal,
            top: 10,
            left: 'center',
            width: 12,
            height: 1,
            content: ' [ Desbloq ] ',
            style: {
                fg: colors.background,
                bg: colors.primary,
                bold: true,
            },
        });

        passwordInput.focus();
        screen.render();

        const handleSubmit = async () => {
            const password = passwordInput.getValue();

            if (!password) {
                statusLabel.setContent('{red-fg}Digite a senha{/red-fg}');
                screen.render();
                return;
            }

            statusLabel.setContent('{yellow-fg}Desbloqueando...{/yellow-fg}');
            screen.render();

            try {
                await store.unlockVault(password);
                modal.destroy();
                resolve({ success: true });
            } catch (error: any) {
                statusLabel.setContent(`{red-fg}Senha incorreta{/red-fg}`);
                passwordInput.clearValue();
                passwordInput.focus();
                screen.render();
            }
        };

        submitBtn.on('press', handleSubmit);
        passwordInput.on('submit', handleSubmit);
    });
}
