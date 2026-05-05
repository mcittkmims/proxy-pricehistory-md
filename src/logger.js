import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOG_DIR = path.join(__dirname, "..", "logs");

function ensureLogDir() {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function logFilePath(date = new Date()) {
  const day = date.toISOString().slice(0, 10);
  return path.join(LOG_DIR, `app-${day}.log`);
}

function serializeMeta(meta) {
  if (!meta || Object.keys(meta).length === 0) {
    return "";
  }
  return ` ${JSON.stringify(meta)}`;
}

function write(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] [${level}] ${message}${serializeMeta(meta)}\n`;
  ensureLogDir();
  fs.appendFileSync(logFilePath(), line, "utf8");
  if (level === "ERROR") {
    console.error(line.trimEnd());
    return;
  }
  console.log(line.trimEnd());
}

export function logInfo(message, meta = {}) {
  write("INFO", message, meta);
}

export function logWarn(message, meta = {}) {
  write("WARN", message, meta);
}

export function logError(message, meta = {}) {
  write("ERROR", message, meta);
}
