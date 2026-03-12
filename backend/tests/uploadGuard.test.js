import assert from "node:assert/strict";
import test from "node:test";
import { apiConfig } from "../src/config.js";
import { acquireUploadSlot, resetUploadGuardState } from "../src/services/uploadGuard.js";

test("upload guard allows two simultaneous uploads per IP", () => {
  resetUploadGuardState();

  const releaseOne = acquireUploadSlot("203.0.113.10");
  const releaseTwo = acquireUploadSlot("203.0.113.10");

  assert.equal(typeof releaseOne, "function");
  assert.equal(typeof releaseTwo, "function");

  releaseTwo();
  releaseOne();
  resetUploadGuardState();
});

test("upload guard blocks a third simultaneous upload and enforces cooldown", () => {
  resetUploadGuardState();

  const releaseOne = acquireUploadSlot("198.51.100.7");
  const releaseTwo = acquireUploadSlot("198.51.100.7");

  assert.throws(
    () => acquireUploadSlot("198.51.100.7"),
    (error) => {
      assert.equal(error.statusCode, 429);
      assert.match(error.message, new RegExp(`${apiConfig.concurrentUploadLimitPerIp}`));
      return true;
    },
  );

  releaseTwo();
  releaseOne();

  assert.throws(
    () => acquireUploadSlot("198.51.100.7"),
    (error) => {
      assert.equal(error.statusCode, 429);
      assert.match(error.message, /Please wait/i);
      return true;
    },
  );

  resetUploadGuardState();
});
