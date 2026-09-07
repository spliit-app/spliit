#!/usr/bin/env bash
#
# Runs the performance suite against an isolated app + postgres stack built from
# this checkout. CI calls the same subcommands, so local and CI runs are identical.
#
#   ./scripts/perf.sh                 build, start, seed, benchmark, tear down
#   ./scripts/perf.sh up              start and leave running
#   ./scripts/perf.sh seed            (re)seed the database of a running stack
#   ./scripts/perf.sh bench           benchmark an already-running, already-seeded stack
#   ./scripts/perf.sh logs            dump container logs
#   ./scripts/perf.sh down            stop and delete the database
#
# Env:
#   PERF_HOST_PORT   host port for the app (default 3100)
#   PERF_DB_PORT     host port for postgres (default 55432)
#   PERF_SKIP_BUILD  set to 1 when the image was already built (CI cache path)
#   PERF_GROUPS, PERF_LARGE_GROUP_EXPENSES, ...  dataset sizing, see perf/config.ts
#   PERF_ITERATIONS, PERF_WARMUP                 sampling, see perf/config.ts
set -euo pipefail
cd "$(dirname "$0")/.."

PERF_HOST_PORT="${PERF_HOST_PORT:-3100}"
PERF_DB_PORT="${PERF_DB_PORT:-55432}"
export PERF_HOST_PORT PERF_DB_PORT

compose() { docker compose -f compose.perf.yaml "$@"; }

up() {
  # --force-recreate --renew-anon-volumes is what actually guarantees a clean
  # database: the postgres image declares its own VOLUME, so a plain `up` would
  # silently reattach the previous run's anonymous volume.
  #
  # Spelled out twice rather than built as an array: macOS still ships bash 3.2,
  # where `set -u` treats an empty array expansion as an unbound variable.
  if [ "${PERF_SKIP_BUILD:-}" = "1" ]; then
    compose up --wait --wait-timeout 300 --force-recreate --renew-anon-volumes
  else
    compose up --wait --wait-timeout 300 --force-recreate --renew-anon-volumes --build
  fi
}

down() { compose down --volumes --remove-orphans --timeout 10; }

logs() { compose logs --no-color --timestamps; }

seed() { npx ts-node -T perf/seed.ts; }

bench() {
  shift || true
  npx ts-node -T perf/run.ts "$@"
}

case "${1:-all}" in
up) up ;;
down) down ;;
logs) logs ;;
seed) seed ;;
bench) bench "$@" ;;
all)
  # Drop an explicit leading "all" so it is not forwarded as an argument.
  # Spelled as an if, not `[ ... ] && shift`: under `set -e` a false test as the
  # last command in the branch would abort the script.
  if [ $# -gt 0 ]; then shift; fi
  trap 'status=$?; if [ $status -ne 0 ]; then logs || true; fi; down || true; exit $status' EXIT
  up
  seed
  npx ts-node -T perf/run.ts "$@"
  ;;
*)
  echo "usage: $0 [all|up|seed|bench|down|logs]" >&2
  exit 2
  ;;
esac
