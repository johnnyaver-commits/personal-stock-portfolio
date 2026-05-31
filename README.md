# Personal Stock Portfolio

Next.js portfolio dashboard for family stock holdings. It supports multiple owners, Yahoo Finance quotes, Neon Postgres persistence, mobile-friendly views, editable holdings, and daily portfolio trend snapshots.

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Login Protection

The app is protected with HTTP Basic Auth. Set these environment variables in Vercel:

- `PORTFOLIO_AUTH_USERNAME`
- `PORTFOLIO_AUTH_PASSWORD`

If either value is missing, the site rejects requests instead of exposing portfolio data.

## Deployment

Deploy with Vercel. Configure Neon Postgres environment variables and the login variables above in the Vercel project settings.
