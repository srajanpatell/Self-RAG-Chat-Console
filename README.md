# Next + Nest + FastAPI Self-RAG (Ollama Local LLM)

## Overview
This project is a full-stack Self-RAG application with:
- Frontend: Next.js (`apps/web`)
- Backend gateway: NestJS (`apps/api`)
- Chatbot/retrieval service: FastAPI (`apps/chatbot`)
- Database: PostgreSQL + pgvector
- LLM provider: Local Ollama model (`llama3.2:3b`)
- Retrieval: Hybrid (PostgreSQL full-text + dense similarity fusion)

## Architecture
- Web UI calls Nest API.
- Nest forwards chat/ingestion requests to FastAPI.
- FastAPI handles:
  - document ingestion
  - chunking + embedding
  - hybrid retrieval
  - Self-RAG loop (`retrieve -> draft -> self-check -> optional re-retrieve -> final answer`)
- PostgreSQL stores documents/chunks and vector data.
- Ollama serves local LLM inference.

## Repository Structure
- `apps/web` - Next.js frontend
- `apps/api` - NestJS backend gateway
- `apps/chatbot` - FastAPI RAG service
- `docker-compose.yml` - container orchestration
- `.env` / `.env.example` - runtime config

## Prerequisites
Choose one approach:

### Option A: Local process mode (recommended for development)
- Node.js 20+
- Python 3.8+
- pnpm (via `corepack`)
- PostgreSQL with pgvector (or your existing running DB)
- Ollama installed and running

### Option B: Docker Compose mode
- Docker + Docker Compose

## Environment Configuration
Create `.env` from `.env.example` and set values as needed.

Current important variables:
- `POSTGRES_DB=rag_app`
- `POSTGRES_USER=postgres`
- `POSTGRES_PASSWORD=postgres`
- `POSTGRES_PORT=5432`
- `WEB_PORT=3000`
- `API_PORT=3001`
- `CHATBOT_PORT=8000`
- `NEXT_PUBLIC_API_BASE_URL=http://localhost:3001`
- `CHATBOT_BASE_URL=http://chatbot:8000`
- `OLLAMA_BASE_URL=http://127.0.0.1:11434` (local mode)
- `OLLAMA_MODEL=llama3.2:3b`
- `EMBEDDING_DIM=384`

## Install Dependencies
### Web
```bash
cd /home/developer/Desktop/Codex/apps/web
corepack pnpm install
```

### API
```bash
cd /home/developer/Desktop/Codex/apps/api
corepack pnpm install
```

### Chatbot
```bash
cd /home/developer/Desktop/Codex/apps/chatbot
python3 -m pip install -r requirements.txt
```

## Local Development Run (3 servers)
Run these in separate terminals.

### 1) FastAPI chatbot
```bash
cd /home/developer/Desktop/Codex/apps/chatbot
set -a; source /home/developer/Desktop/Codex/.env; set +a
export DATABASE_URL=postgresql+asyncpg://postgres@127.0.0.1:55432/rag_app
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 2) NestJS backend
```bash
cd /home/developer/Desktop/Codex/apps/api
export CHATBOT_BASE_URL=http://127.0.0.1:8000
export PORT=3001
corepack pnpm run start:dev
```

### 3) Next.js frontend
```bash
cd /home/developer/Desktop/Codex/apps/web
export NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:3001
corepack pnpm run dev
```

Open: `http://localhost:3000`

## Ollama Setup
Start Ollama service (if not already running), then pull model:
```bash
ollama pull llama3.2:3b
```

Quick checks:
```bash
curl -sS http://127.0.0.1:11434/api/version
curl -sS http://127.0.0.1:11434/api/tags
```

## PostgreSQL Setup Notes
The chatbot expects PostgreSQL and the `vector` extension.

Example extension enable:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

The FastAPI startup also attempts extension/table/index setup.

## Docker Compose Run
```bash
cd /home/developer/Desktop/Codex
docker compose up --build
```

Services:
- Web: `http://localhost:3000`
- API: `http://localhost:3001`
- Chatbot: `http://localhost:8000`
- Ollama: `http://localhost:11434`
- Postgres: `localhost:5432`

## API Endpoints
### Nest API (`:3001`)
- `POST /chat`
- `POST /ingest/text`
- `POST /ingest/file`

### FastAPI (`:8000`)
- `GET /health`
- `POST /chat`
- `POST /ingest/text`
- `POST /ingest/file`

## Testing
All test suites added in this project:
- Python (`pytest`): chatbot endpoint/unit and retrieval tests
- JavaScript (`jest`): NestJS service/controller tests
- JavaScript (`jest`): Next.js page smoke tests

### Run all from project root
```bash
cd /home/developer/Desktop/Codex
python3 -m pip install -r apps/chatbot/requirements-test.txt
npm run test:py
npm run test:api
npm run test:web
```

### Python (FastAPI / chatbot)
```bash
python3 -m pip install -r /home/developer/Desktop/Codex/apps/chatbot/requirements-test.txt
python3 -m pytest /home/developer/Desktop/Codex/apps/chatbot/tests -vv
```
Coverage includes:
- `tests/test_main.py`: `health`, `ingest_text`, `ingest_file`, `chat` no-context and with-context flows
- `tests/test_retrieval.py`: chunking logic and hybrid score fusion

### JavaScript (NestJS API)
```bash
cd /home/developer/Desktop/Codex/apps/api
corepack pnpm install
corepack pnpm run test
```
Coverage includes:
- `test/chat.service.spec.ts`
- `test/ingest.service.spec.ts`
- `test/chat.controller.spec.ts`
- `test/ingest.controller.spec.ts`

### JavaScript (Next.js frontend)
```bash
cd /home/developer/Desktop/Codex/apps/web
corepack pnpm install
corepack pnpm run test
```
Coverage includes:
- `__tests__/page.test.tsx` (UI smoke tests for key sections and initial empty state)

## Example Workflow
### 1) Ingest text
```bash
curl -X POST http://127.0.0.1:3001/ingest/text \
  -H 'Content-Type: application/json' \
  -d '{"title":"RAG Notes","text":"Hybrid retrieval combines sparse and dense search. Self-RAG can retrieve again before final response."}'
```

### 2) Ask question
```bash
curl -X POST http://127.0.0.1:3001/chat \
  -H 'Content-Type: application/json' \
  -d '{"query":"How does this system retrieve and validate answers?"}'
```

### 3) Ingest file
```bash
curl -X POST http://127.0.0.1:3001/ingest/file \
  -F 'file=@/absolute/path/to/document.pdf'
```

## Troubleshooting
### Chat returns 500 with model error
- Cause: Ollama model not downloaded.
- Fix:
```bash
ollama pull llama3.2:3b
```

### Chat returns no context
- Ensure at least one document is ingested.
- Confirm DB has records in `documents` and `chunks`.

### Frontend not loading
- Check API URL:
  - `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:3001`
- Confirm Nest service is running.

### API cannot reach chatbot
- Check:
  - `CHATBOT_BASE_URL=http://127.0.0.1:8000`

### Chatbot cannot reach DB
- Verify `DATABASE_URL` host/port/user/db.
- Confirm PostgreSQL is running and accepting connections.

## Notes
- Retrieval logic is hybrid and fused by score.
- Self-RAG includes self-check and optional query refinement path.
- LLM generation now runs fully local through Ollama.
