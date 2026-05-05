import { config } from "./config.js";
import { fetchImageViaCurl, requiresCurl } from "./curlClient.js";

const IMAGE_ACCEPT =
  "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8";
const USER_AGENT = "Mozilla/5.0 PriceHistoryImageProxy/1.0";

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

  return url;
}

export async function fetchImage(url) {
  if (requiresCurl(url.hostname.toLowerCase())) {
    const body = await fetchImageViaCurl(url, config.maxBytes);
    return {
      body,
      contentType: sniffImageContentType(body, url.pathname) || inferContentType(url.pathname)
    };
  }

  const signal = AbortSignal.timeout(config.fetchTimeoutMs);
  const response = await fetch(url, {
    headers: {
      accept: IMAGE_ACCEPT,
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

  const body = Buffer.from(await response.arrayBuffer());
  if (body.byteLength > config.maxBytes) {
    throw new Error("Image exceeds maximum allowed size");
  }

  const contentType = normalizeImageContentType(
    response.headers.get("content-type"),
    body,
    url.pathname
  );
  if (!contentType) {
    throw new Error("Upstream response was not an image");
  }

  return {
    body,
    contentType
  };
}

function normalizeImageContentType(headerValue, body, pathname) {
  const raw = (headerValue || "").split(";")[0].trim().toLowerCase();
  if (raw.startsWith("image/")) {
    return raw;
  }

  if (!raw || raw === "application/octet-stream" || raw === "binary/octet-stream") {
    return sniffImageContentType(body, pathname) || inferContentType(pathname);
  }

  return null;
}

function sniffImageContentType(body, pathname) {
  if (body.byteLength >= 12) {
    const header = body.subarray(0, 12);
    const riff = header.subarray(0, 4).toString("ascii");
    const webp = header.subarray(8, 12).toString("ascii");
    if (riff === "RIFF" && webp === "WEBP") {
      return "image/webp";
    }
  }
  if (body.byteLength >= 8) {
    const png = body.subarray(0, 8);
    if (png.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
      return "image/png";
    }
  }
  if (body.byteLength >= 3) {
    const jpeg = body.subarray(0, 3);
    if (jpeg.equals(Buffer.from([0xff, 0xd8, 0xff]))) {
      return "image/jpeg";
    }
  }
  if (body.byteLength >= 6) {
    const gif = body.subarray(0, 6).toString("ascii");
    if (gif === "GIF87a" || gif === "GIF89a") {
      return "image/gif";
    }
  }
  const textStart = body.subarray(0, Math.min(body.byteLength, 256)).toString("utf8").trimStart();
  if (textStart.startsWith("<svg") || textStart.startsWith("<?xml")) {
    return "image/svg+xml";
  }
  const inferred = inferContentType(pathname);
  return inferred !== "image/jpeg" || pathname.toLowerCase().endsWith(".jpg") || pathname.toLowerCase().endsWith(".jpeg")
    ? inferred
    : null;
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
