#!/usr/bin/env bash
set -euo pipefail

echo "==> TimeGrid Deploy Helper"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: required command '$1' not found" >&2
    exit 1
  fi
}

require_cmd docker-compose
require_cmd curl

# Load .env if present
if [[ -f .env ]]; then
  echo "==> Loading .env"
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

# Basic env validations
if [[ -z "${JWT_SECRET:-}" ]] || [[ "${JWT_SECRET}" == "dev_secret_change_in_production" ]]; then
  echo "Error: JWT_SECRET must be set to a strong value in .env" >&2
  exit 1
fi

if [[ -z "${VITE_API_URL:-}" ]]; then
  echo "Error: VITE_API_URL must be set (e.g., http://localhost:3000 or https://api.domain)" >&2
  exit 1
fi

if [[ -z "${FRONTEND_URLS:-}" && -z "${FRONTEND_URL:-}" ]]; then
  echo "Error: FRONTEND_URLS (or FRONTEND_URL) must be set to allowed frontend origins" >&2
  exit 1
fi

API_HEALTH_URL="${API_HEALTH_URL:-http://localhost:3000/health}"
FRONTEND_URL_HINT="${FRONTEND_URL_HINT:-http://localhost:8080}"

echo "==> Building and starting Docker stack"
docker-compose up --build -d

echo "==> Waiting for API health at ${API_HEALTH_URL}"
retries=30
for i in $(seq 1 "$retries"); do
  if curl -fsSL "$API_HEALTH_URL" >/dev/null; then
    echo "✅ API healthy"
    break
  fi
  sleep 2
done

if ! curl -fsSL "$API_HEALTH_URL" >/dev/null; then
  echo "❌ API health check failed after $((retries*2))s"
  echo "   - Check logs: docker-compose logs -f backend postgres"
  exit 1
fi

echo "==> Deployment complete"
echo "Frontend: ${FRONTEND_URL_HINT}"
echo "API: ${API_HEALTH_URL%/health}"
echo "Logs: docker-compose logs -f backend postgres"