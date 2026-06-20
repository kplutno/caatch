#!/bin/bash
set -e

ENV=${1:-dev}
VALUES_FILE="k8s/values-$ENV.yaml"

if [ ! -f "$VALUES_FILE" ]; then
  echo "Error: Values file $VALUES_FILE does not exist."
  exit 1
fi

# Set tag from second argument, or default to a unique human-readable timestamp tag
TAG=${2:-$(date +%Y%m%d-%H%M%S)}
echo "Using image tag: $TAG"

# Build backend
echo "Building backend image for environment: $ENV..."
docker build -t caatch-backend:$TAG ./backend

# Build frontend
echo "Building frontend image..."
docker build -t caatch-frontend:$TAG --build-arg NEXT_PUBLIC_API_URL=http://localhost:8000 ./frontend

# Load images into Kind cluster (dev environment)
if [ "$ENV" = "dev" ] && command -v kind >/dev/null 2>&1; then
  echo "Loading new images into Kind cluster 'desktop'..."
  kind load docker-image caatch-backend:$TAG --name desktop
  kind load docker-image caatch-frontend:$TAG --name desktop
fi

# Deploy Helm chart
echo "Deploying Helm chart with values from $VALUES_FILE..."
helm upgrade --install caatch ./k8s \
  -f $VALUES_FILE \
  --set backend.image.tag=$TAG \
  --set frontend.image.tag=$TAG

# Automatically expose ports in dev environment
if [ "$ENV" = "dev" ]; then
  echo "Waiting for deployments to be fully ready before mapping ports..."
  kubectl rollout status deployment/caatch-backend --timeout=60s
  kubectl rollout status deployment/caatch-frontend --timeout=60s

  echo "Exposing services on local ports..."
  # Terminate any existing port-forwarding to prevent port conflicts
  pgrep -f "port-forward svc/caatch-frontend" | xargs kill -9 2>/dev/null || true
  pgrep -f "port-forward svc/caatch-backend" | xargs kill -9 2>/dev/null || true

  # Start port forwarding in the background with nohup to survive shell session exit
  nohup kubectl port-forward svc/caatch-frontend 3000:3000 --address 0.0.0.0 >/dev/null 2>&1 &
  nohup kubectl port-forward svc/caatch-backend 8000:8000 --address 0.0.0.0 >/dev/null 2>&1 &
  echo "Services mapped: Frontend at http://localhost:3000 and Backend at http://localhost:8000"
fi

echo "Deployment complete! Run 'kubectl get pods' and 'kubectl get svc' to see the status."
