#!/usr/bin/env bash
set -euo pipefail

# Uploads Cloud Run runtime secrets to GCP Secret Manager.
# Usage: ./upload-secrets.sh [--project <GCP_PROJECT_ID>] [--env-file <path>]

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --project|-p) PROJECT="$2"; shift 2;;
    --env-file)   ENVFILE="$2"; shift 2;;
    --help|-h)    echo "Usage: $0 [--project <GCP_PROJECT_ID>] [--env-file <path>]"; exit 0;;
    *) echo "Unknown argument: $1"; exit 1;;
  esac
done

PROJECT="${PROJECT:-$(gcloud config get-value project 2>/dev/null || true)}"
ENVFILE="${ENVFILE:-.env.local}"

if [ -z "$PROJECT" ]; then
  echo "Error: PROJECT is not set. Use --project or configure gcloud." >&2
  exit 2
fi

if [ ! -f "$ENVFILE" ]; then
  echo "Error: $ENVFILE not found." >&2
  exit 2
fi

secrets=(
  "GEMINI_API_KEY"
  "GOOGLE_CLIENT_ID"
  "GOOGLE_CLIENT_SECRET"
  "NEXTAUTH_SECRET"
  "NEXTAUTH_URL"
)

for name in "${secrets[@]}"; do
  raw=$(grep -m1 -E "^${name}=" "$ENVFILE" || true)
  if [ -z "$raw" ]; then
    echo "Skipping ${name}: not found in $ENVFILE"
    continue
  fi

  value="${raw#${name}=}"
  # Strip surrounding quotes if present
  value="${value%\"}"
  value="${value#\"}"

  if [[ -z "$value" || "$value" =~ ^(REPLACE_WITH|your-|changeme) ]]; then
    echo "Skipping ${name}: placeholder or empty value"
    continue
  fi

  echo "==> Uploading secret: ${name}"

  if ! gcloud secrets describe "${name}" --project="$PROJECT" >/dev/null 2>&1; then
    gcloud secrets create "${name}" --replication-policy="automatic" --project="$PROJECT"
  fi

  printf '%s' "$value" | gcloud secrets versions add "${name}" --data-file=- --project="$PROJECT"
  echo "  -> Done: ${name}"
done

echo ""
echo "Done. Verify with: gcloud secrets list --project=$PROJECT"
