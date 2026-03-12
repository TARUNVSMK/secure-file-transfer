import assert from "node:assert/strict";
import test from "node:test";
import { apiConfig } from "../src/config.js";
import {
  resetExpiredTransferCleanupState,
  runExpiredTransferCleanupIfDue,
} from "../src/services/expiredTransferCleanup.js";

test("best-effort cleanup runs at most once per configured interval", async () => {
  resetExpiredTransferCleanupState();

  const originalIntervalSeconds = apiConfig.cleanupIntervalSeconds;
  apiConfig.cleanupIntervalSeconds = 60;

  let callCount = 0;

  try {
    const firstResult = await runExpiredTransferCleanupIfDue({
      now: new Date("2026-03-12T00:00:00.000Z"),
      runner: async () => {
        callCount += 1;
        return 2;
      },
    });
    const skippedResult = await runExpiredTransferCleanupIfDue({
      now: new Date("2026-03-12T00:00:30.000Z"),
      runner: async () => {
        callCount += 1;
        return 99;
      },
    });
    const secondResult = await runExpiredTransferCleanupIfDue({
      now: new Date("2026-03-12T00:01:01.000Z"),
      runner: async () => {
        callCount += 1;
        return 3;
      },
    });

    assert.equal(firstResult, 2);
    assert.equal(skippedResult, null);
    assert.equal(secondResult, 3);
    assert.equal(callCount, 2);
  } finally {
    apiConfig.cleanupIntervalSeconds = originalIntervalSeconds;
    resetExpiredTransferCleanupState();
  }
});

test("best-effort cleanup shares one in-flight run across concurrent calls", async () => {
  resetExpiredTransferCleanupState();

  const originalIntervalSeconds = apiConfig.cleanupIntervalSeconds;
  apiConfig.cleanupIntervalSeconds = 60;

  let callCount = 0;
  let resolveCleanup;

  try {
    const runner = () =>
      new Promise((resolve) => {
        callCount += 1;
        resolveCleanup = resolve;
      });

    const firstPromise = runExpiredTransferCleanupIfDue({
      now: new Date("2026-03-12T00:05:00.000Z"),
      runner,
    });
    const secondPromise = runExpiredTransferCleanupIfDue({
      now: new Date("2026-03-12T00:05:00.000Z"),
      runner,
    });

    await Promise.resolve();

    assert.equal(callCount, 1);

    resolveCleanup(7);

    assert.equal(await firstPromise, 7);
    assert.equal(await secondPromise, 7);
  } finally {
    apiConfig.cleanupIntervalSeconds = originalIntervalSeconds;
    resetExpiredTransferCleanupState();
  }
});

test("best-effort cleanup retries immediately after a failed run", async () => {
  resetExpiredTransferCleanupState();

  const originalIntervalSeconds = apiConfig.cleanupIntervalSeconds;
  apiConfig.cleanupIntervalSeconds = 60;

  let callCount = 0;

  try {
    await assert.rejects(() =>
      runExpiredTransferCleanupIfDue({
        now: new Date("2026-03-12T00:10:00.000Z"),
        runner: async () => {
          callCount += 1;
          throw new Error("cleanup failed");
        },
      }),
    );

    const retryResult = await runExpiredTransferCleanupIfDue({
      now: new Date("2026-03-12T00:10:00.000Z"),
      runner: async () => {
        callCount += 1;
        return 1;
      },
    });

    assert.equal(retryResult, 1);
    assert.equal(callCount, 2);
  } finally {
    apiConfig.cleanupIntervalSeconds = originalIntervalSeconds;
    resetExpiredTransferCleanupState();
  }
});
