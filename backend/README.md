# Caatch Backend

FastAPI backend application running on Port 8000 using Poetry and SQLAlchemy (SQLModel).

## Helm Chart Setup

We have set up a Helm chart to deploy the backend application to Kubernetes.

The chart is located at [k8/caatch-backend/](file:///home/kpluciennik/caatch/k8/caatch-backend).

### Features:
- Standard deployment and service configurations.
- Ingress support.
- Horizontal Pod Autoscaler (HPA).
- Database migrations hook (`pre-install`/`pre-upgrade` job running Alembic).

### Configuration Options

You can modify values in [values.yaml](file:///home/kpluciennik/caatch/k8/caatch-backend/values.yaml):
- `config.databaseUrl`: Connection string for PostgreSQL database.
- `config.allowedOrigins`: CORS allowed origins.
- `image.repository`: Container image name.
- `image.tag`: Image tag override.

### How to Install the Chart

Install or upgrade using Helm:
```bash
helm upgrade --install caatch-backend ../k8/caatch-backend -f ../k8/caatch-backend/values.yaml
```
