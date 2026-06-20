# Caatch

**Caatch** is a full-stack web application designed to track political events, people, and monitor connections between those people, events, places, and more. 

It features a **Python (FastAPI)** backend and a **Next.js** frontend, orchestrated with Kubernetes (via Docker Desktop).

## Project Structure

```
caatch/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   └── main.py          # FastAPI application
│   ├── Dockerfile
│   ├── pyproject.toml       # Poetry project config
│   ├── poetry.lock
│   └── .dockerignore
├── frontend/
│   ├── src/app/
│   │   ├── layout.js        # Root layout
│   │   └── page.js          # Main page (calls backend)
│   ├── Dockerfile
│   ├── next.config.mjs
│   ├── package.json
│   └── .dockerignore
├── k8s/
│   ├── backend.yaml         # Backend Kubernetes manifests
│   └── frontend.yaml        # Frontend Kubernetes manifests
├── tests/
│   └── integration/
│       └── test_frontend_calls_backend.py
├── deploy.sh                # Script to build images and deploy to k8s
└── README.md
```

## Quick Start

### 1. Start the services

Ensure you have a local Kubernetes cluster running (e.g., Docker Desktop with Kubernetes enabled).

Make the deployment script executable and run it:

```bash
chmod +x deploy.sh
./deploy.sh
```

This will:
- Build local docker images for both the frontend and backend.
- Apply the Kubernetes manifests from the `k8s/` directory.
- Expose the **backend** on [http://localhost:8000](http://localhost:8000)
- Expose the **frontend** on [http://localhost:3000](http://localhost:3000)

### 2. Check Deployment Status

You can monitor your pods using `kubectl`:

```bash
kubectl get pods
kubectl get svc
```

### 3. Run integration tests

```bash
pip install requests pytest
pytest tests/integration/ -v
```

### 4. Stop the services

To remove the deployment from your cluster, you can delete the resources:

```bash
kubectl delete -f k8s/backend.yaml
kubectl delete -f k8s/frontend.yaml
```

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | GET | Health check — returns service status |
| `/api/greet?name=<name>` | GET | Returns a greeting (defaults to "World") |

## Architecture

The **frontend** and **backend** are fully independent services. The browser calls the backend directly:

```
Browser  →  GET http://localhost:8000/api/health   (backend directly)
Browser  →  GET http://localhost:3000              (frontend for UI)
```

- The backend URL is baked into the frontend JS bundle at build time via the `NEXT_PUBLIC_API_URL` build arg
- The backend has CORS enabled to allow cross-origin requests from the frontend
- Both services are exposed via Kubernetes `LoadBalancer` services that map to your local ports.
