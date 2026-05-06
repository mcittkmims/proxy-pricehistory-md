const parseNumber = (value, fallback) => {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const config = {
  port: parseNumber(process.env.PORT, 8081),
  cacheControl: process.env.CACHE_CONTROL || "public, max-age=86400, stale-while-revalidate=604800",
  fetchTimeoutMs: parseNumber(process.env.FETCH_TIMEOUT_MS, 10000),
  maxBytes: parseNumber(process.env.MAX_BYTES, 5 * 1024 * 1024)
};
