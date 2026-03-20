#!/bin/bash

set -e

VAX_VERSION="${1:-latest}"
INSTALL_DIR="${HOME}/.vax"
BIN_DIR="${HOME}/.local/bin"

if [ -n "${VAX_SERVER}" ]; then
    echo "[vax] Custom server: ${VAX_SERVER}"
fi

echo "[vax] Installing VAX Chat v${VAX_VERSION}..."

mkdir -p "${INSTALL_DIR}"
mkdir -p "${BIN_DIR}"

detect_os() {
    case "${OSTYPE}" in
        linux*)  echo "linux" ;;
        darwin*) echo "darwin" ;;
        msys*|cygwin*|win32*) echo "windows" ;;
        *)      echo "unknown" ;;
    esac
}

detect_arch() {
    case "$(uname -m)" in
        x86_64|amd64)  echo "x64" ;;
        aarch64|arm64) echo "arm64" ;;
        *)              echo "x64" ;;
    esac
}

OS=$(detect_os)
ARCH=$(detect_arch)

if [ "${OS}" = "unknown" ]; then
    echo "[vax] Error: unsupported OS (${OSTYPE})"
    exit 1
fi

echo "[vax] Platform: ${OS}-${ARCH}"

if [ "${VAX_VERSION}" = "latest" ]; then
    TAG_URL="https://api.github.com/repos/LyeZinho/vox/releases/latest"
    ASSET_URL=$(curl -s "${TAG_URL}" | grep -o '"browser_download_url": "[^"]*' | grep "vax-core" | head -1 | cut -d'"' -f4 | sed 's/browser_download_url.*: "//')
    VAX_VERSION=$(curl -s "${TAG_URL}" | grep -o '"tag_name": "[^"]*' | cut -d'"' -f4 | sed 's/v//')
else
    ASSET_URL="https://github.com/LyeZinho/vox/releases/download/v${VAX_VERSION}"
fi

TRIPLET=""
if [ "${OS}" = "linux" ]; then
    [ "${ARCH}" = "x64" ] && TRIPLET="x86_64-unknown-linux-gnu"
    [ "${ARCH}" = "arm64" ] && TRIPLET="aarch64-unknown-linux-gnu"
elif [ "${OS}" = "darwin" ]; then
    [ "${ARCH}" = "x64" ] && TRIPLET="x86_64-apple-darwin"
    [ "${ARCH}" = "arm64" ] && TRIPLET="aarch64-apple-darwin"
fi

CORE_NAME="vax-core.${TRIPLET}.node"

echo "[vax] Downloading vax-core..."
curl -L --fail --progress-bar \
    "${ASSET_URL}/${CORE_NAME}" \
    -o "${INSTALL_DIR}/${CORE_NAME}"

echo "[vax] Downloading client bundle..."
curl -L --fail --progress-bar \
    "${ASSET_URL}/client.tar.gz" \
    -o "${INSTALL_DIR}/client.tar.gz"

echo "[vax] Extracting client..."
tar -xzf "${INSTALL_DIR}/client.tar.gz" -C "${INSTALL_DIR}/"

if [ -n "${VAX_SERVER}" ]; then
    SERVER_ARG="--server ${VAX_SERVER}"
else
    SERVER_ARG=""
fi

cat > "${BIN_DIR}/vax" << LAUNCHER
#!/bin/bash
export VAX_HOME="\${HOME}/.vax"
exec node "\${HOME}/.vax/client/index.js" ${SERVER_ARG} "\$@"
LAUNCHER

chmod +x "${BIN_DIR}/vax"

echo ""
echo "[vax] v${VAX_VERSION} installed to \${HOME}/.vax"
echo "[vax] Run: vax"
echo ""
echo "Custom server:"
echo "  VAX_SERVER=https://your-server.com vax"
echo "  # or: export VAX_SERVER=https://your-server.com && vax"
