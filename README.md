# Namma-Civic-Agent

Bringing clarity to public services for everyone.

Namma-Civic-Agent is a chat-based platform that helps people find answers about government schemes, public services, and civic processes. Instead of digging through government websites, you can just ask questions in plain English and get clear answers.

---

## Overview

<img width="729" height="459" alt="Namma-Civic-Agent overview" src="https://github.com/user-attachments/assets/74d21102-951d-4b4f-ad86-f01a32496873" />

---

## What it does

**Chat interface with streaming responses**
Ask questions about government schemes, eligibility, or how to apply for benefits. Responses stream in real-time using OpenRouter. Works for multiple countries including India, USA, UK, Canada, and Australia.

**File uploads**
Upload PDFs or documents related to government schemes, and the system extracts relevant information to help answer your questions.

**Query insights**
Automatically extracts entities (schemes, offices, documents) from your questions and suggests relevant actions. Also classifies queries to better understand what you're looking for.

**Kestra workflows**
Automated workflows that can crawl government portals, extract eligibility rules from PDFs, and generate autocomplete suggestions. These run via webhooks that integrate with the main app.

**Oumi fine-tuning**
Custom dataset with 12 civic Q&A examples covering multiple countries. Can be used to fine-tune a model for better civic-specific responses, though it's optional and the app works fine with models available through OpenRouter.

---

## Tech stack

* **Next.js 16** - React framework
* **MongoDB** - Database (via Prisma)
* **Local guest profile** - Authentication is currently disabled; local users share a guest profile
* **OpenRouter** - AI chat responses (GPT-4o mini through OpenRouter)
* **Kestra** - Workflow automation
* **Oumi** - Model fine-tuning (optional)
* **TailwindCSS + shadcn/ui** - UI components
* **Vercel** - Deployment

---

## Sponsor integrations

### OpenRouter

The AI gateway. Handles streaming chat responses, query classification, entity extraction, and document generation (RTI/FOIA requests, complaint letters, eligibility summaries). The app uses OpenRouter's API and the `openai/gpt-4o-mini` model. Code is in `lib/ai/` and `app/api/ai/`.

### Kestra

Three workflows for automating government data tasks:

* Weekly scheme updates (crawls government portals)
* Eligibility rule extractor (parses PDFs)
* Autocomplete suggestions (matches queries to schemes)

Workflows are in `kestra/workflows/` and integrate via webhook endpoints in `app/api/kestra/webhook/`.

### Oumi

Fine-tuning setup for a custom civic model. Dataset has 12 examples covering India, USA, UK, Canada, and Australia. Config is in `oumi/config.yaml`. The app can use a fine-tuned model if available, but falls back to OpenRouter if not.

### Cline

Used during development for code generation, refactoring, and multi-step feature work. `.clinerules` file contains project-specific guidelines. There's a sample workflow script at `scripts/cline-workflow.sh`.

### Vercel

Deployed on Vercel with edge functions for low-latency responses. GitHub integration handles automatic deployments.

---

## Getting started

### Prerequisites

* Node.js 18+
* MongoDB (local or Atlas)
* OpenRouter API key

### Setup

1. Install dependencies:

```bash
npm install
```

2. Set up environment variables:

```bash
cp .env.example .env
# Edit .env with your keys
```

Required variables:

* `OPENROUTER_API_KEY` - OpenRouter API key
* `DATABASE_URL` - MongoDB connection string
* `KESTRA_URL` - Kestra instance URL (optional)
* `KESTRA_AUTH` - Base64 encoded Kestra credentials (optional)

3. Set up the database:

```bash
npx prisma generate
npx prisma db push
```

4. Run the dev server:

```bash
npm run dev
```

5. (Optional) Set up Kestra:

* Install Kestra: [https://kestra.io/docs/getting-started](https://kestra.io/docs/getting-started)
* Deploy workflows from `kestra/workflows/`
* Configure CORS using `kestra/application.yml`

6. (Optional) Fine-tune with Oumi:

```bash
pip install oumi[gpu]
oumi train -c oumi/config.yaml
```

---

## Project structure

* `app/` - Next.js app router pages and API routes
* `components/` - React components (UI, chat, file upload)
* `lib/` - Core logic (AI services, database, file extraction)
* `hooks/` - React hooks for chat operations
* `prisma/` - Database schema
* `kestra/workflows/` - Kestra workflow definitions
* `oumi/` - Fine-tuning config and dataset

---

## Development notes

The app uses streaming responses for chat, which provides a better user experience. File uploads are stored in MongoDB (base64 encoded for small files). The Kestra workflows are separate and can be deployed independently — they communicate with the main app via webhooks.

---

## License

MIT
