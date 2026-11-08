# Echo • Context-Aware Voice Agent with Long-Term Conversational Memory

An evidence-grounded conversational voice agent that maintains long-term conversational memory across multiple sessions with $0 free-tier infrastructure.

![Echo Luminous Sanctuary Interface](docs/preview_luminous_ui.png)

---

## Interactive Interface Showcase

| "What I remember" Living Memory Drawer | Hover / Touch Evidence Provenance Popover |
| :---: | :---: |
| ![Living Memory Drawer](docs/preview_drawer_open.png) | ![Evidence Popover](docs/preview_evidence_popover.png) |

---

## Key Capabilities

1. **Evidence-Grounded Canonical Memory Extraction (Stage I)**:
   - Disentangles heterogeneous dialogue turns into third-person canonical propositions.
   - Automatically rejects conversational filler and small-talk with zero false positives.
   - Every single memory proposition is strictly grounded with a verbatim source quote span extracted from the user's spoken utterance.

2. **Semantic Association & Multi-Evidence Deduplication (Stage II)**:
   - Prevents database bloat through normalized text matching and vector cosine similarity.
   - World-knowledge semantic reconciliation (e.g. recognizes that 21 km is a half marathon, December is winter) to increment reinforcement counters (`support_count`) and stack multi-turn proofs (`Evidence #1`, `Evidence #2`) without creating duplicate records.

3. **Orthogonal Two-Track Memory Retrieval**:
   - **Track A (Rule-Based Admittance)**: Always retrieves active user preferences, dietary constraints, and behavioral guidelines, regardless of the semantic query topic.
   - **Track B (Associative Semantic Recall)**: Top-$k$ cosine similarity retrieval over past domain facts and goals.
   - Eliminates the classic Naive RAG failure mode where formatting preferences are lost during technical domain queries.

4. **Luminous Sanctuary Interface (Stitch-Designed)**:
   - **Hover / Touch-to-Reveal Memory**: Recalled memory facts never clutter the chat forever. A delicate `✦ N Recalled` pill button appears in the message header; hovering reveals a frosted-glass flyout with full verbatim evidence quotes and disappears cleanly on mouse leave.
   - **Collapsible "What I remember" Drawer**: Slide-over inspector displaying all active memories organized by category (`PREFERENCES`, `GOALS`, `HEALTH & DIET`, `ABOUT`), each with its complete multi-evidence stack and proof counts.
   - **Collapsible Sessions Sidebar**: Left-hand conversation navigation with one-click new session creation, active indicators, and smooth collapse/expand transitions.
   - **Soft Voice Engine**: Web Speech Synthesis audio playback with harmonic waveform visualizers and microphone speech-to-text input.
   - **High-Contrast Typography**: Elegant Serif titles, high-contrast slate text, custom GFM tables for recipes and technical data, and purple-tinted highlights.

5. **100% $0 Free-Tier Stack**:
   - **LLM**: Groq Cloud Free Tier (`openai/gpt-oss-120b` or Llama 3.3 70B).
   - **Embeddings**: Local 384-dimensional CPU embeddings (`sentence-transformers/all-MiniLM-L6-v2`) with fast deterministic hash fallback.
   - **Database**: Free Neon.tech Cloud PostgreSQL with `pgvector(384)` (or local SQLite).

---

## Architecture Overview

```mermaid
graph TD
    User["User Dialogue / Audio Input"] --> Stream["Chat Interface (React + Vite)"]
    Stream --> API["FastAPI Memory Engine Backend"]
    
    subgraph Retrieval ["Two-Track Retrieval"]
        API --> TrackA["Track A: Active Preferences & Constraints"]
        API --> TrackB["Track B: Top-k Semantic Similarity"]
        TrackA --> Injector["Prompt Injector"]
        TrackB --> Injector
    end

    Injector --> LLM["Groq Cloud LLM (Free Tier)"]
    LLM --> Stream

    subgraph MemoryLifecycle ["Memory Adaptation Lifecycle"]
        API --> Extractor["Stage I: Canonical Memory Extractor"]
        Extractor --> Dedup["Stage II: Semantic Deduplication & Reconciliation"]
        Dedup --> DB[("Neon PostgreSQL + pgvector(384)")]
    end
```

---

## Quickstart

### Prerequisites
- Python 3.10+
- Node.js 18+ and pnpm

### 1. Installation
Clone the repository:
```bash
git clone https://github.com/NaveenGP2005/Major_Project.git
cd Major_Project
```

Backend Setup:
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
```
*(Add your free Groq API key and Neon DB connection string to `backend/.env`)*.

Frontend Setup:
```bash
cd ../frontend
pnpm install
```

---

### 2. Launching the Application

#### Option A: One-Click Startup (Windows)
```cmd
.\start_all.bat
```

#### Option B: Manual Startup
Terminal 1 (Backend):
```bash
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Terminal 2 (Frontend):
```bash
cd frontend
pnpm dev --port 5173
```

- **Interactive UI Workstation**: `http://localhost:5173`
- **Interactive API Swagger Docs**: `http://127.0.0.1:8000/docs`

---

## Automated Verification & Edge-Case Testing

Run the automated edge-case test suite:
```bash
cd backend
python tests/edge_case_tests.py
```

Edge-case test scenarios:
1. Small-talk & conversational filler rejection (100% precision).
2. Multi-proposition compound turns with verbatim source grounding.
3. Semantic paraphrase deduplication and multi-evidence reinforcement (`Evidence #1`, `Evidence #2`).
4. Orthogonal two-track retrieval (formatting preferences admitted during technical queries).
5. Negative constraint handling ("Never do X").
6. Right-to-be-forgotten instant retrieval eviction.

---

## Authentication & Multi-Tenant Isolation

The system features complete multi-tenant memory isolation backed by Neon PostgreSQL:
- **JWT Authentication (`HS256`)**: Secure bearer tokens with salted bcrypt password hashing.
- **1-Click Evaluation Mode**: Evaluators and graders can jump in as `Alex M.` with pre-seeded cross-session memories.
- **Account Creation**: Users can create isolated accounts where conversation sessions and extracted memory vectors never leak across tenant boundaries.
- **Automated Auth Test**:
```bash
cd backend
python tests/test_auth_flow.py
```
