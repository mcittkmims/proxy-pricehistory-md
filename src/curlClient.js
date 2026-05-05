import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { config } from "./config.js";

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_HEADERS = [
  "accept-language: ro-RO,ro;q=0.9,en-US;q=0.7,en;q=0.6",
  "user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36"
];

let resolvedBinary = null;

function binaryCandidates() {
  const root = path.resolve(__dirname, "..");
  return [
    config.curlImpersonateBin,
    path.join(root, "bin", "curl_chrome116"),
    path.join(root, "bin", "curl_chrome110"),
    path.join(root, "bin", "curl_chrome107"),
    path.join(root, "bin", "curl-impersonate-chrome"),
    "curl_chrome116",
    "curl_chrome110",
    "curl_chrome107",
    "curl-impersonate-chrome",
    "curl"
  ].filter(Boolean);
}

async function resolveBinary() {
  if (resolvedBinary) {
    return resolvedBinary;
  }
  for (const candidate of binaryCandidates()) {
    try {
      if (candidate.includes(path.sep) && !fs.existsSync(candidate)) {
        continue;
      }
      await execFileAsync(candidate, ["--version"], { maxBuffer: 1024 * 1024 });
      resolvedBinary = candidate;
      return candidate;
    } catch {
      continue;
    }
  }
  throw new Error("No curl-compatible binary found for image proxy requests");
}

export function requiresCurl(hostname) {
  return config.curlDomains.some((domain) => (
    hostname === domain || hostname.endsWith(`.${domain}`)
  ));
}

export async function fetchImageViaCurl(url, maxBytes) {
  const binary = await resolveBinary();
  if (binary === "curl") {
    throw new Error(
      "Upstream requires curl-impersonate, but only plain curl is available. Set CURL_IMPERSONATE_BIN or bundle a curl_chrome binary."
    );
  }

  const args = [
    "-sSL",
    "--fail",
    url.toString(),
    "-H",
    "accept: image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    "-H",
    `referer: ${url.protocol}//${url.host}/`
  ];
  for (const header of DEFAULT_HEADERS) {
    args.push("-H", header);
  }

  const { stdout } = await execFileAsync(binary, args, {
    encoding: "buffer",
    maxBuffer: maxBytes + 1024 * 1024
  });

  if (stdout.byteLength > maxBytes) {
    throw new Error("Image exceeds maximum allowed size");
  }

  return Buffer.from(stdout);
}
