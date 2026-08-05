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

## Morning market infographic

The `/api/cron/morning-report` job runs every day at `00:00 UTC`, which is
`08:00` in Asia/Taipei. It fetches the four major US indices, eight technology
stocks, Brent crude oil, the US 10-year Treasury yield, DXY and other market
indicators. OpenAI web search verifies the latest completed Taiwan index
futures night session and writes the Taiwan-market observations. The job then
generates a 2160×3840 Traditional Chinese infographic, uploads LINE-compatible
JPEGs to Vercel Blob, and pushes one image to the configured LINE group.

The morning job uses the same required and optional environment variables as
the evening infographic job. Its LINE retry key is stable per Taipei calendar
date, so retries do not create duplicate morning images. If LINE rejects a
push, the endpoint returns HTTP 502 while preserving the uploaded image and
preview URLs in the JSON response for diagnosis or manual delivery. Before
calling OpenAI, the job checks LINE's monthly quota and skips paid generation
when the quota is already exhausted.
