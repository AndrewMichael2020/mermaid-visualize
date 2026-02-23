# Security Policy

## Supported Versions

The following versions of Mermaid Cloud Viz are currently supported with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

As this project is in early development (v0.1.x), we maintain security support for the latest minor version only. We recommend always using the latest version for the best security posture.

## Security Best Practices

This project follows security best practices including:

- **Dependency Management**: Regular dependency audits via `npm audit` in CI/CD pipelines
- **Secret Management**: All sensitive configuration (API keys, Firebase credentials) are managed through environment variables and GitHub Secrets, never committed to source code
- **Authentication**: Application access is secured via Google Authentication
- **Infrastructure**: Deployed on Firebase App Hosting with Cloud Run backend, leveraging Google Cloud's security infrastructure
- **Code Quality**: Automated linting, type checking, and testing on all pull requests

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please report it responsibly.

### How to Report

1. **Do NOT** create a public GitHub issue for security vulnerabilities
2. Email the security concern to the repository maintainers directly
3. Include as much detail as possible:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- **Acknowledgment**: We will acknowledge receipt of your report within 48 hours
- **Assessment**: We will assess the vulnerability and determine its severity within 7 days
- **Updates**: You will receive updates on our progress at least every 7 days
- **Resolution**: We aim to resolve critical vulnerabilities within 30 days
- **Credit**: With your permission, we will credit you in the security advisory

### Vulnerability Disclosure Policy

- We follow coordinated disclosure practices
- We request that you do not publicly disclose the vulnerability until we have had a reasonable opportunity to address it
- We will work with you to understand and resolve the issue quickly

## Security Updates

Security updates are released as patch versions. Subscribe to repository releases to be notified of security patches.

## Dependencies

This project uses the following key dependencies that handle sensitive operations:

- **Firebase SDK**: Authentication and cloud services
- **Genkit AI**: AI-powered features with Google's Gemini API
- **Next.js**: Server-side rendering and API routes

Tell them where to go, how often they can expect to get an update on a
reported vulnerability, what to expect if the vulnerability is accepted or
declined, etc.

## Handling Secrets

If you find that secrets or API keys were committed to the repository (including in `.env.local` or build artifacts under `.next/`), please do the following immediately:

1. Rotate the affected secrets (rotate API keys in the provider console such as Google Cloud Console or your API provider).
2. Remove the secret and any committed build artifacts that contain them from the repository's history. You can use tools like `git filter-repo` or the BFG Repo-Cleaner to scrub the history.
3. Ensure `.env.local` and `.next` are in `.gitignore` and not committed going forward.
4. Use Secret Manager (e.g., Google Secret Manager) and configure deployment-only mappings (e.g., Cloud Run `--update-secrets`) so secrets are not embedded at build-time.

## Secret rotation & runtime safety

- Prefer mapping secrets to `:latest` in Cloud Run (`projects/PROJECT_NUMBER/secrets/NAME:latest`) so new revisions automatically use the most recent enabled secret version. Avoid hard-pinning to numeric secret versions in production unless you manage them deliberately.
- When rotating a key, add a new secret version and keep it enabled. After upload, update traffic to the latest revision or redeploy so the new version is used; do not immediately disable the old version until the new revision is verified.
- Grant the Cloud Run runtime revision service account `roles/secretmanager.secretAccessor` on the secrets it needs. If a revision cannot access a secret version (or the referenced version is disabled) the instance startup will abort and log an error.

## Key rotation guidance

- When rotating keys or updating secrets, add a new secret version and keep it enabled. After upload, update Cloud Run traffic to the latest revision or redeploy so the new version is used; consider keeping prior versions enabled until verification completes.
- Grant the Cloud Run runtime revision service account `roles/secretmanager.secretAccessor` on the secrets it needs.

This guidance helps ensure rotations are seamless and reduces the chance of runtime configuration issues.
