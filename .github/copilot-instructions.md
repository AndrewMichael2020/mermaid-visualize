cat > /workspaces/mermaid-exporter/.github/copilot-instructions.md << 'EOF'
# GitHub Copilot Instructions for mermaid-exporter

## Workflow & Communication
- Do not offer options unless necessary; proceed with best practices for a prototype (!) DO NOT OVERWHEALM WITH OPTIONS.
- Limit output and instruct step by step
- Work collaboratively: suggest CLI commands, check outputs, proceed with next steps together

## Project Setup
- Default deployment: Cloud Run via GitHub Actions
- Runtime: Node.js 20
- Infrastructure: GCP (project: studio-1697788595-a34f5)

## CI/CD Pipeline
- Lint, typecheck, and test on all PRs and pushes
- Auto-deploy to Cloud Run on pushes to main or manual workflow dispatch
- Region: us-central1

## Required Secrets
- GCP_SA_KEY
- NEXT_PUBLIC_FIREBASE_* (API key, project ID, app ID, auth domain, storage bucket, messaging sender ID)
- GEMINI_API_KEY
EOF
