# NextStep Science

NextStep Science is a safety-first AI lab assistant designed to help researchers reason over experiments without replacing scientific judgment.


The system interprets experimental protocols, analyzes results from text, CSV files, PDFs, or images, and suggests safe, bounded next steps with clear explanations.

It is built with a strong focus on:
- Responsible AI
- Safety enforcement
- Explainability
- Real-world lab constraints

<p align="center">
  <img src="./NextStep-Science%20-%20workflow.png" alt="Workflow" width="600">
</p>

---

## Project Goal

The goal of this project is to build an AI-powered research assistant that helps users:

- Understand experimental inputs
- Analyze structured and unstructured data
- Identify patterns and uncertainties
- Suggest safe next steps
- Prevent unsafe or hazardous recommendations

This tool does NOT replace scientific expertise.  
It augments reasoning while enforcing strict safety boundaries.

---

## Core Capabilities

- Upload and analyze:
  - PDFs (lab protocols)
  - Images (experimental setups, notes)
  - CSV datasets
  - Text input (chat)

- Extract and process experimental content
- Maintain conversational context (session-based memory)
- Generate structured scientific insights
- Enforce **multi-layer safety filtering**

---

## Architecture 

### Frontend
**Tech:**
- Angular
- TypeScript

**Responsibilities:**
- File upload (PDF, CSV, Image)
- Chat interface
- Display structured results
- Enforce UI-level safety blocking (critical for UX)

---

### Backend
**Tech:**
- Azure Functions (Python)

**Endpoints:**
- `/upload`
- `/analyze`
- `/health`

**Responsibilities:**
- Handle requests from frontend
- Manage session memory
- Route processing logic
- Call AI + safety services
- Return structured JSON

---

### Storage
**Azure Blob Storage**
- Stores uploaded files
- Generates `blob_name` used in analysis

---

### Extraction Layer

**Azure AI Document Intelligence**
- Extracts text from:
  - PDFs
  - Images

---

### AI Reasoning Layer

**Azure AI Projects + GPT-4.1 Mini**

- Uses an Azure AI Agent
- Generates:
  - experiment_summary
  - protocol_or_setup
  - observations_and_analysis
  - next_steps
  - safety_assessment

---

### Safety Layer (CRITICAL)

We use a **multi-layer safety approach**:

#### 1. Azure AI Content Safety
- Input moderation
- Output moderation

#### 2. Custom Lab Safety Rules (Backend)
- Blocks unsafe experimental requests
- Detects:
  - hazardous modifications
  - high-reactivity suggestions
  - unsafe chemical advice

#### 3. Frontend Safety Guard (UI)
- Immediate blocking before API call
- Prevents unsafe prompts from reaching backend

---

## Main Flow

1. User uploads file or sends text
2. File stored in Blob Storage
3. Content extracted (if needed)
4. Session context updated
5. Safety checks applied (input)
6. AI generates structured response
7. Safety checks applied (output)
8. UI renders safe result

---

## Safety Philosophy

This system is designed to:

- Prevent unsafe chemical recommendations
- Avoid hazardous experimental guidance
- Restrict manipulation attempts on the AI
- Ensure all outputs remain scientifically responsible

---

## Branch Structure

| Branch | Purpose |
|------|--------|
| `main` | Stable version |
| `backend` | Core backend logic |
| `backend-azure` | Azure-integrated backend (production logic) |
| `frontend` | Angular UI |
| `problematica` | Early/problem exploration |

---

## Key Design Decisions

- Use **GPT-4.1 Mini** → cost-efficient + fast
- Use **Azure AI Projects** instead of raw OpenAI calls
- Avoid over-engineering (no unnecessary RAG layer)
- Enforce safety at **multiple layers**
- Keep responses structured for UI rendering

---

## What We Removed (on purpose)

To keep the system simple and focused:

- ❌ Azure AI Search (not needed for current scope)
- ❌ Complex RAG pipelines
- ❌ Over-engineered orchestration layers

---

## Why This Matters

Many AI systems:
- can be manipulated
- provide unsafe scientific suggestions
- lack domain-aware safeguards

NextStep Science solves this by combining:

- Structured reasoning
- Context-aware analysis
- Multi-layer safety enforcement

---

## Future Improvements

- Fine-tuned lab safety classifier
- Structured output enforcement (strict JSON schema)
- Experiment tracking dashboard
- Advanced uncertainty modeling

---

## Team Focus

### Frontend
- UX
- Chat experience
- Safety feedback
- Visualization

### Backend / AI
- AI orchestration
- Safety enforcement
- Extraction + processing
- Session memory

---

## Summary

NextStep Science is not just another AI assistant.

It is a **safe, controlled, and explainable lab reasoning system** built for real-world scientific workflows.
