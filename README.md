# Mermaid Cloud Viz

[![Build & Deploy](https://github.com/AndrewMichael2020/mermaid-visualize/actions/workflows/main.yml/badge.svg)](https://github.com/AndrewMichael2020/mermaid-visualize/actions/workflows/main.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Node.js 20](https://img.shields.io/badge/node-20-brightgreen?logo=node.js&logoColor=white)](https://nodejs.org)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)

[![Deployed on Cloud Run](https://img.shields.io/badge/Cloud_Run-deployed-4285F4?logo=google-cloud&logoColor=white)](https://mermaid-vizualizer-536375482650.us-central1.run.app)
[![GCP Secret Manager](https://img.shields.io/badge/Secrets-GCP_Secret_Manager-4285F4?logo=google-cloud&logoColor=white)](https://cloud.google.com/secret-manager)
[![Docker](https://img.shields.io/badge/Docker-containerised-2496ED?logo=docker&logoColor=white)](./Dockerfile)
[![AI Powered](https://img.shields.io/badge/AI-Google_Gemini-8E44FF?logo=google&logoColor=white)](https://ai.google.dev)
[![Genkit](https://img.shields.io/badge/Genkit-AI_framework-FF6F00?logo=firebase&logoColor=white)](https://firebase.google.com/docs/genkit)

[![Tests](https://img.shields.io/badge/tests-32_passing-brightgreen?logo=jest&logoColor=white)](./jest.config.js)
[![Coverage](https://img.shields.io/badge/coverage-76%25-yellow?logo=jest&logoColor=white)](./coverage)
[![Live AI Tests](https://github.com/AndrewMichael2020/mermaid-visualize/actions/workflows/live-api-tests.yml/badge.svg)](https://github.com/AndrewMichael2020/mermaid-visualize/actions/workflows/live-api-tests.yml)
[![0 Vulnerabilities](https://img.shields.io/badge/vulnerabilities-0-brightgreen?logo=snyk&logoColor=white)](./package.json)
[![ESLint](https://img.shields.io/badge/ESLint-passing-4B32C3?logo=eslint&logoColor=white)](./eslint.config.cjs)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-components-000000?logo=radixui&logoColor=white)](https://ui.shadcn.com)

**Turn plain English into professional diagrams — instantly.**

Mermaid Cloud Viz is an AI-powered diagramming tool that lets anyone create flowcharts, sequence diagrams, timelines, and more by simply describing what they need. No design skills. No drag-and-drop frustration. Just results.

🌐 **[Try it live →](https://mermaid-vizualizer-536375482650.us-central1.run.app)**

---

## Why Mermaid Cloud Viz?

Most diagramming tools require you to learn their interface before you can create anything useful. Mermaid Cloud Viz flips that — you describe the outcome, and the AI builds the diagram. It's the difference between spending 30 minutes on layout versus 30 seconds on a description.

**Who uses it:**
- 📋 **Product managers** — document workflows and user journeys fast
- 👩‍💻 **Engineers** — generate architecture and system flow diagrams from specs
- 📊 **Business analysts** — turn process descriptions into clear visuals for stakeholders
- 🎓 **Anyone** who needs a diagram and doesn't want to become a diagramming expert first

---

## Features

| | |
|---|---|
| 🤖 **AI Generation** | Describe your diagram in plain language — Gemini AI writes the code |
| ✨ **AI Enhancement** | Ask AI to improve, extend, or restructure any existing diagram |
| 👁️ **Live Preview** | See your diagram update in real time as you type |
| 🌙 **Light / Dark themes** | Switch rendering themes for presentations or docs |
| 📥 **SVG Export** | Download production-quality vector files |
| 📚 **Gallery** | Start from curated templates and customize |
| 🔐 **Google Sign-In** | Secure authentication, no password required |

---

## How It Works

1. **Describe** — type what you need ("flowchart for a software release process")
2. **Generate** — AI produces valid [Mermaid](https://mermaid.js.org) diagram code
3. **Refine** — edit the code or ask AI to enhance it further
4. **Export** — download as SVG, ready for slides, docs, or wikis

---

## For Developers

### Local Setup

```bash
git clone https://github.com/AndrewMichael2020/mermaid-visualize.git
cd mermaid-visualize
npm install
```

Create `.env.local`:
```env
GEMINI_API_KEY=your-gemini-api-key
GOOGLE_CLIENT_ID=your-oauth2-client-id
GOOGLE_CLIENT_SECRET=your-oauth2-client-secret
NEXTAUTH_SECRET=any-random-32-char-string
NEXTAUTH_URL=http://localhost:9005
```

```bash
npm run dev        # → http://localhost:9005
npm run genkit:dev # AI server (separate terminal)
```

### Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15, React 19 |
| AI | Google Gemini 2.5 Flash (via Genkit) |
| Auth | next-auth + Google OAuth2 |
| Logging | Google Cloud Datastore |
| Metrics | prom-client + Cloud Monitoring |
| Styling | Tailwind CSS, shadcn/ui |
| Deployment | Google Cloud Run (min 0, max 1 instance) |
| CI/CD | GitHub Actions |

### Deploy Your Own

Full deployment guide — GCP setup, IAM roles, Secret Manager, CI/CD:  
👉 **[docs/deployment.md](./docs/deployment.md)**

---

## Contributing

1. Fork → feature branch → PR
2. Run `npm test` and `npm run typecheck` before submitting

---

## License

MIT — see [LICENSE](./LICENSE)

---

## Acknowledgements

- [Mermaid.js](https://mermaid.js.org) — diagram rendering engine
- [Google Gemini](https://ai.google.dev) — AI model
- [Next.js](https://nextjs.org) · [Tailwind CSS](https://tailwindcss.com) · [shadcn/ui](https://ui.shadcn.com)
