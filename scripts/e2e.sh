#!/usr/bin/env bash
#
# Runs the Playwright suite against an isolated app + postgres stack built from
# this checkout. CI calls the same subcommands, so local and CI runs are identical.
#
#   ./scripts/e2e.sh                  build, start, test, tear down
#   ./scripts/e2e.sh up               start and leave running
#   ./scripts/e2e.sh test --ui        run tests against an already-running stack
#   ./scripts/e2e.sh logs             dump container logs
#   ./scripts/e2e.sh down             stop and delete the database
#
# Env:
#   E2E_HOST_PORT    host port to publish (default 3000)
#   E2E_SKIP_BUILD   set to 1 when the image was already built (CI cache path)
set -euo pipefail
cd "$(dirname "$0")/.."

E2E_HOST_PORT="${E2E_HOST_PORT:-3000}"
export E2E_HOST_PORT
export E2E_BASE_URL="${E2E_BASE_URL:-http://localhost:${E2E_HOST_PORT}}"

compose() { docker compose -f compose.e2e.yaml "$@"; }

up() {
  # --force-recreate --renew-anon-volumes is what actually guarantees a clean
  # database: the postgres image declares its own VOLUME, so a plain `up` would
  # silently reattach the previous run's anonymous volume.
  #
  # Spelled out twice rather than built as an array: macOS still ships bash 3.2,
  # where `set -u` treats an empty array expansion as an unbound variable.
  if [ "${E2E_SKIP_BUILD:-}" = "1" ]; then
    compose up --wait --wait-timeout 300 --force-recreate --renew-anon-volumes
  else
    compose up --wait --wait-timeout 300 --force-recreate --renew-anon-volumes --build
  fi
}

down() { compose down --volumes --remove-orphans --timeout 10; }

logs() { compose logs --no-color --timestamps; }

case "${1:-all}" in
up) up ;;
down) down ;;
logs) logs ;;
test)
  shift
  npx playwright test "$@"
  ;;
all)
  # Drop an explicit leading "all" so it is not forwarded as a test filter.
  # Spelled as an if, not `[ ... ] && shift`: under `set -e` a false test as the
  # last command in the branch would abort the script.
  if [ $# -gt 0 ]; then shift; fi
  trap 'status=$?; if [ $status -ne 0 ]; then logs || true; fi; down || true; exit $status' EXIT
  up
  npx playwright test "$@"
  ;;
*)
  echo "usage: $0 [all|up|test|down|logs]" >&2
  exit 2
  ;;
esac
