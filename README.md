# Caatch

**Caatch** is a full-stack political connection tracking application for mapping and monitoring relationships between political figures, events, locations, and organizations.

It features an asynchronous **Python (FastAPI)** backend, an interactive **Next.js** frontend with a draggable SVG ego-network explorer, a **PostgreSQL** database, and is deployed onto a local Kubernetes (Kind) cluster via **Helm**.

---

## Project Structure

```
caatch/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   └── models/
│   ├── migrations/
│   └── tests/
├── frontend/
│   └── src/app/
│       └── components/
├── k8s/
│   └── templates/
├── tests/
│   └── integration/
├── deploy.sh
└── presubmit.sh
```

---

## Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Kind](https://kind.sigs.k8s.io/) + [kubectl](https://kubernetes.io/docs/tasks/tools/)
- [Helm](https://helm.sh/docs/intro/install/)
- [Poetry](https://python-poetry.org/docs/#installation) (Python 3.12)
- [Node.js](https://nodejs.org/) 20+

### 1. Deploy the full stack

Builds container images tagged with a `YYYYMMDD-HHMMSS` timestamp, loads them into the Kind cluster, runs a Helm upgrade, and sets up port-forwarding:

```bash
chmod +x deploy.sh
./deploy.sh dev
```

| Service | Local URL |
|---------|-----------|
| Frontend UI | <http://localhost:3000> |
| FastAPI Backend | <http://localhost:8000> |
| PostgreSQL | `localhost:5432` |

### 2. Verify the cluster

```bash
kubectl get pods
kubectl get svc
```

---

## Development

### Backend

```bash
cd backend
poetry install

# Run the dev server (requires a running Postgres)
poetry run uvicorn app.main:app --reload

# Run tests (uses in-memory SQLite — no Postgres needed)
poetry run pytest tests/ -v
```

### Frontend

```bash
cd frontend
npm install
npm run dev       # http://localhost:3000
```

---

## Running Presubmits Locally

Use `presubmit.sh` to run the same checks that GitHub Actions runs before pushing:

```bash
# Everything (backend lint + type check + tests, frontend lint + build)
./presubmit.sh

# One side only
./presubmit.sh --backend
./presubmit.sh --frontend

# Include K8s integration tests (requires a live Kind cluster)
./presubmit.sh --integration
```

---

## CI / GitHub Actions

| Workflow | Trigger | Jobs |
|----------|---------|------|
| `presubmit.yml` | Push / PR → `main` | Backend lint & tests, Frontend lint & build, K8s integration tests |
| `frontend.yml` | Push / PR → `main` (frontend paths only) | ESLint → Next.js build |

### Backend checks (`Ruff` + `Mypy` + `Pytest`)

```bash
cd backend
poetry run ruff check .           # linting
poetry run ruff format --check .  # formatting
poetry run mypy .                 # type checking
poetry run pytest tests/ -v       # unit tests
```

### Frontend checks (`ESLint` + `next build`)

```bash
cd frontend
npm run lint    # ESLint (next/core-web-vitals)
npm run build   # production build check
```

---

## API Reference

### Health

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Returns service status and build tag |

### Entities

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/entities` | Create a new entity (person, place, event, organization, other) |
| `GET` | `/api/entities` | List entities — supports `?type=`, `?search=`, `?page=`, `?page_size=` |
| `GET` | `/api/entities/{id}` | Get a single entity |
| `PUT` | `/api/entities/{id}` | Update an entity |
| `DELETE` | `/api/entities/{id}` | Delete entity and all its connections (cascade) |
| `GET` | `/api/entities/{id}/network?depth=2` | Recursive ego-network subgraph (SQL CTE) |

### Connections

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/connections` | Create a connection (validated against allowed rules) |
| `GET` | `/api/connections` | List connections — supports `?page=`, `?page_size=` |
| `DELETE` | `/api/connections/{id}` | Delete a connection |
| `GET` | `/api/connections/rules` | Fetch allowed connection type rules |

### Graph

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/graph` | Full graph — all nodes and edges |

---

## Technical Notes

- **Database**: PostgreSQL with UUID primary keys and JSONB `properties` columns. Tests run against in-memory SQLite via `aiosqlite`.
- **Pagination**: All list endpoints return a generic `PaginatedResponse[T]` with `total`, `page`, `page_size`, and `total_pages`.
- **Connection validation**: Allowed connection types are enforced server-side via `ALLOWED_CONNECTIONS` rules (source type → label → allowed target types).
- **Network graph**: Ego-networks are computed with a recursive SQL CTE. The frontend renders them as a draggable SVG canvas with layered node layout.
- **Image tagging**: `deploy.sh` uses `YYYYMMDD-HHMMSS` timestamps to prevent Kind's containerd cache from serving stale images.
- **Type safety**: Backend is fully typed — `py.typed` markers (PEP 561) are present on all packages; Mypy runs in strict-import mode.
