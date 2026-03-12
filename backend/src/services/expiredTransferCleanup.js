import { apiConfig } from "../config.js";
import {
  deleteTransferRecord,
  ensureTransferStoreReady,
  listExpiredTransfers,
} from "../repositories/transferRepository.js";
import { removeStoredObject } from "./runtimeStorage.js";

let cleanupTimer = null;
let cleanupInFlight = null;
let lastCleanupStartedAt = 0;

export const purgeExpiredTransfer = async (transfer) => {
  await removeStoredObject(transfer.objectKey);
  await deleteTransferRecord(transfer.shareToken);
};

export const cleanupExpiredTransfers = async () => {
  await ensureTransferStoreReady();

  const expiredTransfers = await listExpiredTransfers(new Date());
  let deletedCount = 0;

  for (const transfer of expiredTransfers) {
    try {
      await purgeExpiredTransfer(transfer);
      deletedCount += 1;
    } catch (error) {
      console.error(`Failed to purge expired transfer ${transfer.shareToken}:`, error.message);
    }
  }

  return deletedCount;
};

export const runExpiredTransferCleanupIfDue = async ({
  now = Date.now(),
  runner = cleanupExpiredTransfers,
} = {}) => {
  if (cleanupInFlight) {
    return cleanupInFlight;
  }

  const cleanupStartedAt =
    now instanceof Date ? now.getTime() : Number.isFinite(Number(now)) ? Number(now) : Date.now();
  const intervalMs = apiConfig.cleanupIntervalSeconds * 1000;

  if (lastCleanupStartedAt && cleanupStartedAt - lastCleanupStartedAt < intervalMs) {
    return null;
  }

  lastCleanupStartedAt = cleanupStartedAt;
  cleanupInFlight = Promise.resolve()
    .then(() => runner(new Date(cleanupStartedAt)))
    .catch((error) => {
      lastCleanupStartedAt = 0;
      throw error;
    })
    .finally(() => {
      cleanupInFlight = null;
    });

  return cleanupInFlight;
};

export const startExpiredTransferCleanup = () => {
  if (cleanupTimer) {
    return;
  }

  const intervalMs = apiConfig.cleanupIntervalSeconds * 1000;
  cleanupTimer = setInterval(() => {
    cleanupExpiredTransfers().catch((error) => {
      console.error("Expired transfer cleanup failed:", error.message);
    });
  }, intervalMs);

  cleanupTimer.unref?.();
};

export const resetExpiredTransferCleanupState = () => {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }

  cleanupInFlight = null;
  lastCleanupStartedAt = 0;
};
