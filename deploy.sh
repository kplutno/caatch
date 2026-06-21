#!/bin/bash
set -e

CLEAN=false
ENV=""
TAG=""

for arg in "$@"; do
  case "$arg" in
    --clean)
      CLEAN=true
      ;;
    *)
      if [ -z "$ENV" ]; then
        ENV="$arg"
      elif [ -z "$TAG" ]; then
        TAG="$arg"
      else
        echo "Error: Unexpected argument '$arg'"
        echo "Usage: $0 [--clean] [environment] [image_tag]"
        exit 1
      fi
      ;;
  esac
done

ENV=${ENV:-dev}
VALUES_FILE="k8s/values-$ENV.yaml"

if [ ! -f "$VALUES_FILE" ]; then
  echo "Error: Values file $VALUES_FILE does not exist."
  exit 1
fi

TAG=${TAG:-$(date +%Y%m%d-%H%M%S)}

if [ "$CLEAN" = true ]; then
  echo "Cleaning up existing deployment for environment: $ENV..."

  # Terminate port-forwarding
  echo "Stopping any running port-forward processes..."
  pgrep -f "port-forward svc/caatch-frontend" | xargs kill -9 2>/dev/null || true
  pgrep -f "port-forward svc/caatch-backend" | xargs kill -9 2>/dev/null || true

  # Remove finalizers to prevent getting stuck in Terminating state (common in local Kind clusters)
  if command -v kubectl >/dev/null 2>&1; then
    echo "Patching services and PVCs to clear finalizers..."
    kubectl patch svc caatch-backend -p '{"metadata":{"finalizers":null}}' --type=merge 2>/dev/null || true
    kubectl patch svc caatch-frontend -p '{"metadata":{"finalizers":null}}' --type=merge 2>/dev/null || true
    kubectl patch pvc caatch-cockroach-pvc -p '{"metadata":{"finalizers":null}}' --type=merge 2>/dev/null || true
  fi

  # Uninstall helm chart
  if helm list -q | grep -q "^caatch$"; then
    echo "Uninstalling Helm release caatch..."
    helm uninstall caatch --wait
  else
    echo "No existing Helm release 'caatch' found."
  fi

  # Delete PVC
  if command -v kubectl >/dev/null 2>&1; then
    echo "Ensuring persistent volume claims are deleted..."
    kubectl delete pvc -l app.kubernetes.io/instance=caatch --ignore-not-found=true --wait=false

    echo "Waiting for pods to be fully terminated..."
    kubectl wait --for=delete pod -l app.kubernetes.io/instance=caatch --timeout=10s 2>/dev/null || true
  fi

  echo "Cleanup complete. Starting deployment from scratch..."
fi

echo "Using image tag: $TAG"

# Build backend
echo "Building backend image for environment: $ENV..."
docker build -t caatch-backend:$TAG ./backend

# Build frontend
echo "Building frontend image..."
docker build -t caatch-frontend:$TAG \
  --build-arg NEXT_PUBLIC_API_URL=http://localhost:8000 \
  --build-arg NEXT_PUBLIC_IMAGE_TAG=$TAG \
  ./frontend

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
if [ "$ENV" = "dev" ] && [ -z "$CI" ]; then
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
echo "Using image tag: $TAG"
