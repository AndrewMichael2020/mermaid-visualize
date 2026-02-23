# CI/CD Strategy — Cloud Run Deployment

## Overview

This project uses **GitHub Actions** to lint, type-check, test, and deploy to **Google Cloud Run**.

## Pipeline

```
Push to main ──► CI (lint / typecheck / test) ──► Docker build ──► Push to GCR ──► Deploy to Cloud Run ──► Health check
```

PRs run the CI job only. Deploys happen on push to `main` or manual `workflow_dispatch`.

## Workflow: `.github/workflows/main.yml`

| Job | Trigger | Steps |
|-----|---------|-------|
| `ci` | all pushes + PRs | ESLint, TypeScript typecheck, Jest tests + coverage |
| `deploy` | push to `main` + manual dispatch | Auth to GCP, Docker build & push to GCR, deploy to Cloud Run, health check |

## Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `GCP_SA_KEY` | Full service account JSON key |
| `GCP_PROJECT` | GCP project ID |
| `CLOUD_RUN_SERVICE` | Cloud Run service name (e.g. `mermaid-vizualizer`) |
| `CLOUD_RUN_REGION` | Region (e.g. `us-central1`) |
| `GEMINI_API_KEY` | Gemini API key (also in Secret Manager) |
| `GOOGLE_CLIENT_ID` | OAuth2 client ID |
| `GOOGLE_CLIENT_SECRET` | OAuth2 client secret |
| `NEXTAUTH_SECRET` | NextAuth secret |
| `NEXTAUTH_URL` | Public URL of the deployed service |

Set with `gh secret set <NAME> --body "<value>"`.

## GCP Setup

```bash
PROJECT=your-project-id
SA_NAME=github-actions-deployer
SA_EMAIL="${SA_NAME}@${PROJECT}.iam.gserviceaccount.com"

# Enable APIs
gcloud services enable run.googleapis.com containerregistry.googleapis.com secretmanager.googleapis.com --project="$PROJECT"

# Create service account
gcloud iam service-accounts create "$SA_NAME" --project="$PROJECT" --display-name="GitHub Actions Deployer"

# Grant roles
for role in roles/run.admin roles/iam.serviceAccountUser roles/storage.admin roles/secretmanager.secretAccessor; do
  gcloud projects add-iam-policy-binding "$PROJECT" --member="serviceAccount:${SA_EMAIL}" --role="$role" --condition=None
done

# Create key and upload to GitHub
gcloud iam service-accounts keys create /tmp/sa.json --iam-account="$SA_EMAIL" --project="$PROJECT"
gh secret set GCP_SA_KEY --repo "OWNER/REPO" --body "$(cat /tmp/sa.json)"
rm -f /tmp/sa.json
```

## Runtime Secrets (Secret Manager)

Use `scripts/upload-secrets.sh` to bulk-upload from `.env.local`:

```bash
./scripts/upload-secrets.sh --project "$PROJECT" --env-file .env.local
```

The Cloud Run runtime service account needs `roles/secretmanager.secretAccessor` on each secret.

## Verification

```bash
SERVICE_URL=$(gcloud run services describe "$SERVICE" --region="$REGION" --format='value(status.url)')
curl -I "$SERVICE_URL"
gcloud run services logs read "$SERVICE" --region="$REGION" --limit=50
```

## Cloud Run Configuration

| Setting | Value |
|---------|-------|
| Port | 8080 |
| Memory | 512Mi |
| CPU | 1 |
| Min instances | 0 (scale to zero) |
| Max instances | 1 |
| Auth | Public (`--allow-unauthenticated`) |
