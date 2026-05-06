import test from "node:test";
import assert from "node:assert/strict";
import { validateProxyUrl } from "../src/proxy.js";

test("validateProxyUrl accepts supported store hosts", () => {
  assert.equal(
    validateProxyUrl("https://enter.online/images/example.webp").hostname,
    "enter.online"
  );
  assert.equal(
    validateProxyUrl("https://img.ultra.md/product/example.jpg").hostname,
    "img.ultra.md"
  );
  assert.equal(
    validateProxyUrl("https://cdn.maximum.md/images/example.jpg").hostname,
    "cdn.maximum.md"
  );
  assert.equal(
    validateProxyUrl("https://example.com/image.jpg").hostname,
    "example.com"
  );
});

test("validateProxyUrl rejects invalid schemes", () => {
  assert.throws(
    () => validateProxyUrl("file:///tmp/image.jpg"),
    /Only http and https/
  );
});
