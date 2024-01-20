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

If you want to contribute financially and help us keep the application free and without ads, you can also:

* 💜 [Sponsor me (Sebastien)](https://github.com/sponsors/scastiel), or
* 💙 [Make a small one-time donation](https://donate.stripe.com/28o3eh96G7hH8k89Ba).

## Run locally

1. Clone the repository (or fork it if you intend to contribute)
2. `npm install`
3. Start a PostgreSQL server. You can run `./scripts/start-local-db.sh` if you don’t have a server already.
4. Copy the file `.env.example` as `.env`
5. `npm run dev`

## Run in a container

1. Run `npm run build-image` to build the docker image from the Dockerfile
2. Copy the file `container.env.example` as `container.env`
3. Run `npm run start-container` to start the postgres and the spliit2 containers
4. You can access the app by browsing to http://localhost:3000

## License

MIT, see [LICENSE](./LICENSE).
