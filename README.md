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
ALLOWED_HOSTS=darwin.md,www.darwin.md,enter.online,www.enter.online,maximum.md,www.maximum.md,smart.md,www.smart.md,bomba.md,www.bomba.md,ultra.md,www.ultra.md,img.ultra.md
```

## Health

```http
GET /ping
GET /proxy?url=https%3A%2F%2Fenter.online%2Fimages%2Fexample.webp
```
