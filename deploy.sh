#!/bin/bash
set -e

ENV=${1:-dev}
VALUES_FILE="k8s/values-$ENV.yaml"

if [ ! -f "$VALUES_FILE" ]; then
  echo "Error: Values file $VALUES_FILE does not exist."
  exit 1
fi

if [ "$ENV" = "dev" ]; then
  TAG="latest"
else
  TAG=${2:-$(date +%s)}
fi

# Build backend
echo "Building backend image for environment: $ENV..."
docker build -t caatch-backend:$TAG ./backend

# Build frontend
echo "Building frontend image..."
docker build -t caatch-frontend:$TAG --build-arg NEXT_PUBLIC_API_URL=http://localhost:8000 ./frontend

# Deploy Helm chart
echo "Deploying Helm chart with values from $VALUES_FILE..."
helm upgrade --install caatch ./k8s \
  -f $VALUES_FILE \
  --set backend.image.tag=$TAG \
  --set frontend.image.tag=$TAG

echo "Deployment complete! Run 'kubectl get pods' and 'kubectl get svc' to see the status."
