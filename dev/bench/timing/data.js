window.BENCHMARK_DATA = {
  "lastUpdate": 1789266977551,
  "repoUrl": "https://github.com/spliit-app/spliit",
  "entries": {
    "Spliit performance (timing)": [
      {
        "commit": {
          "author": {
            "email": "sebastien@castiel.me",
            "name": "Sebastien Castiel",
            "username": "scastiel"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "8c875ffb07838149ba6fb202d653f315459d0662",
          "message": "Combine mergeable Dependabot updates (next 16.3.4, @types/node 26, react-intersection-observer 11, node:26-alpine, download-artifact v8) (#641)\n\nCombines the open Dependabot PRs that can merge today into one branch so\nthey can be validated and landed together.\n\n## Included\n\n| PR | Bump |\n| --- | --- |\n| #632 | minor-and-patch group: next 16.3.4, next-intl 4.14.2,\nlucide-react 1.41.0, @playwright/test 1.63.0, jest /\njest-environment-jsdom 30.5.1, eslint-config-next 16.3.4, postcss\n8.5.28, @types/react-dom 19.2.7 |\n| #633 | @types/node 24 → 26.4.1 |\n| #626 | react-intersection-observer 10.1.0 → 11.0.1 |\n| #623 | actions/download-artifact 7 → 8 |\n| #565 | Dockerfile base image node:24-alpine → node:26-alpine |\n\nEach PR branch is merged as-is (merge commits preserved); all five\nmerged without conflicts.\n\n## Not included — blocked upstream\n\n- **#572 typescript 7.0.2** — `tsc` and jest pass, but `eslint .`\naborts: `typescript-eslint` (via eslint-config-next) hard-throws on TS 7\nand its peer range is `typescript <6.1.0` even at 8.70.0. Tracking:\ntypescript-eslint/typescript-eslint#10940 (TS ≥ 7.1 support).\n- **#634 eslint 10.10.0** — `eslint .` crashes with\n`contextOrFilename.getFilename is not a function`: `eslint-plugin-react`\n7.37.5 (latest, pulled by eslint-config-next even on the 16.4 canary)\nstill calls `context.getFilename()`, which ESLint 10 removed.\n\n## Verification\n\nRun locally on Node 24 with `npm ci --ignore-scripts && npx prisma\ngenerate` (same as CI):\n\n- `npm run check-types` ✅\n- `npm run lint` ✅ (0 errors, 19 pre-existing react-compiler warnings)\n- `npm run check-formatting` ✅\n- `npm test` ✅ 30 suites / 402 tests\n- `./scripts/e2e.sh` (builds the Docker image on `node:26-alpine`,\nmigrations + readiness healthcheck OK) — cold first run 44/45:\n`split-modes › splits an expense by percentage` timed out waiting for\nthe `groups.balances.list` response. Re-run on the same stack: that spec\n×4 → 28/28, full suite ×2 → 45/45 and 45/45. Treated as a cold-start\none-off (first run 1.1 min vs 26 s warm).\n\n## Notes\n\n- `ci.yml` and `e2e.yml` still pin `node-version: 24`; the comment there\nsays it matches the Dockerfile runtime, which is no longer true after\n#565. Harmless, but worth aligning to 26 in a follow-up.\n- Pre-existing and unrelated to these bumps, seen in the app logs: a\n`pg` DeprecationWarning (\"client.query() when the client is already\nexecuting a query\"), and `Failed to created recurringExpense` from\n`src/lib/api.ts:597` during the recurrence tests (which pass).\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nhttps://claude.ai/code/session_01HttzFywxJHLmXT7Xkp7DEX\n\n---------\n\nSigned-off-by: dependabot[bot] <support@github.com>\nCo-authored-by: dependabot[bot] <49699333+dependabot[bot]@users.noreply.github.com>",
          "timestamp": "2026-09-12T22:22:33-04:00",
          "tree_id": "a0518abc2d27e9f9f223d4f97c9645a3844bcdc1",
          "url": "https://github.com/spliit-app/spliit/commit/8c875ffb07838149ba6fb202d653f315459d0662"
        },
        "date": 1789266976871,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "list-groups:home p50",
            "value": 218.1,
            "unit": "ms"
          },
          {
            "name": "list-groups:home p95",
            "value": 270.79,
            "unit": "ms"
          },
          {
            "name": "view-group:first-page p50",
            "value": 15.18,
            "unit": "ms"
          },
          {
            "name": "view-group:first-page p95",
            "value": 17.23,
            "unit": "ms"
          },
          {
            "name": "view-group:deep-page p50",
            "value": 13.12,
            "unit": "ms"
          },
          {
            "name": "view-group:deep-page p95",
            "value": 18.4,
            "unit": "ms"
          },
          {
            "name": "view-group:search p50",
            "value": 11.42,
            "unit": "ms"
          },
          {
            "name": "view-group:search p95",
            "value": 12.8,
            "unit": "ms"
          },
          {
            "name": "view-group:balances p50",
            "value": 165.88,
            "unit": "ms"
          },
          {
            "name": "view-group:balances p95",
            "value": 185.2,
            "unit": "ms"
          },
          {
            "name": "view-expense:edit-form p50",
            "value": 7.22,
            "unit": "ms"
          },
          {
            "name": "view-expense:edit-form p95",
            "value": 8.16,
            "unit": "ms"
          }
        ]
      }
    ]
  }
}