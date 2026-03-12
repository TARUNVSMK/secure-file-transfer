import { getCloudConfigMissing } from "../../../backend/src/config.js";
import { cleanupExpiredTransfers } from "../../../backend/src/services/expiredTransferCleanup.js";

export const config = {
  // Netlify requires scheduled function config to live in the deployed entry file.
  schedule: "* * * * *",
};

export default async () => {
  const missing = getCloudConfigMissing();

  if (missing.length) {
    console.error(`Scheduled cleanup skipped. Missing configuration: ${missing.join(", ")}`);
    return;
  }

  try {
    const deletedCount = await cleanupExpiredTransfers();
    console.log(`Scheduled cleanup completed. Deleted ${deletedCount} expired transfers.`);
  } catch (error) {
    console.error("Scheduled cleanup failed:", error);
    throw error;
  }
};
