import http from "node:http";
import https from "node:https";
import { config } from "./config.js";

const IMAGE_ACCEPT =
  "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8";
const USER_AGENT = "Mozilla/5.0 PriceHistoryImageProxy/1.0";
const DEFAULT_HTTPS_AGENT = new https.Agent();
const ULTRA_CDN_INSECURE_HTTPS_AGENT = new https.Agent({
  // Ultra's CDN currently serves an incomplete certificate chain.
  rejectUnauthorized: false
});

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
  const response = await requestImage(url);

  const contentType = normalizeImageContentType(response.contentType, response.body, url.pathname);
  if (!contentType) {
    throw new Error("Upstream response was not an image");
  }

  return {
    body: response.body,
    contentType
  };
}

function requestImage(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) {
      reject(new Error("Too many upstream redirects"));
      return;
    }

    const transport = url.protocol === "https:" ? https : http;
    const request = transport.request(url, {
      method: "GET",
      headers: {
        accept: IMAGE_ACCEPT,
        "user-agent": USER_AGENT,
        referer: `${url.protocol}//${url.host}/`
      },
      ...(url.protocol === "https:" ? { agent: getHttpsAgent(url.hostname) } : {})
    }, (response) => {
      const statusCode = response.statusCode ?? 502;

      if ([301, 302, 303, 307, 308].includes(statusCode)) {
        const location = response.headers.location;
        response.resume();
        if (!location) {
          reject(new Error(`Upstream redirected without a location header (${statusCode})`));
          return;
        }
        requestImage(new URL(location, url), redirectCount + 1).then(resolve).catch(reject);
        return;
      }

      if (statusCode < 200 || statusCode >= 300) {
        response.resume();
        reject(new Error(`Upstream returned ${statusCode} ${response.statusMessage || ""}`.trim()));
        return;
      }

      const contentLength = Number.parseInt(String(response.headers["content-length"] || ""), 10);
      if (Number.isFinite(contentLength) && contentLength > config.maxBytes) {
        response.resume();
        reject(new Error("Image exceeds maximum allowed size"));
        return;
      }

      const chunks = [];
      let size = 0;
      response.on("data", (chunk) => {
        size += chunk.length;
        if (size > config.maxBytes) {
          request.destroy(new Error("Image exceeds maximum allowed size"));
          return;
        }
        chunks.push(chunk);
      });
      response.on("end", () => {
        resolve({
          body: Buffer.concat(chunks),
          contentType: Array.isArray(response.headers["content-type"])
            ? response.headers["content-type"][0]
            : response.headers["content-type"] || ""
        });
      });
      response.on("error", reject);
    });

    request.setTimeout(config.fetchTimeoutMs, () => {
      request.destroy(new Error("Upstream request timed out"));
    });
    request.on("error", reject);
    request.end();
  });
}

function getHttpsAgent(hostname) {
  return hostname.toLowerCase() === "cdn.ultra.md"
    ? ULTRA_CDN_INSECURE_HTTPS_AGENT
    : DEFAULT_HTTPS_AGENT;
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
