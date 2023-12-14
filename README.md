[<img alt="Spliit" height="60" src="https://github.com/scastiel/spliit2/blob/main/public/logo-with-text.png?raw=true" />](https://spliit.app)

Spliit is a free and open source alternative to Splitwise. I created it back in 2022 as a side project to learn the Go language, but rewrote it with Next.js since.

## Features

- [x] Create a group and share it with friends
- [x] Create expenses with description
- [x] Display group balances
- [x] Create reimbursement expenses
- [x] Progressive Web App
- [x] Select all/no participant for expenses

### Possible incoming features

- [ ] Tell the application who you are when opening a group [(#7)](https://github.com/scastiel/spliit2/issues/7)
- [ ] Ability to create recurring expenses [(#5)](https://github.com/scastiel/spliit2/issues/5)
- [ ] Ability to split expenses unevenly [(#6)](https://github.com/scastiel/spliit2/issues/6)

## Stack

- [Next.js](https://nextjs.org/) for the web application
- [TailwindCSS](https://tailwindcss.com/) for the styling
- [shadcn/UI](https://ui.shadcn.com/) for the UI components
- [Prisma](https://prisma.io) to access the database
- [Vercel](https://vercel.com/) for hosting (application and database)

## Contribute

The project is open to contributions. Feel free to open an issue or even a pull-request!

## Run locally

1. Clone the repository (or fork it if you intend to contribute)
2. `npm install`
3. Start a PostgreSQL server. You can run `./start-local-db.sh` if you don’t have a server already.
4. Copy the file `.env.example` as `.env`
5. `npm run dev`

## License

MIT, see [LICENSE](./LICENSE).
