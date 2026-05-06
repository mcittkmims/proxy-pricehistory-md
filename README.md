# pricehistory-image-proxy

Tiny standalone image proxy for `proxy.pricehistory.md`.

It does one job:
- accepts `GET /proxy?url=...`
- fetches the upstream image server-side
- returns the image with cache headers

## Why it exists

Some store image hosts behave differently by geography. This service can be deployed in Moldova and used by the production frontend, while local frontend development continues to load images directly.

## Run

```bash
npm start
```

## Configuration

```bash
PORT=8081
CACHE_CONTROL=public, max-age=86400, stale-while-revalidate=604800
FETCH_TIMEOUT_MS=10000
MAX_BYTES=5242880
```

The proxy uses Node's built-in `http` / `https` client for upstream image requests.
It also includes one targeted workaround for `cdn.ultra.md`, because that host currently serves an incomplete TLS certificate chain.

## Health

```http
GET /ping
GET /proxy?url=https%3A%2F%2Fenter.online%2Fimages%2Fexample.webp
```

## Logs

The app writes daily log files to `logs/app-YYYY-MM-DD.log`.

It records:
- server startup and fatal server errors
- rejected proxy requests
- upstream proxy fetch failures
