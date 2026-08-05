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

## Evening investment infographic

The `/api/cron/evening-report` job performs the production pipeline after the
Taiwan market close:

1. Fetch 009826, VT, QQQ, 0050, 006208 and market quote data.
2. Generate a Traditional Chinese report with current AI/semiconductor news.
3. Generate a 2160×3840 infographic with OpenAI.
4. Upload LINE-compatible original and preview JPEGs to public Vercel Blob.
5. Push one image message to the configured LINE group with a stable retry key.

Required Vercel environment variables:

- `OPENAI_API_KEY`
- `BLOB_READ_WRITE_TOKEN`
- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_GROUP_ID`
- `CRON_SECRET`

Optional model overrides: `OPENAI_TEXT_MODEL`, `OPENAI_IMAGE_MODEL`, and
`OPENAI_IMAGE_QUALITY`.
