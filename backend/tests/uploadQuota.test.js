import assert from "node:assert/strict";
import test from "node:test";
import { apiConfig } from "../src/config.js";
import {
  ensureUploadQuotaAvailable,
  reserveUploadQuotaSlot,
  resetUploadQuotaState,
} from "../src/services/uploadQuota.js";

test("upload quota allows uploads up to the configured per-IP window limit", () => {
  resetUploadQuotaState();

  const reservations = Array.from({ length: apiConfig.uploadQuotaMaxPerIp }, () =>
    reserveUploadQuotaSlot("203.0.113.20"),
  );

  reservations.forEach((reservation) => reservation.commit());

  assert.throws(
    () => ensureUploadQuotaAvailable("203.0.113.20"),
    (error) => {
      assert.equal(error.statusCode, 429);
      assert.match(error.message, /Upload limit reached/i);
      return true;
    },
  );

  resetUploadQuotaState();
});

test("upload quota releases failed reservations without consuming the per-minute quota", () => {
  resetUploadQuotaState();

  const reservation = reserveUploadQuotaSlot("198.51.100.30");
  reservation.release();

  assert.doesNotThrow(() => ensureUploadQuotaAvailable("198.51.100.30"));

  resetUploadQuotaState();
});

test("upload quota resets after the configured rolling window", async () => {
  resetUploadQuotaState();

  const originalWindowMs = apiConfig.uploadQuotaWindowMs;
  const originalMaxPerIp = apiConfig.uploadQuotaMaxPerIp;

  apiConfig.uploadQuotaWindowMs = 20;
  apiConfig.uploadQuotaMaxPerIp = 1;

  try {
    const reservation = reserveUploadQuotaSlot("192.0.2.45");
    reservation.commit();

    assert.throws(() => ensureUploadQuotaAvailable("192.0.2.45"));

    await new Promise((resolve) => setTimeout(resolve, 30));

    assert.doesNotThrow(() => ensureUploadQuotaAvailable("192.0.2.45"));
  } finally {
    apiConfig.uploadQuotaWindowMs = originalWindowMs;
    apiConfig.uploadQuotaMaxPerIp = originalMaxPerIp;
    resetUploadQuotaState();
  }
});
