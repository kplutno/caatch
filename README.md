# Caatch

**Caatch** is a full-stack political connection tracking application designed to map and monitor relationships between political figures, events, locations, and organizations. 

It features an asynchronous **Python (FastAPI)** backend using SQLModel, a interactive **Next.js** frontend displaying SVG circular ego-networks, and a **PostgreSQL** database, deployed onto a local Kubernetes (Kind) cluster using **Helm**.

## Project Structure

```
caatch/
├── backend/
│   ├── app/
│   │   ├── database.py      # SQLAlchemy / SQLModel async connection setup
│   │   ├── main.py          # FastAPI application & CTE graph paths
│   │   └── models.py        # Schema models (Entity, Connection) with JSON properties
│   │   
│   ├── migrations/          # Alembic database migrations
│   ├── tests/
│   │   ├── conftest.py      # Async client test fixture overrides
│   │   └── test_api.py      # Extensive backend API tests using in-memory SQLite
│   ├── Dockerfile
│   └── pyproject.toml       # Poetry package config
├── frontend/
│   ├── src/app/
│   │   ├── layout.js        # Root layout config
│   │   ├── globals.css      # Light styling rules
│   │   └── page.js          # SVG graph interface & CRUD panels
│   └── Dockerfile
├── k8s/
│   ├── templates/           # Helm templates (backend, frontend, postgres, ingress)
│   ├── Chart.yaml           # Helm chart definition
│   └── values-dev.yaml      # Staging & development override configurations
├── deploy.sh                # Unique timestamp image tagging & rollout automation script
└── README.md
```

## Quick Start

### 1. Deploy the Application

Deploy the stack locally using the rollout script. This builds container images tagged with dynamic human-readable timestamps (`YYYYMMDD-HHMMSS`), loads them into your Kind cluster, executes Helm upgrades, and handles port-forwarding for the Postgres DB, backend, and frontend.

```bash
chmod +x deploy.sh
./deploy.sh dev
```

This maps:
- **Frontend UI**: [http://localhost:3000](http://localhost:3000)
- **FastAPI Backend**: [http://localhost:8000](http://localhost:8000)
- **PostgreSQL**: `localhost:5432`

### 2. View Status
Verify Kubernetes resources are healthy:
```bash
kubectl get pods
kubectl get svc
```

### 3. Run Backend Test Suite
The backend features an asynchronous test suite executing against an in-memory SQLite instance:
```bash
cd backend
poetry install
poetry run pytest tests/ -v
```

---

## API Endpoints

### Entities CRUD
* `POST /api/entities`: Create a new person, place, event, or organization.
* `GET /api/entities`: Get list of entities (supports type filtering, e.g., `?type=person`).
* `GET /api/entities/{entity_id}`: Read metadata of a single entity.
* `PUT /api/entities/{entity_id}`: Update properties and metadata.
* `DELETE /api/entities/{entity_id}`: Cascade deletes entity and connected edges.

### Connections CRUD
* `POST /api/connections`: Create a new relationship (e.g. `MEMBER_OF`, `KNOWS`).
* `GET /api/connections`: List all connection edges.
* `DELETE /api/connections/{connection_id}`: Delete an edge.

### Graph and Networks
* `GET /api/graph`: Returns complete nodes and edges list.
* `GET /api/entities/{entity_id}/network?depth=2`: Returns recursive ego-network subgraph (uses a SQL recursive CTE path walk compatible with SQLite/Postgres).

---

## Technical Specifications
* **Database**: PostgreSQL (StatefulSet) using native JSONB columns and UUID primary keys. Cross-compatible SQLite translations are supported at runtime.
* **Network Graph Layout**: Custom UI rendering implementing circular geometry SVG layout nodes centered dynamically.
* **Development Flow**: Deployments use timestamped image tags (`deploy.sh`) to prevent Kind node containerd cache collision issues.
