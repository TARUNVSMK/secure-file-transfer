import { mkdir } from "node:fs/promises";
import app from "./app.js";
import { apiConfig, getCloudConfigMissing, getRuntimeMode } from "./config.js";
import { ensureTransferStoreReady } from "./repositories/transferRepository.js";
import { cleanupExpiredTransfers, startExpiredTransferCleanup } from "./services/expiredTransferCleanup.js";

const startServer = async () => {
  await mkdir(apiConfig.tempDirectory, { recursive: true });
  await mkdir(apiConfig.dataDirectory, { recursive: true });
  await mkdir(apiConfig.localStorageDirectory, { recursive: true });

  const runtimeMode = getRuntimeMode();
  const cloudMissing = getCloudConfigMissing();

  if (runtimeMode === "cloud") {
    try {
      await ensureTransferStoreReady();
      console.log("Cloud runtime ready: MongoDB Atlas + Cloudflare R2.");
    } catch (error) {
      console.error("Cloud runtime initialization failed:", error.message);
    }
  } else if (runtimeMode === "local") {
    await ensureTransferStoreReady();
    console.warn(
      `Cloud config missing (${cloudMissing.join(", ")}). Starting in local development mode.`,
    );
  } else {
    console.error(`Runtime configuration is incomplete: ${cloudMissing.join(", ")}`);
  }

  await cleanupExpiredTransfers();
  startExpiredTransferCleanup();

  app.listen(apiConfig.port, () => {
    console.log(`Secure File Transfer API listening on http://localhost:${apiConfig.port}`);
  });
};

startServer().catch((error) => {
  console.error("Failed to start the API:", error);
  process.exit(1);
});
