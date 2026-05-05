import http from "node:http";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { logError, logWarn } from "./logger.js";
import { fetchImage, validateProxyUrl } from "./proxy.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const INDEX_HTML = readFileSync(path.join(__dirname, "..", "public", "index.html"));

function json(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "access-control-allow-origin": "*"
  });
  res.end(body);
}

export function createServer() {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url || "/", "http://localhost");

    if (req.method === "GET" && url.pathname === "/") {
      res.writeHead(200, {
        "content-type": "text/html; charset=utf-8",
        "content-length": INDEX_HTML.byteLength
      });
      res.end(INDEX_HTML);
      return;
    }

    if (req.method === "GET" && url.pathname === "/ping") {
      return json(res, 200, { status: "ok" });
    }

    if (req.method !== "GET" || url.pathname !== "/proxy") {
      return json(res, 404, { detail: `Route not found: ${req.method} ${url.pathname}` });
    }

    const inputUrl = url.searchParams.get("url");
    if (!inputUrl) {
      logWarn("proxy rejected: missing url", { path: url.pathname });
      return json(res, 400, { detail: "Query parameter url is required" });
    }

    let imageUrl;
    try {
      imageUrl = validateProxyUrl(inputUrl);
    } catch (error) {
      logWarn("proxy rejected: invalid url", {
        url: inputUrl,
        message: error instanceof Error ? error.message : String(error)
      });
      return json(res, 400, { detail: error.message });
    }

    try {
      const image = await fetchImage(imageUrl);
      res.writeHead(200, {
        "content-type": image.contentType,
        "content-length": image.body.byteLength,
        "cache-control": config.cacheControl,
        "access-control-allow-origin": "*",
        "x-content-type-options": "nosniff"
      });
      res.end(image.body);
    } catch (error) {
      logError("proxy fetch failed", {
        url: imageUrl.toString(),
        message: error instanceof Error ? error.message : String(error)
      });
      return json(res, 502, { detail: error.message });
    }
  });
}
