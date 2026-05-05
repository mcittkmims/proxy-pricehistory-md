import { config } from "./config.js";

const IMAGE_ACCEPT =
  "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8";
const USER_AGENT =
  "Mozilla/5.0 (compatible; PriceHistoryImageProxy/1.0; +https://proxy.pricehistory.md)";

export function validateProxyUrl(inputUrl) {
  let url;
  try {
    url = new URL(String(inputUrl || "").trim());
  } catch {
    throw new Error("A valid absolute image URL is required");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only http and https image URLs are supported");
  }

  const hostname = url.hostname.toLowerCase();
  if (!isAllowedHost(hostname)) {
    throw new Error(`Host is not allowed: ${url.hostname}`);
  }

  return url;
}

export async function fetchImage(url) {
  const signal = AbortSignal.timeout(config.fetchTimeoutMs);
  const response = await fetch(url, {
    headers: {
      accept: IMAGE_ACCEPT,
      "accept-language": "ro-RO,ro;q=0.9,en-US;q=0.7,en;q=0.6",
      "user-agent": USER_AGENT,
      referer: `${url.protocol}//${url.host}/`
    },
    redirect: "follow",
    signal
  });

  if (!response.ok) {
    throw new Error(`Upstream returned ${response.status} ${response.statusText}`);
  }

  const contentLength = Number.parseInt(response.headers.get("content-length") || "", 10);
  if (Number.isFinite(contentLength) && contentLength > config.maxBytes) {
    throw new Error("Image exceeds maximum allowed size");
  }

  const contentType = response.headers.get("content-type") || inferContentType(url.pathname);
  if (!contentType.toLowerCase().startsWith("image/")) {
    throw new Error("Upstream response was not an image");
  }

  const body = Buffer.from(await response.arrayBuffer());
  if (body.byteLength > config.maxBytes) {
    throw new Error("Image exceeds maximum allowed size");
  }

  return {
    body,
    contentType
  };
}

function isAllowedHost(hostname) {
  return config.allowedDomains.some((domain) => (
    hostname === domain || hostname.endsWith(`.${domain}`)
  ));
}

function inferContentType(pathname) {
  const path = pathname.toLowerCase();
  if (path.endsWith(".webp")) {
    return "image/webp";
  }
  if (path.endsWith(".png")) {
    return "image/png";
  }
  if (path.endsWith(".gif")) {
    return "image/gif";
  }
  if (path.endsWith(".svg")) {
    return "image/svg+xml";
  }
  return "image/jpeg";
}
