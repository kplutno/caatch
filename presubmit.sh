#!/usr/bin/env bash
# presubmit.sh — Run all checks locally that GitHub CI runs on push/PR.
#
# Usage:
#   ./presubmit.sh              # run everything
#   ./presubmit.sh --backend    # backend only
#   ./presubmit.sh --frontend   # frontend only
#
# Exit code is non-zero if any check fails.
# Integration tests (require a live Kind cluster) are skipped by default;
# pass --integration to include them.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$REPO_ROOT/backend"
FRONTEND_DIR="$REPO_ROOT/frontend"

# ── Colour helpers ────────────────────────────────────────────────────────────
BOLD='\033[1m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
RESET='\033[0m'

passed=()
failed=()

step() { echo -e "\n${CYAN}${BOLD}▶ $*${RESET}"; }
ok()   { echo -e "${GREEN}${BOLD}  ✔ $*${RESET}"; passed+=("$*"); }
fail() { echo -e "${RED}${BOLD}  ✘ $*${RESET}"; failed+=("$*"); }

# ── Argument parsing ──────────────────────────────────────────────────────────
RUN_BACKEND=true
RUN_FRONTEND=true
RUN_INTEGRATION=false

for arg in "$@"; do
  case "$arg" in
    --backend)     RUN_FRONTEND=false ;;
    --frontend)    RUN_BACKEND=false ;;
    --integration) RUN_INTEGRATION=true ;;
    *)
      echo "Unknown flag: $arg"
      echo "Usage: $0 [--backend] [--frontend] [--integration]"
      exit 1
      ;;
  esac
done

# ── Backend checks ────────────────────────────────────────────────────────────
if $RUN_BACKEND; then
  echo -e "\n${BOLD}━━━ Backend ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"

  step "Installing Python dependencies (poetry install)"
  (cd "$BACKEND_DIR" && poetry install --quiet) \
    && ok "poetry install" \
    || { fail "poetry install"; }

  step "Ruff — lint (ruff check)"
  if (cd "$BACKEND_DIR" && poetry run ruff check .); then
    ok "ruff check"
  else
    fail "ruff check"
  fi

  step "Ruff — format (ruff format --check)"
  if (cd "$BACKEND_DIR" && poetry run ruff format --check .); then
    ok "ruff format"
  else
    fail "ruff format  →  run: cd backend && poetry run ruff format ."
  fi

  step "Mypy — type check"
  if (cd "$BACKEND_DIR" && poetry run mypy .); then
    ok "mypy"
  else
    fail "mypy"
  fi

  step "Pytest — unit tests"
  if (cd "$BACKEND_DIR" && poetry run pytest tests/ -v); then
    ok "pytest unit tests"
  else
    fail "pytest unit tests"
  fi
fi

# ── Frontend checks ───────────────────────────────────────────────────────────
if $RUN_FRONTEND; then
  echo -e "\n${BOLD}━━━ Frontend ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"

  step "Installing Node dependencies (npm ci)"
  if (cd "$FRONTEND_DIR" && npm ci --silent); then
    ok "npm ci"
  else
    fail "npm ci"
  fi

  step "ESLint — lint (npm run lint)"
  if (cd "$FRONTEND_DIR" && npm run lint); then
    ok "eslint"
  else
    fail "eslint"
  fi

  step "Next.js — build check (npm run build)"
  if (cd "$FRONTEND_DIR" && NEXT_TELEMETRY_DISABLED=1 npm run build); then
    ok "next build"
  else
    fail "next build"
  fi
fi

# ── Integration tests (opt-in) ────────────────────────────────────────────────
if $RUN_INTEGRATION; then
  echo -e "\n${BOLD}━━━ Integration Tests ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
  echo -e "${YELLOW}  ⚠  Requires a running Kind cluster named 'desktop' and Helm.${RESET}"

  step "Deploying to local Kind cluster"
  if (cd "$REPO_ROOT" && chmod +x deploy.sh && ./deploy.sh dev); then
    ok "deploy.sh dev"
  else
    fail "deploy.sh dev"
  fi

  step "Running integration tests (pytest tests/integration/)"
  if (cd "$REPO_ROOT" && sleep 10 && pip install --quiet requests pytest && pytest tests/integration/ -v); then
    ok "pytest integration tests"
  else
    fail "pytest integration tests"
  fi
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo -e "\n${BOLD}━━━ Summary ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"

for s in "${passed[@]}"; do
  echo -e "  ${GREEN}✔${RESET} $s"
done

for s in "${failed[@]}"; do
  echo -e "  ${RED}✘${RESET} $s"
done

echo ""
if [ ${#failed[@]} -eq 0 ]; then
  echo -e "${GREEN}${BOLD}All checks passed — CI should be green. 🎉${RESET}"
  exit 0
else
  echo -e "${RED}${BOLD}${#failed[@]} check(s) failed — fix them before pushing.${RESET}"
  exit 1
fi
