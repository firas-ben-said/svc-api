#!/usr/bin/env bash
set -euo pipefail

print_help() {
  cat <<'EOF'
One-shot launcher for the NestJS micro-service platform.

USAGE
  ./scripts/dev.sh [--no-watch] [--keep-infra] [-h|--help]

WHAT IT DOES
  1. Brings up Postgres, Zookeeper, Kafka and the nginx gateway via
     `docker compose up -d --wait` — blocks until every container is healthy.
  2. Starts the 5 NestJS services in parallel with colored prefixes.
  3. On Ctrl+C (or any exit), stops the services and tears the infra down.

OPTIONS
  --no-watch     Start services without `--watch` (no auto-reload).
  --keep-infra   Leave Postgres/Kafka/nginx running on exit.
  -h, --help     Show this help.
EOF
}

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

WATCH_FLAG="--watch"
KEEP_INFRA=0
for arg in "$@"; do
  case "$arg" in
    --no-watch)              WATCH_FLAG="" ;;
    --keep-infra|--keep-kafka) KEEP_INFRA=1 ;;
    -h|--help)               print_help; exit 0 ;;
    *)
      echo "✗ unknown argument: $arg" >&2
      print_help
      exit 2
      ;;
  esac
done

# --- pre-flight --------------------------------------------------------------

if ! command -v docker >/dev/null 2>&1; then
  echo "✗ docker is required but not found in PATH" >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "✗ docker daemon is not running — start Docker Desktop and retry" >&2
  exit 1
fi

# --- cleanup trap ------------------------------------------------------------

cleanup() {
  local rc=$?
  echo
  echo "▶ shutting down…"
  # `concurrently` already propagates SIGTERM to its children on exit.
  if [[ "$KEEP_INFRA" -eq 0 ]]; then
    docker compose down --remove-orphans >/dev/null 2>&1 || true
    echo "  ✓ infra stopped (postgres, kafka, zookeeper, nginx)"
  else
    echo "  ⚠ leaving infra running (--keep-infra)"
  fi
  exit "$rc"
}
trap cleanup INT TERM EXIT

# --- bring up infra ---------------------------------------------------------

echo "▶ starting infra (postgres, zookeeper, kafka, nginx)…"
# --wait blocks until every service's healthcheck passes.
docker compose up -d --wait
echo "  ✓ postgres  → localhost:5432  (db=tp_microservices, user/pass=postgres/postgres)"
echo "  ✓ kafka     → localhost:9092"
echo "  ✓ gateway   → http://localhost:8080  (nginx → catalog/order/query)"

# --- run all five services concurrently --------------------------------------

echo "▶ launching services…"
echo "    catalog       → http://localhost:3001/products      (via gateway: /products)"
echo "    order         → http://localhost:3002/orders        (via gateway: /orders)"
echo "    stock (gRPC)  → localhost:50051"
echo "    notification  → kafka consumer (no port)"
echo "    query         → http://localhost:3003/graphql       (via gateway: /graphql)"
echo

# `concurrently` runs N processes in parallel, prefixes each line with
# the service name + a unique color, and propagates Ctrl+C to all children.
exec npx concurrently \
  --prefix "[{name}]" \
  --prefix-colors "cyan,yellow,green,magenta,blue" \
  --names "catalog,stock,order,notif,query" \
  --kill-others-on-fail \
  --handle-input \
  "nest start catalog-service $WATCH_FLAG" \
  "nest start stock-service $WATCH_FLAG" \
  "nest start order-service $WATCH_FLAG" \
  "nest start notification-service $WATCH_FLAG" \
  "nest start query-service $WATCH_FLAG"
