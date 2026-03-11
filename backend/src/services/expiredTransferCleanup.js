import { apiConfig } from "../config.js";
import {
  deleteTransferRecord,
  ensureTransferStoreReady,
  listExpiredTransfers,
} from "../repositories/transferRepository.js";
import { removeStoredObject } from "./runtimeStorage.js";

let cleanupTimer = null;

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
