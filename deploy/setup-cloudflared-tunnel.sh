#!/usr/bin/env bash
# One-time setup for a named Cloudflare Tunnel to this machine's Docker stack.
# Prerequisites: zone tfeuerbach.dev on Cloudflare (DNS handled by Cloudflare).
#
# Usage:
#   ./deploy/setup-cloudflared-tunnel.sh
#
# This script will:
#   1. Run `cloudflared tunnel login` if needed (opens a browser).
#   2. Create tunnel "stellar-legacy" (skip if it already exists).
#   3. Write ~/.cloudflared/config.yml with ingress to localhost ports.
#   4. Create public DNS records for the three hostnames.
#   5. Print commands to enable the user systemd service (survives reboot with linger).

set -euo pipefail

CFD="${HOME}/.local/bin/cloudflared"
CFG_DIR="${HOME}/.cloudflared"
CFG="${CFG_DIR}/config.yml"
TUNNEL_NAME="stellar-legacy"
HOST_FRONT="stellar-legacy.tfeuerbach.dev"
HOST_API="stellar-legacy-api.tfeuerbach.dev"
HOST_VOXEL="stellar-legacy-voxel.tfeuerbach.dev"

if [[ ! -x "${CFD}" ]]; then
  echo "Installing cloudflared to ~/.local/bin ..."
  mkdir -p "${HOME}/.local/bin"
  curl -sL "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64" -o "${CFD}"
  chmod +x "${CFD}"
fi

mkdir -p "${CFG_DIR}"

if [[ ! -f "${CFG_DIR}/cert.pem" ]]; then
  echo ">>> Authenticate with Cloudflare (browser will open)..."
  "${CFD}" tunnel login
fi

read_tunnel_id() {
  "${CFD}" tunnel list -n "${TUNNEL_NAME}" -o json | python3 -c "
import json, sys
name = '${TUNNEL_NAME}'
data = json.load(sys.stdin)
rows = data if isinstance(data, list) else data.get('tunnels') or data.get('result') or []
for row in rows:
    n = row.get('name') or row.get('Name')
    if n == name:
        tid = row.get('id') or row.get('ID')
        if tid:
            print(tid)
            sys.exit(0)
sys.exit(1)
"
}

TUNNEL_ID="$(read_tunnel_id 2>/dev/null || true)"
if [[ -z "${TUNNEL_ID}" ]]; then
  echo ">>> Creating tunnel ${TUNNEL_NAME}..."
  "${CFD}" tunnel create "${TUNNEL_NAME}"
  TUNNEL_ID="$(read_tunnel_id)"
fi

if [[ -z "${TUNNEL_ID}" ]]; then
  echo "Could not resolve tunnel UUID for ${TUNNEL_NAME}. Try: ${CFD} tunnel list -n ${TUNNEL_NAME} -o json"
  exit 1
fi

CREDS="${CFG_DIR}/${TUNNEL_ID}.json"
if [[ ! -f "${CREDS}" ]]; then
  echo "Expected credentials at ${CREDS} — check tunnel create output."
  exit 1
fi

cat > "${CFG}" <<EOF
tunnel: ${TUNNEL_ID}
credentials-file: ${CREDS}

ingress:
  - hostname: ${HOST_FRONT}
    service: http://127.0.0.1:5173
  - hostname: ${HOST_API}
    service: http://127.0.0.1:3001
  - hostname: ${HOST_VOXEL}
    service: http://127.0.0.1:8081
  - service: http_status:404
EOF

echo ">>> Wrote ${CFG}"

echo ">>> Adding DNS routes..."
"${CFD}" tunnel route dns "${TUNNEL_NAME}" "${HOST_FRONT}" || true
"${CFD}" tunnel route dns "${TUNNEL_NAME}" "${HOST_API}" || true
"${CFD}" tunnel route dns "${TUNNEL_NAME}" "${HOST_VOXEL}" || true

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo
echo ">>> Test run (Ctrl+C to stop): ${CFD} tunnel --config ${CFG} run"
echo
echo ">>> Persist across reboots (user systemd, no sudo):"
echo "    mkdir -p \"${HOME}/.config/systemd/user\""
echo "    cp \"${SCRIPT_DIR}/systemd/cloudflared-stellar-legacy.service\" \"${HOME}/.config/systemd/user/\""
echo "    systemctl --user daemon-reload"
echo "    systemctl --user enable --now cloudflared-stellar-legacy.service"
echo "    loginctl enable-linger \"${USER}\""
echo
echo "Ensure Docker Compose is up (localhost:5173, :3001, :8081 for voxel)."
