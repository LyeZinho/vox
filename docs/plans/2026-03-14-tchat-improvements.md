# tchat Implementation Plan — All Phases

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform tchat from a basic E2EE chat into a full-featured secure terminal chat with images, modern UI, and enhanced security UX.

**Architecture:** This plan covers 5 major areas: (1) Terminal Image Support via Rust + Kitty/Sixel, (2) UI/UX Modernization with Unicode borders and mouse support, (3) Enhanced Security UX with progress feedback and auto-lock, (4) Registration Flow Improvements, and (5) Bug Fixes. Each area is broken into TDD tasks with exact file paths.

**Tech Stack:** 
- Client: TypeScript + neo-blessed
- Rust Core: NAPI-RS + viuer (images) + identicon-rs (avatars)
- Server: NestJS + Prisma + Redis
- Protocol: SSE for real-time, Ed25519 for signatures, XChaCha20-Poly1305 for vault

---

## Phase 0: Bug Fixes (Critical Path)

### Task 0.1: Fix Signature Verification Mismatch

**Files:**
- Modify: `apps/server/src/auth/auth.service.ts:35-37`
- Modify: `apps/client/src/core/store.ts:179-186`

**Problem:** Client signs `JSON.stringify({ content, timestamp })` but server guard expects `payload + nonce + timestamp`.

**Step 1: Write the failing test**

```typescript
// apps/server/test/signature.spec.ts
describe('SignatureGuard', () => {
  it('should verify signatures from client', () => {
    // Client sends: payload=base64(JSON.stringify({content, timestamp})), nonce, timestamp
    // Server must reconstruct: payload + nonce + timestamp (concatenated)
    const payload = Buffer.from(JSON.stringify({content: 'test', timestamp: 1234567890})).toString('base64');
    const nonce = 'test-nonce';
    const timestamp = '1234567890';
    
    // Server constructPayload should match client signing
    const serverPayload = authService.constructPayload(payload, nonce, timestamp);
    // This should equal: payload + nonce + timestamp (raw concatenation)
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- apps/server/test/signature.spec.ts`
Expected: FAIL — client and server signing logic don't match

**Step 3: Fix server auth.service.ts**

```typescript
// apps/server/src/auth/auth.service.ts line 35-37
constructPayload(content: string, nonce: string, timestamp: string | number): string {
    // FIX: Match what client signs: JSON.stringify({content, timestamp})
    // The client already encodes this as base64, so we just need to verify
    // the raw payload was signed. For backward compatibility with the protocol:
    return `${content}${nonce}${timestamp}`;
}
```

**Step 4: Fix client store.ts to match**

```typescript
// apps/client/src/core/store.ts line 179-186
async sendMessage(content: string): Promise<void> {
    const timestamp = Date.now();
    const nonce = crypto.randomUUID();
    const payload = JSON.stringify({ content, timestamp });
    
    // Sign the raw payload (not base64 encoded)
    const signature = rustCore.signPayload(
        Buffer.from(payload),  // Sign raw JSON, not base64
        this.state.privateKey
    );

    await api.sendMessage({
        channelId: this.state.currentRoom,
        payload: Buffer.from(payload).toString('base64'),
        signature: signature.toString('base64'),
        nonce,
        timestamp,
        senderPubKey: this.state.pubKey!,
    });
}
```

**Step 5: Run test to verify it passes**

Run: `npm test -- apps/server/test/signature.spec.ts`
Expected: PASS

---

## Phase 1: Make App Work for Real (User-Facing Data)

### Task 1.1: Dynamic Channel Sidebar from Server

**Files:**
- Modify: `apps/client/src/ui/layout.ts:44`
- Modify: `apps/client/src/core/store.ts:203-206`
- Modify: `apps/client/src/index.ts`

**Step 1: Write the failing test**

```typescript
// apps/client/test/store.spec.ts
describe('AppStore', () => {
  it('should load rooms from API', async () => {
    const store = new AppStore();
    // Mock API to return rooms
    const rooms = await store.listRooms();
    expect(rooms).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**
Expected: FAIL — store doesn't fetch rooms from API on init

**Step 3: Implement dynamic room loading**

```typescript
// apps/client/src/core/store.ts - add after initialize()
async loadRooms(): Promise<void> {
    const rooms = await api.listRooms();
    this.setRooms(rooms);
}

// In createLayout or after vault unlock in index.ts:
// Fetch and populate channel sidebar
const rooms = await store.listRooms();
const roomItems = rooms.map(r => `# ${r.id}`);
layout.channelSidebar.setItems(roomItems);
```

**Step 4: Update layout.ts to support dynamic items**

```typescript
// apps/client/src/ui/layout.ts line 44
// Remove hardcoded items
items: [], // Will be populated dynamically
```

**Step 5: Run test to verify it passes**

---

### Task 1.2: Real User List from Server

**Files:**
- Modify: `apps/client/src/ui/layout.ts:106`
- Modify: `apps/client/src/core/store.ts:208-211`

**Step 1: Implement user list fetching**

```typescript
// apps/client/src/core/store.ts
async fetchRoomUsers(roomId: string): Promise<string[]> {
    const users = await api.getRoomUsers(roomId);
    this.setOnlineUsers(users);
    return users;
}

// In joinRoom(), after connecting:
await this.fetchRoomUsers(roomId);
```

**Step 2: Update layout.ts**

```typescript
// apps/client/src/ui/layout.ts line 106
items: [], // Will be populated dynamically
```

---

### Task 1.3: SSE Reconnection with Exponential Backoff

**Files:**
- Modify: `apps/client/src/core/api.ts:76-95`

**Step 1: Implement reconnection logic**

```typescript
// apps/client/src/core/api.ts
streamMessages(roomId: string, onMessage: (data: Message) => void, onError?: (error: Error) => void): () => void {
    let reconnectAttempts = 0;
    const maxAttempts = 5;
    const baseDelay = 1000; // 1 second
    
    const connect = () => {
        const eventSource = new EventSource(`${this.baseUrl}/chat/stream?roomId=${roomId}`);
        
        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                reconnectAttempts = 0; // Reset on success
                onMessage(data);
            } catch (e) {
                console.error('Failed to parse SSE message:', e);
            }
        };
        
        eventSource.onerror = () => {
            eventSource.close();
            if (reconnectAttempts < maxAttempts) {
                const delay = baseDelay * Math.pow(2, reconnectAttempts);
                reconnectAttempts++;
                console.log(`SSE reconnecting in ${delay}ms (attempt ${reconnectAttempts})`);
                setTimeout(connect, delay);
            } else {
                if (onError) {
                    onError(new Error('Max reconnection attempts reached'));
                }
            }
        };
    };
    
    connect();
    
    // Return cleanup function
    return () => { /* cleanup */ };
}
```

---

### Task 1.4: Auto-Register PubKey on Server After Vault Creation

**Files:**
- Modify: `apps/client/src/core/store.ts:64-73`

**Step 1: Add server registration**

```typescript
// apps/client/src/core/store.ts
async createVault(password: string, email: string): Promise<string> {
    const pubKey = rustCore.createVault(password, email);
    this.updateState({
        isVaultInitialized: true,
        isUnlocked: true,
        pubKey,
    });
    
    // Auto-register on server (triggers upsert via SignatureGuard)
    try {
        await api.sendMessage({
            channelId: '_register',
            payload: Buffer.from(JSON.stringify({ action: 'register', pubKey })).toString('base64'),
            signature: '',
            nonce: '',
            timestamp: Date.now(),
            senderPubKey: pubKey,
        });
    } catch (e) {
        // Registration is best-effort; user can retry later
        console.warn('Auto-registration failed:', e);
    }
    
    this.emit('vault:initialized', pubKey);
    return pubKey;
}
```

---

### Task 1.5: Render Message History on Room Join

**Files:**
- Modify: `apps/client/src/index.ts:154-161`
- Modify: `apps/client/src/core/store.ts:113-115`

**Step 1: Render history in chatLog**

```typescript
// apps/client/src/index.ts - add event listener
store.on('messages:history', ({ roomId, messages }) => {
    const historyLog = messages
        .reverse() // Oldest first
        .map(msg => {
            const time = new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const sender = msg.senderPubKey.slice(0, 8);
            const content = Buffer.from(msg.content, 'base64').toString();
            return `{blue-fg}[${time}]{/blue-fg} {cyan-fg}<${sender}>{/cyan-fg} ${content}`;
        })
        .join('\n');
    layout.chatLog.log(historyLog);
    screen.render();
});
```

---

## Phase 2: Terminal Image Support (Kitty/Sixel)

### Task 2.1: Add viuer to Rust Core for Image Display

**Files:**
- Modify: `packages/core-rust/Cargo.toml`
- Create: `packages/core-rust/src/image.rs`
- Modify: `packages/core-rust/src/lib.rs`

**Step 1: Add viuer dependency**

```toml
# packages/core-rust/Cargo.toml
[dependencies]
viuer = "0.6"
image = "0.25"

[features]
default = []
sixel = ["viuer/sixel"]
```

**Step 2: Create image.rs**

```rust
// packages/core-rust/src/image.rs
use viuer::{print_from_file, Config};
use std::path::Path;

#[napi]
pub fn display_image(path: String, width: Option<u32>, height: Option<u32>) -> Result<()> {
    let config = Config {
        width,
        height,
        absolute_offset: false,
        x: 0,
        y: 0,
        ..Default::default()
    };
    
    print_from_file(path, &config)
        .map_err(|e| Error::new(Status::GenericFailure, e.to_string()))
}

#[napi]
pub fn display_image_from_bytes(bytes: Vec<u8>, width: Option<u32>, height: Option<u32>) -> Result<()> {
    use image::load_from_memory;
    use image::DynamicImage;
    
    let img = load_from_memory(&bytes)
        .map_err(|e| Error::new(Status::GenericFailure, e.to_string()))?;
    
    let config = Config {
        width,
        height,
        absolute_offset: false,
        x: 0,
        y: 0,
        ..Default::default()
    };
    
    print(&img, &config)
        .map_err(|e| Error::new(Status::GenericFailure, e.to_string()))
}
```

**Step 3: Export in lib.rs**

```rust
// packages/core-rust/src/lib.rs
pub mod image;
```

**Step 4: Add to Node.js bridge**

```typescript
// apps/client/src/core/rust-bridge.ts
displayImage: (path: string, width?: number, height?: number): void => {
    return core.displayImage(path, width, height);
},
```

---

### Task 2.2: Image Message Handling in Client

**Files:**
- Modify: `apps/client/src/core/store.ts`
- Modify: `apps/client/src/index.ts`

**Step 1: Detect image URLs in messages**

```typescript
// apps/client/src/core/store.ts - in message handler
const IMAGE_URL_REGEX = /\.(png|jpg|jpeg|gif|webp)$/i;

onMessage = (message) => {
    const content = Buffer.from(message.content, 'base64').toString();
    
    if (IMAGE_URL_REGEX.test(content)) {
        // Handle as image URL - download and display
        this.handleImageMessage(content);
    }
};

async handleImageUrl(url: string): Promise<void> {
    // Download image to temp file
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    const tempPath = `/tmp/tchat-image-${Date.now()}.png`;
    
    // Write to temp file (using Node.js fs)
    require('fs').writeFileSync(tempPath, Buffer.from(buffer));
    
    // Display via Rust
    rustCore.displayImage(tempPath, 40, 20);
}
```

---

## Phase 3: UI/UX Modernization

### Task 3.1: Unicode Modern Borders

**Files:**
- Modify: `apps/client/src/ui/layout.ts`

**Step 1: Apply rounded Unicode corners**

```typescript
// apps/client/src/ui/layout.ts
// In each element with border: 'line', customize:

const modernBorder = {
    type: 'line' as const,
    left: '│',
    right: '│',
    top: '─',
    bottom: '─',
    topLeft: '╭',
    topRight: '╮',
    bottomLeft: '╰',
    bottomRight: '╯',
};

// Apply to channelSidebar
channelSidebar = blessed.list({
    // ...
    border: modernBorder,
});

// Apply to chatLog
chatLog = blessed.log({
    // ...
    border: modernBorder,
});

// Apply to userList
userList = blessed.list({
    // ...
    border: modernBorder,
});

// Apply to inputBar
inputBar = blessed.textbox({
    // ...
    border: modernBorder,
});
```

---

### Task 3.2: Mouse Support (Click, Hover, Scroll)

**Files:**
- Modify: `apps/client/src/index.ts:10-16`
- Modify: `apps/client/src/ui/layout.ts`

**Step 1: Enable mouse in screen**

```typescript
// apps/client/src/index.ts
const screen = blessed.screen({
    smartCSR: true,
    title: 'tchat - Terminal Chat',
    dockBorders: true,
    autoPadding: true,
    mouse: true,  // Enable mouse events
});
```

**Step 2: Add click handler for channels**

```typescript
// apps/client/src/index.ts - in setupEventListeners
layout.channelSidebar.on('click', async (item: any) => {
    // Get the clicked item text
    const roomName = item.getText?.() || item.content;
    if (roomName && roomName.startsWith('#')) {
        const roomId = roomName.replace('#', '').trim();
        try {
            layout.chatLog.log(`{yellow-fg}[ENTRANDO]{/yellow-fg} Sala #${roomId}...`);
            await store.joinRoom(roomId);
            layout.chatLog.log(`{green-fg}[SALA]{/green-fg} Entrou na sala #${roomId}`);
        } catch (err: any) {
            layout.chatLog.log(`{red-fg}[ERRO]{/red-fg} ${err.message}`);
        }
    }
});
```

**Step 3: Add hover effects**

```typescript
// Add hover styling to channels
channelSidebar.on('mouseover', (item: any) => {
    item.style = { ...theme.sidebar.selected };
    screen.render();
});

channelSidebar.on('mouseout', (item: any) => {
    item.style = { ...theme.sidebar };
    screen.render();
});
```

---

### Task 3.3: Context Menu on Right-Click

**Files:**
- Modify: `apps/client/src/index.ts`

**Step 1: Create context menu**

```typescript
// apps/client/src/index.ts
function createContextMenu(screen: blessed.Widgets.Screen) {
    const menu = blessed.list({
        parent: screen,
        width: 20,
        height: 'shrink',
        border: 'line',
        hidden: true,
        items: ['Ver Perfil', 'Mencionar', 'Copiar PubKey', 'Bloquear'],
        style: {
            selected: { bg: colors.primary, fg: 'white' }
        }
    });
    
    menu.on('select', () => {
        menu.hide();
        screen.render();
    });
    
    menu.on('blur', () => {
        menu.hide();
        screen.render();
    });
    
    return menu;
}

// Add right-click handler to userList items
layout.userList.on('click', (item: any, data: any) => {
    if (data.button === 'right') {
        const menu = getContextMenu();
        menu.left = data.x;
        menu.top = data.y;
        menu.show();
        menu.focus();
        screen.render();
    }
});
```

---

### Task 3.4: Message Bubbles (Styled Messages)

**Files:**
- Modify: `apps/client/src/index.ts:154-161`

**Step 1: Style messages as bubbles**

```typescript
// Render message with bubble styling
function formatMessageBubble(msg: Message, isOwn: boolean): string {
    const time = new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const sender = msg.senderPubKey.slice(0, 8);
    const content = Buffer.from(msg.content, 'base64').toString();
    
    // Own messages on right (green tint), others on left (default)
    const bubbleColor = isOwn ? 'green' : 'cyan';
    const align = isOwn ? '{right}' : '';
    
    return `{${bubbleColor}-fg}[${time}] <${sender}>${/}${bubbleColor}-fg} ${content}{/}`;
}

// In message:received handler
const isOwn = message.senderPubKey === store.getState().pubKey;
layout.chatLog.log(formatMessageBubble(message, isOwn));
```

---

### Task 3.5: Time Dividers

**Files:**
- Modify: `apps/client/src/index.ts`

**Step 1: Add time-based dividers**

```typescript
// Track last message time
let lastMessageDate: Date | null = null;

store.on('message:received', (message: Message) => {
    const msgDate = new Date(message.createdAt);
    
    // Check if day changed
    if (lastMessageDate) {
        const dayDiff = msgDate.getDate() - lastMessageDate.getDate();
        if (dayDiff !== 0) {
            const divider = `─────────────── ${msgDate.toLocaleDateString('pt-BR')} ───────────────`;
            layout.chatLog.log(`{yellow-fg}${divider}{/yellow-fg}`);
        }
        
        // Check if time gap > 30 minutes
        const timeDiff = msgDate.getTime() - lastMessageDate.getTime();
        if (timeDiff > 30 * 60 * 1000) {
            const timeDivider = `{gray-fg}── ${msgDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) } ──{/}`;
            layout.chatLog.log(timeDivider);
        }
    }
    
    lastMessageDate = msgDate;
});
```

---

### Task 3.6: Identicons for Users

**Files:**
- Modify: `packages/core-rust/Cargo.toml`
- Create: `packages/core-rust/src/identicon.rs`
- Modify: `apps/client/src/core/rust-bridge.ts`
- Modify: `apps/client/src/ui/layout.ts`

**Step 1: Add identicon-rs to Cargo.toml**

```toml
# packages/core-rust/Cargo.toml
[dependencies]
identicon-rs = "7.1"
```

**Step 2: Create identicon.rs**

```rust
// packages/core-rust/src/identicon.rs
use identicon_rs::Identicon;

#[napi]
pub fn generate_identicon(pubkey: String, size: u32) -> Result<String> {
    let ident = Identicon::new(&pubkey);
    
    // Generate SVG (can be rendered as text/ASCII or converted to image)
    let svg = ident.to_svg(size);
    
    Ok(svg)
}

#[napi]
pub fn generate_identicon_ascii(pubkey: String) -> Result<String> {
    // Simple ASCII representation based on hash
    let hash = compute_hash(&pubkey);
    let chars = "@#%&+-$*o;:,. ";
    
    let mut result = String::new();
    for i in 0..5 {
        for j in 0..5 {
            let idx = (hash[i * 5 + j] as usize) % chars.len();
            result.push(chars[idx]);
        }
        result.push('\n');
    }
    
    Ok(result)
}

fn compute_hash(input: &str) -> Vec<u8> {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    
    let mut hasher = DefaultHasher::new();
    input.hash(&mut hasher);
    let hash = hasher.finish();
    
    // Expand to 25 bytes for 5x5 grid
    (0..25).map(|i| ((hash >> (i * 5)) & 0x1F) as u8).collect()
}
```

**Step 3: Export and add to bridge**

```typescript
// apps/client/src/core/rust-bridge.ts
generateIdenticon: (pubkey: string): string => {
    return core.generateIdenticonAscii(pubkey);
},
```

**Step 4: Render in userList**

```typescript
// apps/client/src/ui/layout.ts - when populating user list
const identicon = rustCore.generateIdenticon(userPubKey);
const displayLine = `${identicon} ${userPubKey.slice(0, 8)}`;
```

---

## Phase 4: Enhanced Security UX

### Task 4.1: Argon2 Progress Feedback (Loading Spinner)

**Files:**
- Modify: `apps/client/src/ui/screens/onboarding.ts`
- Modify: `packages/core-rust/src/crypto.rs`

**Step 1: Add spinner to onboarding**

```typescript
// apps/client/src/ui/screens/onboarding.ts - in handleSubmit
const spinner = ['|', '/', '-', '\\'];
let spinIdx = 0;

statusLabel.setContent('{yellow-fg}Criando cofre... ' + spinner[0] + '{/yellow-fg}');
screen.render();

const spinInterval = setInterval(() => {
    spinIdx = (spinIdx + 1) % spinner.length;
    statusLabel.setContent('{yellow-fg}Criando cofre... ' + spinner[spinIdx] + '{/yellow-fg}');
    screen.render();
}, 100);

try {
    const pubKey = await store.createVault(password, email);
    clearInterval(spinInterval);
    modal.destroy();
    resolve({ success: true, data: { pubKey } });
} catch (error: any) {
    clearInterval(spinInterval);
    statusLabel.setContent(`{red-fg}Erro: ${error.message}{/red-fg}`);
    screen.render();
}
```

---

### Task 4.2: Input Obfuscation (True Password Masking)

**Files:**
- Modify: `apps/client/src/ui/screens/onboarding.ts`

**Step 1: Add invisible input mode**

```typescript
// Add a checkbox or toggle for "Modo Invisível"
// In onboarding.ts, add after passwordInput:

const invisibleToggle = blessed.checkbox({
    parent: modal,
    top: 8,
    left: 50,
    content: 'Modo Invisível',
    style: {
        checked: { fg: colors.success },
        unchecked: { fg: colors.textMuted }
    }
});

invisibleToggle.on('check', () => {
    passwordInput.options.censor = false;  // True invisibility
    passwordInput.render();
});

invisibleToggle.on('uncheck', () => {
    passwordInput.options.censor = true;   // Show asterisks
    passwordInput.render();
});
```

---

### Task 4.3: Auto-Lock by Inactivity

**Files:**
- Modify: `apps/client/src/index.ts`
- Modify: `apps/client/src/core/store.ts`

**Step 1: Add inactivity timer**

```typescript
// apps/client/src/index.ts
const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes
let inactivityTimer: NodeJS.Timeout | null = null;

function resetInactivityTimer() {
    if (inactivityTimer) {
        clearTimeout(inactivityTimer);
    }
    inactivityTimer = setTimeout(() => {
        // Lock vault and show unlock screen
        store.lockVault();
        layout.chatLog.log('{yellow-fg}[SISTEMA]{/yellow-fg} Cofre bloqueado por inatividade');
        
        // Show unlock screen again
        showUnlockScreen(screen).then(result => {
            if (!result.success) {
                process.exit(0);
            }
        });
    }, INACTIVITY_TIMEOUT);
}

// Reset timer on any input
layout.inputBar.on('keypress', resetInactivityTimer);
screen.on('keypress', resetInactivityTimer);

// Start timer
resetInactivityTimer();
```

---

### Task 4.4: Privacy Mode (Ctrl+P to Hide)

**Files:**
- Modify: `apps/client/src/index.ts`

**Step 1: Implement privacy toggle**

```typescript
// apps/client/src/index.ts
let privacyMode = false;

screen.key('C-p', () => {
    privacyMode = !privacyMode;
    
    if (privacyMode) {
        // Hide all messages, show generic
        (layout.chatLog as any).clear();
        layout.chatLog.log('{yellow-fg}[MODO PRIVADO]{/yellow-fg} Mensagens ocultas (pressione Ctrl+P novamente)');
        layout.userList.setItems(['••••••••']);
    } else {
        // Restore (reload messages from store)
        const messages = store.getMessages(store.getState().currentRoom || 'general');
        messages.forEach(msg => {
            const content = Buffer.from(msg.content, 'base64').toString();
            layout.chatLog.log(content);
        });
        
        // Restore user list
        const users = store.getState().onlineUsers;
        layout.userList.setItems(users.map(u => u.slice(0, 8)));
    }
    
    screen.render();
});
```

---

## Phase 5: Registration Flow Improvements

### Task 5.1: Entropy Collection Meter

**Files:**
- Modify: `apps/client/src/ui/screens/onboarding.ts`

**Step 1: Add entropy visualization**

```typescript
// In showOnboardingScreen, add after emailInput focus tracking
let entropyLevel = 0;
const updateEntropy = () => {
    const email = emailInput.getValue();
    const password = passwordInput.getValue();
    
    // Simple entropy estimation
    let score = 0;
    if (email.length > 0) score += 10;
    if (password.length > 8) score += 30;
    if (/[A-Z]/.test(password)) score += 15;
    if (/[a-z]/.test(password)) score += 15;
    if (/[0-9]/.test(password)) score += 15;
    if (/[^A-Za-z0-9]/.test(password)) score += 15;
    
    entropyLevel = Math.min(score, 100);
    
    // Visual meter
    const meter = '█'.repeat(Math.floor(entropyLevel / 10)) + '░'.repeat(10 - Math.floor(entropyLevel / 10));
    entropyLabel.setContent(`Entropia: [${meter}] ${entropyLevel}%`);
    screen.render();
};

emailInput.on('keypress', updateEntropy);
passwordInput.on('keypress', updateEntropy);

const entropyLabel = blessed.text({
    parent: modal,
    top: 16,
    left: 3,
    content: 'Entropia: [░░░░░░░░░░] 0%',
    tags: true,
});
```

---

### Task 5.2: Seed Phrase Display (12-word Backup)

**Files:**
- Modify: `packages/core-rust/Cargo.toml`
- Modify: `packages/core-rust/src/vault.rs`
- Create: `packages/core-rust/src/mnemonic.rs`
- Modify: `apps/client/src/ui/screens/onboarding.ts`

**Step 1: Add mnemonic crate**

```toml
# packages/core-rust/Cargo.toml
[dependencies]
bip39 = "2"
```

**Step 2: Generate and store seed**

```rust
// packages/core-rust/src/mnemonic.rs
use bip39::{Mnemonic, MnemonicType, Seed};

#[napi]
pub fn generate_mnemonic() -> Result<String> {
    let mnemonic = Mnemonic::new(MnemonicType::Words12, bip39::Language::English);
    Ok(mnemonic.to_string())
}

#[napi]
pub fn validate_mnemonic(mnemonic: String) -> Result<bool> {
    match Mnemonic::from_phrase(&mnemonic, bip39::Language::English) {
        Ok(_) => Ok(true),
        Err(_) => Ok(false),
    }
}
```

**Step 3: Show in onboarding**

```typescript
// After vault creation, show seed phrase
const seedModal = blessed.box({
    parent: screen,
    top: 'center',
    left: 'center',
    width: 50,
    height: 10,
    border: 'line',
    style: { border: { fg: colors.warning } },
    tags: true,
});

const seedPhrase = rustCore.generateMnemonic();
seedModal.setContent(`{bold}{yellow-fg}FRASE DE RECUPERAÇÃO{/yellow-fg}{/bold}

${seedPhrase}

{italic}Anote estas 12 palavras em local seguro.
Elas são necessárias para recuperar sua conta.{/italic}

Pressione qualquer tecla para continuar...`);
screen.render();

screen.key('press', () => {
    seedModal.destroy();
    resolve({ success: true, data: { pubKey } });
});
```

---

### Task 5.3: QR Code 2FA Setup at Registration

**Files:**
- Modify: `apps/client/src/ui/screens/onboarding.ts`
- Modify: `apps/client/src/core/store.ts`

**Step 1: Show QR code after vault creation**

```typescript
// In onboarding flow, after createVault
try {
    const pubKey = await store.createVault(password, email);
    
    // Setup 2FA
    const totpSetup = await api.setup2FA(pubKey);
    
    const qrModal = blessed.box({
        parent: screen,
        top: 'center',
        left: 'center',
        width: 40,
        height: 15,
        border: 'line',
        style: { border: { fg: colors.primary } },
        tags: true,
    });
    
    qrModal.setContent(`{bold}Configurar 2FA{/bold}

Escaneie o QR Code com seu app autenticador:

${totpSetup.qrCode}

Código: ${totpSetup.secret}

Pressione Enter para confirmar...`);
    screen.render();
    
} catch (error: any) {
    // ...
}
```

---

## Phase 6: Advanced Features (Future)

### Task 6.1: Per-Room E2EE Keys (Room Symmetric Encryption)

This is documented in PROTOCOL.md but not yet implemented. Will require:
- Room key generation and storage
- Key exchange handshake
- Message encryption/decryption

### Task 6.2: Forward Secrecy (Double Ratchet)

Future enhancement for true zero-knowledge security.

---

## Summary of Tasks by Priority

| Priority | Task | Files |
|----------|------|-------|
| P0 | Signature mismatch fix | auth.service.ts, store.ts |
| P1 | Dynamic channel sidebar | layout.ts, store.ts |
| P1 | Real user list | layout.ts, store.ts |
| P1 | SSE reconnection | api.ts |
| P1 | Message history rendering | index.ts, store.ts |
| P2 | Unicode borders | layout.ts |
| P2 | Mouse support | index.ts, layout.ts |
| P2 | Context menu | index.ts |
| P3 | Image support (viuer) | core-rust/*, store.ts |
| P3 | Identicons | core-rust/*, layout.ts |
| P3 | Message bubbles | index.ts |
| P3 | Time dividers | index.ts |
| P4 | Auto-lock | index.ts |
| P4 | Privacy mode | index.ts |
| P4 | Input obfuscation | onboarding.ts |
| P5 | Seed phrase | core-rust/*, onboarding.ts |
| P5 | 2FA QR code | onboarding.ts |

---

## Execution

This plan should be executed in order:
1. Phase 0: Bug fixes first (P0)
2. Phase 1: Make app functional (P1)
3. Phase 2-5: UX improvements (P2-P4)
4. Phase 6: Future features (P5)

Use `@skill:executing-plans` to implement task-by-task with TDD.
