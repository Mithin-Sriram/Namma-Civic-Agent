# Namma Civic Agent

An AI-powered civic assistant that helps citizens navigate government services, schemes, and public processes through natural language conversations.

---

## Overview

Namma Civic Agent is a chat-based platform that simplifies access to government information. Ask questions in plain English (or your preferred language) about schemes, eligibility, documents needed, and application processes — get clear, sourced answers instantly.

---

## Features

- **Conversational Interface** — Chat naturally about civic topics; supports multiple languages
- **Scheme Discovery** — Find relevant government schemes based on your situation
- **Eligibility Checking** — Understand if you qualify for benefits before applying
- **Document Guidance** — Know exactly what documents you need and where to get them
- **Step-by-Step Process Help** — Clear instructions for applications, complaints, RTI/FOIA requests
- **File Upload & Analysis** — Upload policy PDFs or documents; get key information extracted
- **Multi-Country Support** — Works for India, USA, UK, Canada, Australia, and more

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Database | MongoDB (via Prisma ORM) |
| Authentication | Clerk |
| AI/ML | OpenAI (GPT-4o / GPT-3.5-turbo) |
| Workflow Automation | Kestra |
| Fine-Tuning (Optional) | Oumi |
| Styling | TailwindCSS + shadcn/ui |
| Deployment | Vercel |

---

## Project Structure

```
├── app/                    # Next.js pages & API routes
│   ├── (app)/             # Authenticated app routes (chat, settings)
│   └── api/               # API endpoints (AI, files, Kestra webhooks)
├── components/            # React components
│   ├── ui/                # shadcn/ui primitives
│   ├── app/               # Chat, sidebar, file upload components
│   ├── home/              # Landing page sections
│   └── global/            # Theme, providers
├── lib/                   # Core business logic
│   ├── ai/                # OpenAI integration, prompts, classification
│   ├── db.ts              # Database client
│   ├── files/             # File extraction utilities
│   └── stores/            # Zustand state management
├── hooks/                 # Custom React hooks
├── prisma/                # Database schema
├── kestra/workflows/      # Workflow definitions (YAML)
├── oumi/                  # Fine-tuning config & dataset
└── config/                # App configuration
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or MongoDB Atlas)
- OpenAI API key
- Clerk account for authentication

### Installation

```bash
# Clone the repository
git clone https://github.com/Yasar-17/Namma-Civic-Agent.git
cd Namma-Civic-Agent

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your actual keys
```

### Required Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | MongoDB connection string |
| `OPENAI_API_KEY` | OpenAI API key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk public key |
| `NEXT_PUBLIC_APP_URL` | Your app URL (e.g., `http://localhost:3000`) |

Optional:
| Variable | Description |
|----------|-------------|
| `KESTRA_URL` | Kestra instance URL |
| `KESTRA_AUTH` | Base64 encoded Kestra credentials |
| `OUMI_ENABLED` | Enable fine-tuned model (`true`/`false`) |
| `NEXT_PUBLIC_CLARITY_PROJECT_ID` | Microsoft Clarity analytics |

### Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Optional: Kestra Workflow Automation

Deploy automated workflows for:
- **Weekly Scheme Updates** — Crawl government portals for new/updated schemes
- **Eligibility Rule Extraction** — Parse PDFs to extract structured eligibility criteria
- **Autocomplete Suggestions** — Match user queries to relevant schemes

```bash
# Install Kestra (Docker)
docker run -d --name kestra -p 8080:8080 kestra/kestra:latest

# Deploy workflows from kestra/workflows/ via Kestra UI or API
```

Configure webhooks in `.env`:
```
KESTRA_URL=http://localhost:8080
KESTRA_AUTH=<base64_encoded_credentials>
```

---

## Optional: Fine-Tuning with Oumi

```bash
# Install Oumi
pip install oumi[gpu]

# Train custom model
oumi train -c oumi/config.yaml
```

Dataset (`oumi/dataset.json`) includes 12 civic Q&A examples across 5 countries. Set `OUMI_ENABLED=true` and provide `OUMI_MODEL_URL` / `OUMI_API_KEY` to use the fine-tuned model.

---

## Development Commands

```bash
# Lint code
npm run lint

# Build for production
npm run build

# Start production server
npm run start
```

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

## Acknowledgments

- Built for the GDG Hackathon
- Inspired by the need to make government services accessible to everyone