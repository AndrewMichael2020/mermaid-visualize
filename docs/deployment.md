# Deployment Guide: Firebase App to Cloud Run

This document provides step-by-step instructions to deploy the Mermaid Cloud Viz application to Cloud Run using Cloud Build. This guide ensures reproducibility from scratch.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [GCP Project Setup](#gcp-project-setup)
3. [Service Account Configuration](#service-account-configuration)
4. [Secret Manager Setup](#secret-manager-setup)
5. [Artifact Registry Setup](#artifact-registry-setup)
6. [Local Deployment with Cloud Build](#local-deployment-with-cloud-build)
7. [GitHub Actions Deployment](#github-actions-deployment)
8. [Firebase Hosting Integration](#firebase-hosting-integration)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure you have:

- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) installed and authenticated
- [Firebase CLI](https://firebase.google.com/docs/cli) installed (`npm install -g firebase-tools`)
- A GCP project with billing enabled
- Node.js 20+ and npm installed locally
- Git installed

---

## GCP Project Setup

### 1. Set your project ID

```bash
export PROJECT_ID="your-gcp-project-id"
gcloud config set project $PROJECT_ID
```

### 2. Enable required APIs

```bash
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  secretmanager.googleapis.com \
  containerregistry.googleapis.com \
  artifactregistry.googleapis.com
```

### 3. Set default region

```bash
export REGION="us-central1"
gcloud config set run/region $REGION
```

---

## Service Account Configuration

### 1. Create a service account for CI/CD

```bash
SA_NAME="cloud-run-deployer"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud iam service-accounts create $SA_NAME \
  --display-name="Cloud Run Deployer"
```

### 2. Grant required IAM roles

```bash
# Cloud Run Admin - to deploy services
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/run.admin"

# Cloud Build Editor - to submit builds
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/cloudbuild.builds.editor"

# Service Account User - to act as the Cloud Run service account
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/iam.serviceAccountUser"

# Secret Manager Secret Accessor - to access secrets
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor"

# Storage Admin - to push images to Container Registry
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/storage.admin"
```

### 3. Create and download service account key

```bash
gcloud iam service-accounts keys create ./sa-key.json \
  --iam-account=$SA_EMAIL

# IMPORTANT: This key is sensitive. Do not commit to version control.
# Add sa-key.json to .gitignore
```

### 4. Grant Cloud Build service account permissions

The Cloud Build service account also needs access to deploy and access secrets:

```bash
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
CLOUDBUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

# Grant Cloud Build service account necessary roles
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${CLOUDBUILD_SA}" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${CLOUDBUILD_SA}" \
  --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${CLOUDBUILD_SA}" \
  --role="roles/secretmanager.secretAccessor"
```

---

## Secret Manager Setup

### 1. Create required secrets

The application requires the following secrets in Secret Manager:

| Secret Name | Description |
|-------------|-------------|
| `GEMINI_API_KEY` | Google AI (Gemini) API key |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase project API key |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase app ID |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |

### 2. Create secrets using gcloud

```bash
# Example for each secret:
echo -n "your-api-key-value" | gcloud secrets create GEMINI_API_KEY \
  --data-file=- \
  --replication-policy="automatic"

# Repeat for all secrets...
```

### 3. Using the helper script

Alternatively, use the provided script to upload secrets from a `.env.local` file:

```bash
# Create .env.local with your values (copy from .env.example if available)
# Then run:
./scripts/upload-secrets.sh --project $PROJECT_ID --env-file .env.local
```

### 4. Grant Cloud Run service account access to secrets

```bash
# Get the default compute service account
COMPUTE_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

# Grant access to each secret
for SECRET in GEMINI_API_KEY NEXT_PUBLIC_FIREBASE_API_KEY NEXT_PUBLIC_FIREBASE_PROJECT_ID \
  NEXT_PUBLIC_FIREBASE_APP_ID NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN \
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID; do
  gcloud secrets add-iam-policy-binding $SECRET \
    --member="serviceAccount:${COMPUTE_SA}" \
    --role="roles/secretmanager.secretAccessor"
done
```

---

## Artifact Registry Setup

### 1. Create an Artifact Registry repository (optional, for Artifact Registry instead of GCR)

```bash
gcloud artifacts repositories create mermaid-exporter \
  --repository-format=docker \
  --location=$REGION \
  --description="Docker images for Mermaid Exporter"
```

### 2. Configure Docker authentication

```bash
gcloud auth configure-docker
# Or for Artifact Registry:
gcloud auth configure-docker ${REGION}-docker.pkg.dev
```

---

## Local Deployment with Cloud Build

### 1. Build and deploy using cloudbuild.yaml

```bash
# Set variables
export SERVICE_NAME="mermaid-exporter"
export REGION="us-central1"

# Submit build and deploy
gcloud builds submit \
  --config=cloudbuild.yaml \
  --substitutions=_SERVICE_NAME=$SERVICE_NAME,_REGION=$REGION
```

### 2. Manual build and deploy (alternative)

```bash
# Build the image
IMAGE="gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest"
gcloud builds submit --tag $IMAGE

# Deploy to Cloud Run
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --update-secrets "GEMINI_API_KEY=GEMINI_API_KEY:latest" \
  --update-secrets "NEXT_PUBLIC_FIREBASE_API_KEY=NEXT_PUBLIC_FIREBASE_API_KEY:latest" \
  --update-secrets "NEXT_PUBLIC_FIREBASE_PROJECT_ID=NEXT_PUBLIC_FIREBASE_PROJECT_ID:latest" \
  --update-secrets "NEXT_PUBLIC_FIREBASE_APP_ID=NEXT_PUBLIC_FIREBASE_APP_ID:latest" \
  --update-secrets "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:latest" \
  --update-secrets "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:latest" \
  --update-secrets "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:latest"
```

### 3. Verify deployment

```bash
# Get the service URL
URL=$(gcloud run services describe $SERVICE_NAME \
  --region $REGION \
  --format='value(status.url)')

echo "Service deployed at: $URL"

# Test the endpoint
curl -s $URL | head -20
```

---

## GitHub Actions Deployment

### 1. Configure GitHub Secrets

Add the following secrets to your GitHub repository (Settings → Secrets and variables → Actions):

| Secret Name | Value |
|-------------|-------|
| `GCP_PROJECT` | Your GCP project ID |
| `GCP_SA_KEY` | Contents of `sa-key.json` (the service account key JSON) |
| `CLOUD_RUN_SERVICE` | Service name (e.g., `mermaid-exporter`) |
| `CLOUD_RUN_REGION` | Region (e.g., `us-central1`) |

### 2. Trigger deployment

The workflow automatically triggers on:
- Push to `main` branch
- Manual trigger via workflow dispatch

To manually trigger:
1. Go to Actions tab in GitHub
2. Select "Build and Deploy to Cloud Run"
3. Click "Run workflow"

### 3. Monitor deployment

Check the Actions tab for build logs and deployment status.

---

## Firebase Hosting Integration

### 1. Configure firebase.json

The `firebase.json` file includes rewrite rules to route traffic to Cloud Run:

```json
{
  "hosting": {
    "rewrites": [
      {
        "source": "/api/**",
        "run": {
          "serviceId": "mermaid-exporter",
          "region": "us-central1"
        }
      },
      {
        "source": "**",
        "run": {
          "serviceId": "mermaid-exporter",
          "region": "us-central1"
        }
      }
    ]
  }
}
```

### 2. Deploy Firebase Hosting

```bash
firebase deploy --only hosting
```

### 3. Verify Firebase to Cloud Run routing

After deploying Firebase Hosting, your Firebase URL will route all traffic to the Cloud Run service.

---

## Troubleshooting

### Common Issues

#### 1. "Secret not found" error

**Cause:** Secrets not created in Secret Manager.

**Solution:**
```bash
# Verify secrets exist
gcloud secrets list --project=$PROJECT_ID

# Create missing secrets
echo -n "value" | gcloud secrets create SECRET_NAME --data-file=-
```

#### 2. "Permission denied" on secrets

**Cause:** Service account lacks Secret Manager access.

**Solution:**
```bash
# Grant access
gcloud secrets add-iam-policy-binding SECRET_NAME \
  --member="serviceAccount:${COMPUTE_SA}" \
  --role="roles/secretmanager.secretAccessor"
```

#### 3. Build fails with "Cannot pull image"

**Cause:** Docker authentication not configured.

**Solution:**
```bash
gcloud auth configure-docker
```

#### 4. Cloud Run returns 500 errors

**Cause:** Application startup failure, often due to missing environment variables.

**Solution:**
1. Check Cloud Run logs:
   ```bash
   gcloud run services logs read $SERVICE_NAME --region $REGION
   ```
2. Verify all secrets are accessible
3. Check the Dockerfile for correct startup command

#### 5. Firebase Hosting not routing to Cloud Run

**Cause:** Misconfigured rewrite rules or service not deployed.

**Solution:**
1. Verify Cloud Run service is running:
   ```bash
   gcloud run services describe $SERVICE_NAME --region $REGION
   ```
2. Ensure `firebase.json` has correct service ID and region
3. Redeploy Firebase Hosting:
   ```bash
   firebase deploy --only hosting
   ```

### Viewing Logs

```bash
# Cloud Run logs
gcloud run services logs read $SERVICE_NAME --region $REGION --limit 100

# Cloud Build logs (for a specific build)
gcloud builds list --limit 5
gcloud builds log BUILD_ID

# Real-time logs
gcloud run services logs tail $SERVICE_NAME --region $REGION
```

### Rollback to Previous Version

```bash
# List revisions
gcloud run revisions list --service $SERVICE_NAME --region $REGION

# Route traffic to previous revision
gcloud run services update-traffic $SERVICE_NAME \
  --region $REGION \
  --to-revisions=REVISION_NAME=100
```

---

## Security Best Practices

1. **Never commit secrets** - Use Secret Manager and environment variables
2. **Rotate keys regularly** - Update service account keys and API keys periodically
3. **Principle of least privilege** - Grant only necessary IAM roles
4. **Enable audit logging** - Monitor access to sensitive resources
5. **Use Workload Identity Federation** - Consider WIF for GitHub Actions instead of service account keys

---

## Additional Resources

- [Cloud Build Documentation](https://cloud.google.com/build/docs)
- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Secret Manager Documentation](https://cloud.google.com/secret-manager/docs)
- [Firebase Hosting to Cloud Run](https://firebase.google.com/docs/hosting/cloud-run)
