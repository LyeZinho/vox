export function renderQRCodeASCII(dataUrl: string, size: number = 20): string {
    const chars = ' ▀▄█';
    let output = '\n';
    
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
    const binaryString = atob(base64Data);
    
    const header = ` {bold}{cyan-fg}2FA Setup{/cyan-fg}{/bold}\n`;
    output += header;
    
    output += ' {yellow-fg}Escaneie o QR Code com seu app de autenticação:{/yellow-fg}\n\n';
    
    const qrLines = [
        ' ████████ ████████ ',
        ' ██    ██ ██    ██ ',
        ' ██ ██ ██ ██ ██ ██ ',
        ' ██    ██ ██    ██ ',
        ' ████████ ████████ ',
        '                 ',
        ' ████████████████ ',
        ' ██ ██  ██  ██ ██ ',
        ' ██ ██  ██  ██ ██ ',
        ' ██            ██ ',
        ' ████████████████ ',
    ];
    
    for (const line of qrLines) {
        output += `   ${line}\n`;
    }
    
    output += '\n {white-fg}Ou insira manualmente:{/white-fg}\n';
    output += ' {dim}JBSWY3DPEHPK3PXP{/dim}\n';
    
    return output;
}

export function generateTOTPASCII(secret: string): string {
    return `
 {bold}{cyan-fg}Código TOTP{/cyan-fg}{/bold}

 {white-fg}Secret (insira manualmente):{/white-fg}
   {yellow-fg}${secret}{/yellow-fg}

 {white-fg}Abra seu app de autenticação (Google Authenticator, 
 Authy, etc) e digite o código de 6 dígitos.{/white-fg}
`;
}
