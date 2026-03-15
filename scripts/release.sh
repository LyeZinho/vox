#!/bin/bash
set -e

VERSION="${1}"
if [ -z "${VERSION}" ]; then
    VERSION=$(node -p "require('./packages/core-rust/package.json').version")
fi
RELEASE_DIR="release/${VERSION}"
TEMP_DIR=$(mktemp -d)

cleanup() {
    rm -rf "${TEMP_DIR}"
}
trap cleanup EXIT

echo "=========================================="
echo "  tchat Release v${VERSION}"
echo "=========================================="
echo ""

echo "[1/6] Checking environment..."
command -v git >/dev/null 2>&1 || { echo "git required"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "npm required"; exit 1; }
command -v cargo >/dev/null 2>&1 || { echo "cargo required"; exit 1; }

# Automatic version bumping if a version is provided
if [ ! -z "${1}" ] && [[ "${1}" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "Bumping version to ${VERSION}..."
    npm version "${VERSION}" --no-git-tag-version
    VERSION="${1}"
fi

echo "[2/6] Building Rust core..."
cd packages/core-rust
cargo build --release 2>/dev/null || cargo build --release
mkdir -p "${TEMP_DIR}/core"
# Copy result for multiple platforms if possible, but definitely the current one
cp target/release/libtchat_core.so "${TEMP_DIR}/tchat-core.linux-x64-gnu.node" 2>/dev/null || true
cd ../..

echo "[3/6] Building server..."
npm run build -w apps/server
mkdir -p "${TEMP_DIR}/server"
cp -r apps/server/dist/* "${TEMP_DIR}/server/"

echo "[4/6] Building client..."
npm run build -w apps/client
mkdir -p "${TEMP_DIR}/client"
cp -r apps/client/dist/* "${TEMP_DIR}/client/"

echo "[5/6] Generating manifest and changelog..."
cat > "${TEMP_DIR}/manifest.json" << EOF
{
  "version": "${VERSION}",
  "releaseDate": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "vax_core": "v1.2.0-stable",
  "min_server_version": "1.0.0"
}
EOF

CHANGELOG_FILE="${TEMP_DIR}/CHANGELOG.md"
echo "# VAX Chat Release v${VERSION}" > "${CHANGELOG_FILE}"
echo "" >> "${CHANGELOG_FILE}"
echo "### Changes in this version" >> "${CHANGELOG_FILE}"
git log -n 10 --pretty=format:"- %s (%h)" >> "${CHANGELOG_FILE}"

echo "[6/6] Finalizing release package..."
mkdir -p "${RELEASE_DIR}"
cp -r "${TEMP_DIR}"/* "${RELEASE_DIR}/"

cat > "${RELEASE_DIR}/package.json" << EOF
{
  "name": "vax-chat",
  "version": "${VERSION}",
  "description": "VAX Chat - Secure Identity & Privacy TUI",
  "main": "client/index.js",
  "scripts": {
    "start": "node client/index.js",
    "server": "node server/main.js"
  }
}
EOF

cat > "${RELEASE_DIR}/README.md" << 'EOF'
# tchat Release

## Installation

1. Extract this release
2. Run: `npm install`
3. Start server: `npm run start:server`
4. Start client: `npm run start`

## Requirements

- Node.js 20+
- Redis
- PostgreSQL
EOF

echo ""
echo "=========================================="
echo "  Release v${VERSION} ready!"
echo "=========================================="
echo ""
echo "Output directory: ${RELEASE_DIR}/"
echo ""
ls -la "${RELEASE_DIR}/"
