import { createServer } from "./app.js";
import { config } from "./config.js";

const server = createServer();

server.listen(config.port, () => {
  console.log(`pricehistory-image-proxy listening on :${config.port}`);
});
