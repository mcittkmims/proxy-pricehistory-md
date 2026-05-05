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
  curlImpersonateBin: process.env.CURL_IMPERSONATE_BIN || "",
  curlDomains: parseList(process.env.CURL_DOMAINS, ["bomba.md"])
};
