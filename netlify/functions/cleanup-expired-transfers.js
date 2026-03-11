import { getCloudConfigMissing } from "../../backend/src/config.js";
import { cleanupExpiredTransfers } from "../../backend/src/services/expiredTransferCleanup.js";

export const config = {
  schedule: "*/15 * * * *",
};

export default async () => {
  try {
    const missing = getCloudConfigMissing();

    if (missing.length) {
      console.error(`Scheduled cleanup skipped. Missing configuration: ${missing.join(", ")}`);
      return new Response(
        JSON.stringify({
          status: "degraded",
          missing,
        }),
        {
          status: 503,
          headers: {
            "content-type": "application/json; charset=utf-8",
          },
        },
      );
    }

    const deletedCount = await cleanupExpiredTransfers();

    return new Response(
      JSON.stringify({
        status: "ok",
        deletedCount,
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json; charset=utf-8",
        },
      },
    );
  } catch (error) {
    console.error("Scheduled cleanup failed:", error);

    return new Response(
      JSON.stringify({
        status: "error",
        message: error.message ?? "Scheduled cleanup failed.",
      }),
      {
        status: 500,
        headers: {
          "content-type": "application/json; charset=utf-8",
        },
      },
    );
  }
};
