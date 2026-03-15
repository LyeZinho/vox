#!/bin/bash

set -e

TCHAT_VERSION="0.1.0"
INSTALL_DIR="${HOME}/.tchat"
BIN_DIR="${HOME}/.local/bin"

echo "Installing tchat v${TCHAT_VERSION}..."

mkdir -p "${INSTALL_DIR}"
mkdir -p "${BIN_DIR}"

detect_os() {
    case "${OSTYPE}" in
        linux*) echo "linux" ;;
        darwin*) echo "macos" ;;
        msys*|cygwin*|win32*) echo "windows" ;;
        *) echo "unknown" ;;
    esac
}

detect_arch() {
    case "$(uname -m)" in
        x86_64|amd64) echo "x64" ;;
        aarch64|arm64) echo "arm64" ;;
        *) echo "x64" ;;
    esac
}

OS=$(detect_os)
ARCH=$(detect_arch)

echo "Detected: ${OS}-${ARCH}"

if [ "${OS}" = "linux" ]; then
    PLATFORM="linux-gnu"
elif [ "${OS}" = "macos" ]; then
    PLATFORM="apple-darwin"
else
    echo "Unsupported OS: ${OS}"
    exit 1
fi

CORE_BINARY="tchat-core.${PLATFORM}.node"
DOWNLOAD_URL="https://github.com/LyeZinho/tchat/releases/latest/download/${CORE_BINARY}"

echo "Downloading crypto core..."
curl -L -o "${INSTALL_DIR}/${CORE_BINARY}" "${DOWNLOAD_URL}" || {
    echo "Failed to download. Building from source..."
}

echo "Creating launch script..."
cat > "${BIN_DIR}/tchat" << 'EOF'
#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export TCHAT_HOME="${HOME}/.tchat"
exec node "${SCRIPT_DIR}/../apps/client/dist/index.js" "$@"
EOF

chmod +x "${BIN_DIR}/tchat"

echo ""
echo "Installation complete!"
echo ""
echo "Add to your PATH:"
echo "  export PATH=\"\${HOME}/.local/bin:\${PATH}\""
echo ""
echo "Then run: tchat"
