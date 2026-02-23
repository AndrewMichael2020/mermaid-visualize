#!/usr/bin/env bash
set -euo pipefail

# Change these if needed
# Usage: ./upload-secrets.sh --project <GCP_PROJECT_ID> or export PROJECT and run.
# Provide PROJECT via an environment variable, or fall back to gcloud config if available.
while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --project|-p)
      PROJECT="$2"; shift 2;;
    --env-file)
      ENVFILE="$2"; shift 2;;
    --help|-h)
      echo "Usage: $0 [--project <GCP_PROJECT_ID>] [--env-file <path>]"; exit 0;;
    *)
      echo "Unknown argument: $1"; echo "Usage: $0 [--project <GCP_PROJECT_ID>] [--env-file <path>]"; exit 1;;
  esac
done

PROJECT="${PROJECT:-$(gcloud config get-value project 2>/dev/null || true)}"
BACKEND="mermaid-exporter"
ENVFILE="${ENVFILE:-.env.local}"

secrets=(
  "GEMINI_API_KEY"
  "NEXT_PUBLIC_FIREBASE_API_KEY"
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID"
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
  "NEXT_PUBLIC_FIREBASE_APP_ID"
)

if [ ! -f "$ENVFILE" ]; then
  echo "Error: $ENVFILE not found. Place it in the current working directory." >&2
  exit 2
fi

for name in "${secrets[@]}"; do
  # Extract first matching line value (supports values without quotes)
  raw=$(grep -m1 -E "^${name}=" "$ENVFILE" || true)
  if [ -z "$raw" ]; then
    echo "Skipping ${name}: not found in $ENVFILE"
    continue
  fi

  # Remove NAME= prefix
  value="${raw#${name}=}"

  # Do not upload placeholder values. If you used .env.example or placeholders, skip.
  if [[ "$value" =~ REPLACE_WITH_ || "$value" =~ REPLACE_WITH || -z "$value" ]]; then
    echo "Skipping ${name}: contains placeholder or empty value (check .env.local)"
    continue
  fi

  # Avoid printing secret values; we only print the secret name to indicate progress.
  echo "==> Creating/Updating secret: ${name}"

  # Ensure we have the project (if not provided by env or gcloud config, abort)
  if [ -z "$PROJECT" ]; then
    echo "Error: PROJECT is not set. Provide it via the PROJECT environment variable or configure it with gcloud." >&2
    echo "Example: export PROJECT='your-gcp-project-id'" >&2
    exit 2
  fi

  # Create the secret if it doesn't exist
  if ! gcloud secrets describe "${name}" --project="$PROJECT" >/dev/null 2>&1; then
    gcloud secrets create "${name}" \
      --replication-policy="automatic" \
      --project="$PROJECT"
  fi

  # Add the secret version (read via stdin)
  printf '%s' "$value" | gcloud secrets versions add "${name}" --data-file=- --project="$PROJECT"

  # Grant App Hosting backend access so build/runtime can read the secret
  # (This uses the firebase CLI helper you've used previously)
  firebase apphosting:secrets:grantaccess "${name}" --backend="$BACKEND" --project="$PROJECT" || true

  echo "  -> Uploaded and granted access for ${name}"
done

echo "Done. Verify with: gcloud secrets list --project=$PROJECT"