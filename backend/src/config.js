import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const getBackendRoot = () => {
  const currentWorkingDirectory = process.cwd();
  const backendRootFromCwd =
    path.basename(currentWorkingDirectory).toLowerCase() === "backend"
      ? currentWorkingDirectory
      : path.join(currentWorkingDirectory, "backend");

  try {
    if (typeof import.meta.url === "string") {
      const currentFilePath = fileURLToPath(import.meta.url);
      const currentDirectory = path.dirname(currentFilePath);
      return path.resolve(currentDirectory, "..");
    }
  } catch {
    // Netlify can bundle this file into CommonJS for functions, where import.meta.url is unavailable.
  }

  return backendRootFromCwd;
};

const backendRoot = getBackendRoot();

dotenv.config({ path: path.join(backendRoot, ".env"), quiet: true });

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const parseNumber = (value, fallback) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseBoolean = (value, fallback) => {
  if (value == null || value === "") {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
};

const parseOrigins = (value) => {
  const origins = (value ?? "http://localhost:5173")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  return origins.length ? origins : ["http://localhost:5173"];
};

export const apiConfig = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: parseNumber(process.env.PORT, 5000),
  clientOrigins: parseOrigins(process.env.CLIENT_URL),
  publicApiBaseUrl: (process.env.PUBLIC_API_BASE_URL ?? "").replace(/\/+$/, ""),
  mongoUri: (process.env.MONGO_URI ?? "").trim(),
  deleteToken: (process.env.DELETE_TOKEN ?? "").trim(),
  maxUploadSizeMb: clamp(parseNumber(process.env.MAX_UPLOAD_SIZE_MB, 200), 1, 2048),
  minExpirySeconds: 31,
  maxExpirySeconds: 86399,
  defaultExpirySeconds: 0,
  cleanupIntervalSeconds: clamp(parseNumber(process.env.CLEANUP_INTERVAL_SECONDS, 60), 10, 86400),
  apiRateLimitWindowMs: clamp(parseNumber(process.env.API_RATE_LIMIT_WINDOW_MS, 900000), 1000, 86400000),
  apiRateLimitMax: clamp(parseNumber(process.env.API_RATE_LIMIT_MAX, 300), 1, 100000),
  uploadRateLimitWindowMs: clamp(parseNumber(process.env.UPLOAD_RATE_LIMIT_WINDOW_MS, 900000), 1000, 86400000),
  uploadRateLimitMax: clamp(parseNumber(process.env.UPLOAD_RATE_LIMIT_MAX, 50), 1, 100000),
  allowLocalFallback: parseBoolean(process.env.ALLOW_LOCAL_FALLBACK, (process.env.NODE_ENV ?? "development") !== "production"),
  backendRoot,
  tempDirectory: path.join(backendRoot, "tmp"),
  dataDirectory: path.join(backendRoot, "data"),
  localDatabaseFile: path.join(backendRoot, "data", "secure-file-transfer.sqlite"),
  legacyLocalTransfersFile: path.join(backendRoot, "data", "transfers.json"),
  migratedLegacyTransfersFile: path.join(backendRoot, "data", "transfers.legacy.json"),
  localStorageDirectory: path.join(backendRoot, "storage"),
  r2: {
    endpointUrl: (process.env.R2_ENDPOINT_URL ?? "").trim(),
    accessKeyId: (process.env.R2_ACCESS_KEY_ID ?? "").trim(),
    secretAccessKey: (process.env.R2_SECRET_ACCESS_KEY ?? "").trim(),
    bucketName: (process.env.R2_BUCKET_NAME ?? "").trim(),
    region: (process.env.R2_REGION ?? "auto").trim(),
  },
};

apiConfig.defaultExpirySeconds = clamp(
  parseNumber(process.env.DEFAULT_EXPIRY_SECONDS, 3600),
  apiConfig.minExpirySeconds,
  apiConfig.maxExpirySeconds,
);

export const getCloudConfigMissing = () => {
  const missing = [];

  if (!apiConfig.mongoUri) {
    missing.push("MONGO_URI");
  }
  if (!apiConfig.r2.endpointUrl) {
    missing.push("R2_ENDPOINT_URL");
  }
  if (!apiConfig.r2.accessKeyId) {
    missing.push("R2_ACCESS_KEY_ID");
  }
  if (!apiConfig.r2.secretAccessKey) {
    missing.push("R2_SECRET_ACCESS_KEY");
  }
  if (!apiConfig.r2.bucketName) {
    missing.push("R2_BUCKET_NAME");
  }

  return missing;
};

export const getRuntimeMode = () => {
  if (getCloudConfigMissing().length === 0) {
    return "cloud";
  }

  if (apiConfig.allowLocalFallback) {
    return "local";
  }

  return "degraded";
};

export const getMissingRuntimeConfig = () => (getRuntimeMode() === "degraded" ? getCloudConfigMissing() : []);

export const isRuntimeConfigured = () => getRuntimeMode() !== "degraded";

export const resolvePublicApiBaseUrl = (request) =>
  apiConfig.publicApiBaseUrl || `${request.protocol}://${request.get("host")}`;
