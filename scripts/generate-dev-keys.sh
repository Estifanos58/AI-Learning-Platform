#!/usr/bin/env bash
set -euo pipefail

# Generates a local development RSA-2048 keypair (PKCS#8 private key + X.509 public key)
# for JWT signing (auth-service) and verification (api-gateway).
# Never commit generated private keys to version control.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SECRETS_DIR="${1:-${REPO_ROOT}/secrets}"
KEY_BITS="${JWT_RSA_KEY_BITS:-2048}"

PRIVATE_KEY="${SECRETS_DIR}/jwt_private_key.pem"
PUBLIC_KEY="${SECRETS_DIR}/jwt_public_key.pem"

if ! command -v openssl >/dev/null 2>&1; then
  echo "Error: openssl is required to generate RSA keys." >&2
  exit 1
fi

mkdir -p "${SECRETS_DIR}"
chmod 700 "${SECRETS_DIR}"

if [[ -f "${PRIVATE_KEY}" || -f "${PUBLIC_KEY}" ]]; then
  if [[ "${FORCE:-0}" != "1" ]]; then
    echo "Keys already exist in ${SECRETS_DIR}."
    echo "Set FORCE=1 to overwrite them."
    exit 0
  fi
fi

echo "Generating RSA-${KEY_BITS} PKCS#8 keypair in ${SECRETS_DIR}..."
openssl genpkey -algorithm RSA -pkeyopt "rsa_keygen_bits:${KEY_BITS}" -out "${PRIVATE_KEY}"
openssl pkey -in "${PRIVATE_KEY}" -pubout -out "${PUBLIC_KEY}"

# Private key readable by container non-root user when bind-mounted as a Docker secret
chmod 644 "${PRIVATE_KEY}" "${PUBLIC_KEY}"

echo "Generated:"
echo "  Private key: ${PRIVATE_KEY}"
echo "  Public key:  ${PUBLIC_KEY}"
echo "NOTE: For production deployments, inject keys through your orchestrator's secret manager (e.g., Kubernetes Secrets / Vault) with strict permissions."
