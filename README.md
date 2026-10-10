# Namma-Civic-Agent

Bringing clarity to public services for everyone.

Namma-Civic-Agent is a chat-based platform that helps people find answers about government schemes, public services, and civic processes. Instead of digging through government websites, you can just ask questions in plain English and get clear answers.

The civic assistant is focused specifically on Tamil Nadu, India. TN-Info is used as an independent reference for documented civic-data categories; official state and Union government sources remain the final reference for current rules and procedures.

---

## Overview

---

## What it does

**Chat interface with streaming responses**
Ask questions about Tamil Nadu government schemes, eligibility, public services, or how to apply for benefits. Responses stream in real time using OpenRouter, with TN-Info retrieval for supported civic-data questions.

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

### TN-Info civic data

The chat backend checks Tamil Nadu scheme questions, explicit district lookups, TNEA counselling, district election questions, and city-specific event questions against the GET endpoints documented at [tn-info.in/#api](https://www.tn-info.in/#api). Requests use `https://api.tn-info.in` directly from the server, with a 7-second timeout and a 5-minute Next.js cache. TN-Info documents these endpoints as public and unauthenticated; no TN-Info environment variable or API key is needed.

For matching questions, the retrieved JSON is provided to the existing OpenRouter model as untrusted reference data. The response includes TN-Info attribution, valid source links supplied in the response, and update/retrieval timestamps when available. If TN-Info is unavailable or returns no data, the model still provides cautious Tamil Nadu-specific guidance where possible, clearly notes that current details were not live-verified, and avoids guessing eligibility, amounts, deadlines, contacts, or procedures. For broad scheme-discovery requests without reliable data, it asks what kind of support the user needs rather than listing unverified schemes. Unsupported lookups ask for the missing details or explain the documented limitation. TN-Info is an independent best-effort source, not a government website; verify important details with official sources.

Currently supported documented routes:

* `GET /v1/districts/{id}` for district details
* `GET /v1/districts/{id}/election/2024` for the documented 2024 district election example
* `GET /v1/schemes` for schemes
* `GET /v1/counselling/tnea/rounds` for TNEA counselling rounds
* `GET /v1/events?city={city}` for city-filtered events

When TN-Info does not have a successful result, civic questions use OpenRouter's web-search tool to find current information restricted to Indian Government and National Informatics Centre (`.gov.in`/`.nic.in`) pages. Search queries redact email addresses and phone-like/12-digit numbers. Retrieved pages are used as untrusted model context, and citation links are shown with the response. Web search uses the existing `OPENROUTER_API_KEY` and may incur additional OpenRouter search/model costs.

The integration deliberately does not infer undocumented TN-Info endpoints or election years. For example, election lookups other than 2024 are unsupported by the documented API, but can still be answered from official government web pages if the search returns relevant material.

To test manually, run the app and ask: “Show me information about the Madurai district,” “What are the TNEA counselling rounds?”, “Show me public events in Madurai,” or “Tell me about government schemes available in Tamil Nadu.” TN-Info is tried first for supported categories; if it is unavailable or the question is not covered by a documented endpoint, the assistant searches official government pages and displays the sources it retrieved. Non-civic questions continue through the existing chatbot flow.

### Guided civic workflows

New chats explain the guided process. When a message is recognized as a Tamil Nadu civic request, the assistant returns a structured answer and an ordered 3–7 step checklist. Citizens complete the active step, can ask the assistant for help with that step, and the progress is saved in message metadata so it remains after reloading the chat. Later steps cannot be checked off before earlier ones; reopening an earlier step clears subsequent completion marks. This uses the existing MongoDB message metadata and does not require a Prisma migration.

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
