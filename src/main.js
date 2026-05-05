import { createServer } from "./app.js";
import { config } from "./config.js";
import { logError, logInfo } from "./logger.js";

const server = createServer();

server.listen(config.port, () => {
  logInfo("server listening", { port: config.port });
});

server.on("error", (error) => {
  logError("server failed", {
    message: error instanceof Error ? error.message : String(error)
  });
});
