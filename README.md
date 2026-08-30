[<img alt="Spliit" height="60" src="https://github.com/spliit-app/spliit/blob/main/public/logo-with-text.png?raw=true" />](https://spliit.app)

Spliit is a free and open source alternative to Splitwise. You can either use the official instance at [Spliit.app](https://spliit.app), or deploy your own instance:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fspliit-app%2Fspliit&project-name=my-spliit-instance&repository-name=my-spliit-instance&stores=%5B%7B%22type%22%3A%22postgres%22%7D%5D&)

## Features

- [x] Create a group and share it with friends
- [x] Create expenses with description
- [x] Display group balances
- [x] Create reimbursement expenses
- [x] Progressive Web App
- [x] Select all/no participant for expenses
- [x] Split expenses unevenly [(#6)](https://github.com/spliit-app/spliit/issues/6)
- [x] Mark a group as favorite [(#29)](https://github.com/spliit-app/spliit/issues/29)
- [x] Tell the application who you are when opening a group [(#7)](https://github.com/spliit-app/spliit/issues/7)
- [x] Assign a category to expenses [(#35)](https://github.com/spliit-app/spliit/issues/35)
- [x] Search for expenses in a group [(#51)](https://github.com/spliit-app/spliit/issues/51)
- [x] Upload and attach images to expenses [(#63)](https://github.com/spliit-app/spliit/issues/63)
- [x] Create expense by scanning a receipt [(#23)](https://github.com/spliit-app/spliit/issues/23)

### Possible incoming features

- [ ] Ability to create recurring expenses [(#5)](https://github.com/spliit-app/spliit/issues/5)
- [ ] Import expenses from Splitwise [(#22)](https://github.com/spliit-app/spliit/issues/22)

## Stack

- [Next.js](https://nextjs.org/) for the web application
- [TailwindCSS](https://tailwindcss.com/) for the styling
- [shadcn/UI](https://ui.shadcn.com/) for the UI components
- [Prisma](https://prisma.io) to access the database
- [Vercel](https://vercel.com/) for hosting (application and database)

## Contribute

The project is open to contributions. Feel free to open an issue or even a pull-request! 
Join the discussion in [the Spliit Discord server](https://discord.gg/YSyVXbwvSY).

### Contribute financially

Spliit is free, open source, and has no ads. Hosting, database and API costs are
paid for by donations. If you want to help keep it that way, you can:

- 🧡 [Support us on Open Collective](https://opencollective.com/spliit) — recurring or one-time,
  with a public and transparent ledger of what comes in and what it is spent on, or
- 💜 [Sponsor me (Sebastien)](https://github.com/sponsors/scastiel).

Contributions of any size are appreciated, and so is simply telling people about
the project.

### Translation

The project's translations are managed using [our Weblate project](https://hosted.weblate.org/projects/spliit/spliit/). 
You can easily add missing translations to the project or even add a new language!
Here is the current state of translation:

<a href="https://hosted.weblate.org/engage/spliit/">
<img src="https://hosted.weblate.org/widget/spliit/spliit/multi-auto.svg" alt="Translation status" />
</a>

## Run locally

1. Clone the repository (or fork it if you intend to contribute)
2. Start a PostgreSQL server. You can run `./scripts/start-local-db.sh` if you don’t have a server already.
3. Copy the file `.env.example` as `.env`
4. Run `npm install` to install dependencies. This will also apply database migrations and update Prisma Client.
5. Run `npm run dev` to start the development server

## End-to-end tests

The Playwright suite in `e2e/` drives a real browser against the app running in
Docker, so it exercises the same image users deploy. It needs Docker and a free
port 3000, and nothing else — the stack builds itself from your checkout and
throws its database away afterwards.

```sh
npm run e2e
```

That builds the image, starts app + PostgreSQL from `compose.e2e.yaml`, waits
for `/api/health/readiness`, runs the suite and tears everything down. It never
touches your development stack or `./postgres-data`.

While writing tests it is quicker to keep the stack up:

```sh
npm run e2e:up                  # build and start, then leave it running
npm run e2e:test -- --ui        # iterate (also --headed, --grep, --debug)
npm run e2e:report              # open the HTML report of the last run
npm run e2e:down                # stop and delete the test database
```

`--ui` opens Playwright's UI mode, where you can pick tests, watch them run and
step through a trace. It does not start the stack itself, so run `npm run e2e:up`
first.

If port 3000 is already taken — by `npm run dev`, for instance — set
`E2E_HOST_PORT` on every command of the session, including the test run:

```sh
E2E_HOST_PORT=3100 npm run e2e             # one-shot
E2E_HOST_PORT=3100 npm run e2e:up          # or, for the iteration loop
E2E_HOST_PORT=3100 npm run e2e:test -- --ui
E2E_HOST_PORT=3100 npm run e2e:down
```

The same suite runs in GitHub Actions from the **E2E** workflow, which can be
triggered manually and runs automatically on release tags.

## Administration & User Management

Spliit includes role-based access control with three user tiers:
- **`sync_users`**: Default tier upon signing in via OAuth. Allows syncing groups across devices.
- **`group_creators`**: Allows creating new groups and syncing them.
- **`admin`**: Full access to the Administration Dashboard (`/admin`), platform metrics, and user tier promotion/demotion.

### Promoting a User to Administrator (Bootstrap CLI)

After a user signs in at least once via OAuth (so their user record is created in the database), promote them to administrator:

**On your host machine:**
```sh
node scripts/make-admin.mjs your-email@example.com
```
*(or `npm run make-admin your-email@example.com`)*

**Inside the Docker container:**
```sh
docker compose exec app node scripts/make-admin.mjs your-email@example.com
```

Once promoted, log in (or refresh the page) to access the **Admin Dashboard** (`/admin`) from the user profile dropdown.

## Run with Docker Compose

1. Copy `.env.example` to `.env`:
   ```sh
   cp .env.example .env
   ```
2. Configure your desired `PORT`, `AUTH_SECRET`, and OAuth keys in `.env`.
3. Start the container:
   ```sh
   ./redeploy.sh
   # or: docker compose up -d --build
   ```
4. Access the app at `http://localhost:3000` (or your configured `PORT`). SQLite data is automatically persisted in `./spliit-data/spliit.db`.

## Health check

The application has a health check endpoint that can be used to check if the application is running and if the database is accessible.

- `GET /api/health/readiness` or `GET /api/health` - Check if the application is ready to serve requests, including database connectivity.
- `GET /api/health/liveness` - Check if the application is running, but not necessarily ready to serve requests.

## Configuration

Every variable below is read at runtime. For a container deployment, set them in
`container.env` or pass them with `docker run -e`; no rebuild is required, which
means the published image can be configured by whoever runs it.

### Application URL

Set `BASE_URL` to the public URL your instance is reachable at. It is used for
metadata, the sitemap, `robots.txt`, and to accept server actions sent to that
host.

```.env
BASE_URL=https://spliit.example.com
```

Defaults to `http://localhost:3000`.

### Session Duration

Set `AUTH_SESSION_MAX_AGE_DAYS` to control how many days users stay logged in across their devices before needing to re-authenticate. Defaults to `365` days (1 year).

```.env
AUTH_SESSION_MAX_AGE_DAYS=365
```

### Default currency

Set `DEFAULT_CURRENCY_CODE` to pre-select a currency on the new-group form.

```.env
DEFAULT_CURRENCY_CODE=EUR
```

Defaults to `USD`.

### Migrating from the `NEXT_PUBLIC_*` variables

Earlier versions used `NEXT_PUBLIC_`-prefixed variables for the settings above
and for the opt-in feature flags below. Next.js **inlines those into the app at
build time**, so in a prebuilt image — like the published one — they are frozen
at whatever the release build used and setting them at runtime does nothing. The
runtime variables replace them:

| Old (build-time)                       | New (runtime)              |
| -------------------------------------- | -------------------------- |
| `NEXT_PUBLIC_BASE_URL`                 | `BASE_URL`                 |
| `NEXT_PUBLIC_DEFAULT_CURRENCY_CODE`    | `DEFAULT_CURRENCY_CODE`    |
| `NEXT_PUBLIC_ENABLE_EXPENSE_DOCUMENTS` | `ENABLE_EXPENSE_DOCUMENTS` |
| `NEXT_PUBLIC_ENABLE_RECEIPT_EXTRACT`   | `ENABLE_RECEIPT_EXTRACT`   |
| `NEXT_PUBLIC_ENABLE_CATEGORY_EXTRACT`  | `ENABLE_CATEGORY_EXTRACT`  |

**The old variables still work** — the runtime variant simply takes precedence
when both are set, so there is nothing you have to change immediately. They
remain the right choice if you build your own image and want a setting baked in.
To migrate, drop the `NEXT_PUBLIC_` prefix and set the variable wherever your
container gets its environment.

## Opt-in features

### Expense documents

Spliit offers users to upload images (to an AWS S3 bucket) and attach them to expenses. To enable this feature:

- Follow the instructions in the _S3 bucket_ and _IAM user_ sections of [next-s3-upload](https://next-s3-upload.codingvalue.com/setup#s3-bucket) to create and set up an S3 bucket where images will be stored.
- Update your environments variables with appropriate values:

```.env
ENABLE_EXPENSE_DOCUMENTS=true
S3_UPLOAD_KEY=AAAAAAAAAAAAAAAAAAAA
S3_UPLOAD_SECRET=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
S3_UPLOAD_BUCKET=name-of-s3-bucket
S3_UPLOAD_REGION=us-east-1
```

You can also use other S3 providers by providing a custom endpoint:

```.env
S3_UPLOAD_ENDPOINT=http://localhost:9000
```

### Create expense from receipt

You can offer users to create expense by uploading a receipt. This feature relies on a [vision-capable OpenAI model](https://platform.openai.com/docs/guides/vision) and a public S3 storage endpoint.

To enable the feature:

- You must enable expense documents feature as well (see section above). That might change in the future, but for now we need to store images to make receipt scanning work.
- Subscribe to OpenAI API and get access to a vision-capable model (you might need to buy credits in advance).
- Update your environment variables with appropriate values:

```.env
ENABLE_RECEIPT_EXTRACT=true
OPENAI_API_KEY=XXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

The model defaults to `gpt-5-nano` and can be changed with the optional `OPENAI_MODEL_RECEIPT_EXTRACT` variable — a larger model reads poor-quality photos more reliably, at a higher price per scan.

### Deduce category from title

You can offer users to automatically deduce the expense category from the title. Since this feature relies on a OpenAI subscription, follow the signup instructions above and configure the following environment variables:

```.env
ENABLE_CATEGORY_EXTRACT=true
OPENAI_API_KEY=XXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

The model defaults to `gpt-5-nano` and can be changed with the optional `OPENAI_MODEL_CATEGORY_EXTRACT` variable.

### Using another OpenAI-compatible provider

Both AI features above talk to the official OpenAI API by default. Set the optional `OPENAI_BASE_URL` variable to point them at a self-hosted or alternative provider instead:

```.env
OPENAI_BASE_URL=http://localhost:11434/v1
OPENAI_MODEL_RECEIPT_EXTRACT=name-of-a-vision-model
OPENAI_MODEL_CATEGORY_EXTRACT=name-of-a-text-model
```

Whichever provider you choose has to support the `json_schema` response format ([structured outputs](https://platform.openai.com/docs/guides/structured-outputs)), and the receipt feature additionally needs image input. If a response does not match the expected schema, the app reports that nothing could be extracted rather than filling the form with guesses.

If your environment file was created on Windows, make sure it uses **LF line endings**. A trailing carriage return makes `OPENAI_API_KEY` fail authentication and silently switches feature flags off.

### Analytics

Spliit can report anonymous usage events to an analytics service. **It is disabled by default**: nothing is loaded and nothing is sent unless you select a provider.

Select one with `ANALYTICS_PROVIDER`. The variables are read on the server, so a single Docker image can be configured when the container starts.

#### `console` — see what would be reported

Logs every event to the browser console and sends nothing anywhere. Useful while developing, and the shortest example of what a provider looks like.

```.env
ANALYTICS_PROVIDER=console
```

#### `plausible`

Reports to [Plausible](https://plausible.io), a privacy-friendly, cookie-free analytics service. No extra dependency is installed: the provider is a script tag and a function call.

```.env
ANALYTICS_PROVIDER=plausible
PLAUSIBLE_DOMAIN=your-domain.com
```

For a self-hosted Plausible instance, point at it with `PLAUSIBLE_HOST`:

```.env
PLAUSIBLE_HOST=https://plausible.your-domain.com
```

Ad blockers drop requests to known analytics hosts. To avoid that, serve the script and the event endpoint from your own origin by adding [rewrites](https://nextjs.org/docs/app/api-reference/config/next-config-js/rewrites) in `next.config.mjs` and pointing the provider at them:

```.env
PLAUSIBLE_SCRIPT_URL=/js/script.manual.js
PLAUSIBLE_API_URL=/proxy/api/event
```

#### What is reported

Pageviews for a handful of pages, and one event per significant action: creating and updating a group, creating, updating and deleting an expense, attaching a document, scanning a receipt, and exporting expenses.

**Group and expense IDs are never sent.** They are the capability to read someone's group, so `/groups/<id>/expenses` is reported as `/groups/[groupId]/expenses`. Anonymization happens in one place, `anonymizePath` in `src/lib/analytics/`, between the call sites and every provider, and the event types forbid properties that are not explicitly declared — so leaking an ID is a compile error rather than a review question.

Pages are tracked explicitly, with `<TrackPage path="…" />`. A new route reports nothing until someone adds it, which keeps that a deliberate decision.

This is unrelated to the group activity log (the _Activity_ tab), which is stored in your own database and is a product feature rather than analytics.

#### Adding a provider

Providers live in `src/lib/analytics/providers/`. Copy `console.tsx`, then register the new one in three places: `provider-ids.ts`, `registry.ts`, and `config.ts` (to map its environment variables to options). The last two are type-checked against the first, so `npm run check-types` tells you exactly what is missing.

A provider supplies a transport — where events go — and optionally a `Script` component if it needs to load an SDK.

## License

MIT, see [LICENSE](./LICENSE).
