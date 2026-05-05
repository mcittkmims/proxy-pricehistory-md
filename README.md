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
CURL_IMPERSONATE_BIN=
CURL_DOMAINS=
```

If a store image host is protected by Cloudflare or similar bot checks, plain Node `fetch` may be rejected. In that case, point `CURL_IMPERSONATE_BIN` at a `curl-impersonate` binary and add that store domain to `CURL_DOMAINS`. By default, the proxy does not use curl-impersonate for any host.

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
