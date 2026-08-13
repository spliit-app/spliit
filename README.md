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
  with a public and transparent ledger of what comes in and what it is spent on,
- 💜 [Sponsor me (Sebastien)](https://github.com/sponsors/scastiel), or
- 💙 [Make a small one-time donation](https://donate.stripe.com/28o3eh96G7hH8k89Ba).

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

## Run in a container

1. Run `npm run build-image` to build the docker image from the Dockerfile
2. Copy the file `container.env.example` as `container.env`
3. Run `npm run start-container` to start the postgres and the spliit2 containers
4. You can access the app by browsing to http://localhost:3000

## Run with Docker compose

This is a sample `docker-compose.yml` file that you can use to deploy this web app.

```yaml
name: spliit

services:
  app:
    image: ghcr.io/spliit-app/spliit:latest
    user: "1000:1000" # change to your user id or remove if you want root
    ports:
      - "8080:3000/tcp"
    environment:
      POSTGRES_PRISMA_URL: postgresql://spliit:spliit@database:5432/spliit
      POSTGRES_URL_NON_POOLING: postgresql://spliit:spliit@database:5432/spliit
    volumes:
      - ./app/cache:/usr/app/.next/cache
    depends_on:
      - database
    networks:
      - spliit

  database:
    image: postgres:17.3
    user: "1000:1000" # same as above
    environment:
      POSTGRES_USER: spliit
      POSTGRES_PASSWORD: spliit
      POSTGRES_DB: spliit
    volumes:
      - ./database/data:/var/lib/postgresql/data
    networks:
      - spliit

networks:
  spliit:
```

The web app will then be available on your host at http://localhost:8080/.

You can use named volumes in place of bind mounts if you prefer not having
data stored inside local directories.

## Health check

The application has a health check endpoint that can be used to check if the application is running and if the database is accessible.

- `GET /api/health/readiness` or `GET /api/health` - Check if the application is ready to serve requests, including database connectivity.
- `GET /api/health/liveness` - Check if the application is running, but not necessarily ready to serve requests.

## Opt-in features

### Expense documents

Spliit offers users to upload images (to an AWS S3 bucket) and attach them to expenses. To enable this feature:

- Follow the instructions in the _S3 bucket_ and _IAM user_ sections of [next-s3-upload](https://next-s3-upload.codingvalue.com/setup#s3-bucket) to create and set up an S3 bucket where images will be stored.
- Update your environments variables with appropriate values:

```.env
NEXT_PUBLIC_ENABLE_EXPENSE_DOCUMENTS=true
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

You can offer users to create expense by uploading a receipt. This feature relies on [OpenAI GPT-4 with Vision](https://platform.openai.com/docs/guides/vision) and a public S3 storage endpoint.

To enable the feature:

- You must enable expense documents feature as well (see section above). That might change in the future, but for now we need to store images to make receipt scanning work.
- Subscribe to OpenAI API and get access to GPT 4 with Vision (you might need to buy credits in advance).
- Update your environment variables with appropriate values:

```.env
NEXT_PUBLIC_ENABLE_RECEIPT_EXTRACT=true
OPENAI_API_KEY=XXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

### Deduce category from title

You can offer users to automatically deduce the expense category from the title. Since this feature relies on a OpenAI subscription, follow the signup instructions above and configure the following environment variables:

```.env
NEXT_PUBLIC_ENABLE_CATEGORY_EXTRACT=true
OPENAI_API_KEY=XXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

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
