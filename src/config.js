const DEFAULT_ALLOWED_HOSTS = [
  "darwin.md",
  "www.darwin.md",
  "enter.online",
  "www.enter.online",
  "maximum.md",
  "www.maximum.md",
  "smart.md",
  "www.smart.md",
  "bomba.md",
  "www.bomba.md",
  "ultra.md",
  "www.ultra.md",
  "img.ultra.md"
];

const parseList = (value, fallback) => {
  const items = String(value || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return items.length ? items : fallback;
};

const parseNumber = (value, fallback) => {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const config = {
  port: parseNumber(process.env.PORT, 8081),
  cacheControl: process.env.CACHE_CONTROL || "public, max-age=86400, stale-while-revalidate=604800",
  fetchTimeoutMs: parseNumber(process.env.FETCH_TIMEOUT_MS, 10000),
  maxBytes: parseNumber(process.env.MAX_BYTES, 5 * 1024 * 1024),
  allowedHosts: parseList(process.env.ALLOWED_HOSTS, DEFAULT_ALLOWED_HOSTS)
};
