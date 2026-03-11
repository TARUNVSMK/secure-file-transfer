import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import {
  apiConfig,
  getCloudConfigMissing,
  getRuntimeMode,
  isRuntimeConfigured,
} from "./config.js";
import { apiLimiter } from "./middleware/rateLimiters.js";
import { getRepositoryState } from "./repositories/transferRepository.js";
import { getStorageBackendLabel } from "./services/runtimeStorage.js";
import filesRouter from "./routes/files.js";

const app = express();
app.set("trust proxy", 1);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || apiConfig.clientOrigins.includes("*") || apiConfig.clientOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("CORS origin is not allowed."));
    },
  }),
);
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use("/api", apiLimiter);

app.get("/api/health", (_request, response) => {
  const runtimeMode = getRuntimeMode();
  const cloudConfigMissing = getCloudConfigMissing();
  response.status(isRuntimeConfigured() ? 200 : 503).json({
    status: isRuntimeConfigured() ? "ok" : "degraded",
    runtimeMode,
    missingConfig: runtimeMode === "degraded" ? cloudConfigMissing : [],
    cloudConfigMissing,
    databaseState: getRepositoryState(),
    storageBackend: getStorageBackendLabel(),
    maxUploadSizeMb: apiConfig.maxUploadSizeMb,
    minExpirySeconds: apiConfig.minExpirySeconds,
    maxExpirySeconds: apiConfig.maxExpirySeconds,
    defaultExpirySeconds: apiConfig.defaultExpirySeconds,
    cleanupIntervalSeconds: apiConfig.cleanupIntervalSeconds,
    allowLocalFallback: apiConfig.allowLocalFallback,
  });
});

app.use("/api/files", filesRouter);

app.use((_request, response) => {
  response.status(404).json({
    message: "Route not found.",
  });
});

app.use((error, _request, response, _next) => {
  if (error?.code === "LIMIT_FILE_SIZE") {
    response.status(413).json({
      message: `File must be smaller than ${apiConfig.maxUploadSizeMb} MB.`,
    });
    return;
  }

  const statusCode = error.statusCode ?? 500;
  const message = error.message ?? "Internal server error.";

  if (statusCode >= 500) {
    console.error(error);
  }

  response.status(statusCode).json({ message });
});

export default app;
