import path from "node:path";
import { randomBytes } from "node:crypto";
import { apiConfig, getCloudConfigMissing, getRuntimeMode, isRuntimeConfigured } from "../../backend/src/config.js";
import { HttpError } from "../../backend/src/lib/errors.js";
import { getSignedDownloadUrl, getSignedUploadUrl } from "../../backend/src/lib/r2.js";
import { serializeTransferResponse } from "../../backend/src/lib/transferResponses.js";
import {
  createTransferRecord,
  deleteTransferRecord,
  ensureTransferStoreReady,
  findTransferByShareToken,
  recordTransferDownload,
} from "../../backend/src/repositories/transferRepository.js";
import {
  purgeExpiredTransfer,
  runExpiredTransferCleanupIfDue,
} from "../../backend/src/services/expiredTransferCleanup.js";
import {
  ensureUploadQuotaAvailable,
  reserveUploadQuotaSlot,
} from "../../backend/src/services/uploadQuota.js";
import { getStorageBackendLabel, removeStoredObject } from "../../backend/src/services/runtimeStorage.js";

const JSON_HEADERS = {
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
};

const SIGNED_URL_TTL_SECONDS = 60 * 15;

export const config = {
  path: "/api/*",
};

const json = (payload, init = {}) =>
  new Response(JSON.stringify(payload), {
    ...init,
    headers: {
      ...JSON_HEADERS,
      ...(init.headers ?? {}),
    },
  });

const sanitizeFilename = (filename) => {
  const cleaned = path.basename(filename ?? "").replace(/[^a-zA-Z0-9._-]+/g, "-");
  return cleaned.replace(/^-+/, "") || "file";
};

const parseExpirySeconds = (value) => {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) {
    return apiConfig.defaultExpirySeconds;
  }

  return parsed;
};

const getUploadLimitBytes = () => Math.max(apiConfig.maxUploadSizeMb * 1024 * 1024 - 1, 1);

const assertCloudRuntimeReady = () => {
  const missing = getCloudConfigMissing();

  if (missing.length) {
    throw new HttpError(500, `Missing configuration: ${missing.join(", ")}`);
  }
};

const isExpired = (transfer) => transfer.expiresAt.getTime() <= Date.now();

const getActiveTransfer = async (shareToken) => {
  const transfer = await findTransferByShareToken(shareToken);

  if (!transfer) {
    throw new HttpError(404, "File not found.");
  }

  if (isExpired(transfer)) {
    await purgeExpiredTransfer(transfer).catch((error) => {
      console.error(`Failed to purge expired transfer ${shareToken}:`, error.message);
    });
    throw new HttpError(410, "This download link has expired.");
  }

  return transfer;
};

const parseJsonBody = async (request) => {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "Request body must be valid JSON.");
  }
};

const getApiBaseUrl = (request) =>
  (apiConfig.publicApiBaseUrl || new URL(request.url).origin).replace(/\/+$/, "");

const getRequestIp = (request) =>
  request.headers.get("x-nf-client-connection-ip") ||
  request.headers.get("cf-connecting-ip") ||
  request.headers.get("x-forwarded-for") ||
  request.headers.get("x-real-ip") ||
  "unknown";

const createHealthPayload = () => {
  const runtimeMode = getRuntimeMode();
  const cloudConfigMissing = getCloudConfigMissing();

  return {
    status: isRuntimeConfigured() ? "ok" : "degraded",
    runtimeMode,
    missingConfig: runtimeMode === "degraded" ? cloudConfigMissing : [],
    cloudConfigMissing,
    databaseState: runtimeMode === "cloud" ? "mongodb-atlas" : "unavailable",
    storageBackend: getStorageBackendLabel(),
    maxUploadSizeMb: apiConfig.maxUploadSizeMb,
    minExpirySeconds: apiConfig.minExpirySeconds,
    maxExpirySeconds: apiConfig.maxExpirySeconds,
    defaultExpirySeconds: apiConfig.defaultExpirySeconds,
    cleanupIntervalSeconds: apiConfig.cleanupIntervalSeconds,
    uploadQuotaWindowMs: apiConfig.uploadQuotaWindowMs,
    uploadQuotaMaxPerIp: apiConfig.uploadQuotaMaxPerIp,
    allowLocalFallback: false,
    capabilities: {
      directUpload: true,
      browserDecryption: true,
      uploadQuotaProtection: true,
    },
  };
};

const handleHealth = async () =>
  json(createHealthPayload(), { status: isRuntimeConfigured() ? 200 : 503 });

const handleUploadInit = async (request) => {
  assertCloudRuntimeReady();
  await ensureTransferStoreReady();
  ensureUploadQuotaAvailable(getRequestIp(request));

  const body = await parseJsonBody(request);
  const filename = sanitizeFilename(body.filename);
  const contentType = String(body.contentType || "application/octet-stream").trim();
  const fileSize = Number.parseInt(body.fileSize ?? "", 10);
  const expirySeconds = parseExpirySeconds(body.expirySeconds);

  if (!filename) {
    throw new HttpError(400, "Filename is required.");
  }

  if (!Number.isFinite(fileSize) || fileSize <= 0) {
    throw new HttpError(400, "File size must be greater than 0 bytes.");
  }

  if (fileSize >= getUploadLimitBytes()) {
    throw new HttpError(413, `File must be smaller than ${apiConfig.maxUploadSizeMb} MB.`);
  }

  if (
    expirySeconds < apiConfig.minExpirySeconds ||
    expirySeconds > apiConfig.maxExpirySeconds
  ) {
    throw new HttpError(
      400,
      `Expiry must be between ${apiConfig.minExpirySeconds} and ${apiConfig.maxExpirySeconds} seconds.`,
    );
  }

  const shareToken = randomBytes(18).toString("base64url");
  const objectKey = `uploads/${shareToken}/${filename}.enc`;
  const uploadUrl = await getSignedUploadUrl(objectKey, SIGNED_URL_TTL_SECONDS);

  return json({
    shareToken,
    objectKey,
    filename,
    contentType,
    uploadUrl,
    uploadUrlExpiresInSeconds: SIGNED_URL_TTL_SECONDS,
  });
};

const handleUploadComplete = async (request) => {
  assertCloudRuntimeReady();
  await ensureTransferStoreReady();
  const quotaReservation = reserveUploadQuotaSlot(getRequestIp(request));

  try {
    const body = await parseJsonBody(request);
    const shareToken = String(body.shareToken ?? "").trim();
    const objectKey = String(body.objectKey ?? "").trim();
    const originalFilename = sanitizeFilename(body.filename);
    const contentType = String(body.contentType || "application/octet-stream").trim();
    const encryptionKey = String(body.encryptionKey ?? "").trim();
    const fileSize = Number.parseInt(body.fileSize ?? "", 10);
    const encryptedSize = Number.parseInt(body.encryptedSize ?? "", 10);
    const expirySeconds = parseExpirySeconds(body.expirySeconds);

    if (!shareToken || !objectKey || !originalFilename || !encryptionKey) {
      throw new HttpError(400, "Missing required upload metadata.");
    }

    if (!Number.isFinite(fileSize) || fileSize <= 0) {
      throw new HttpError(400, "File size must be greater than 0 bytes.");
    }

    if (fileSize >= getUploadLimitBytes()) {
      throw new HttpError(413, `File must be smaller than ${apiConfig.maxUploadSizeMb} MB.`);
    }

    if (!Number.isFinite(encryptedSize) || encryptedSize <= 0) {
      throw new HttpError(400, "Encrypted file size must be greater than 0 bytes.");
    }

    if (
      expirySeconds < apiConfig.minExpirySeconds ||
      expirySeconds > apiConfig.maxExpirySeconds
    ) {
      throw new HttpError(
        400,
        `Expiry must be between ${apiConfig.minExpirySeconds} and ${apiConfig.maxExpirySeconds} seconds.`,
      );
    }

    const expiresAt = new Date(Date.now() + expirySeconds * 1000);
    const transfer = await createTransferRecord({
      shareToken,
      objectKey,
      originalFilename,
      contentType,
      encryptionKey,
      fileSize,
      encryptedSize,
      expiresAt,
    });

    quotaReservation.commit();

    return json({
      ...serializeTransferResponse(transfer, getApiBaseUrl(request), {
        deliveryMode: "client-decrypt",
      }),
      expirySeconds,
    }, { status: 201 });
  } catch (error) {
    quotaReservation.release();
    throw error;
  }
};

const handleGetTransfer = async (request, shareToken) => {
  assertCloudRuntimeReady();
  await ensureTransferStoreReady();

  const transfer = await getActiveTransfer(shareToken);
  const encryptedDownloadUrl = await getSignedDownloadUrl(
    transfer.objectKey,
    SIGNED_URL_TTL_SECONDS,
  );

  return json(
    serializeTransferResponse(transfer, getApiBaseUrl(request), {
      deliveryMode: "client-decrypt",
      encryptedDownloadUrl,
      downloadUrlExpiresInSeconds: SIGNED_URL_TTL_SECONDS,
      encryptionKey: transfer.encryptionKey,
      downloadLink: null,
    }),
  );
};

const handleDeleteTransfer = async (request, shareToken) => {
  assertCloudRuntimeReady();
  await ensureTransferStoreReady();

  const transfer = await findTransferByShareToken(shareToken);

  if (!transfer) {
    throw new HttpError(404, "File not found.");
  }

  let requestToken = request.headers.get("x-delete-token") ?? "";

  if (!requestToken && request.headers.get("content-type")?.includes("application/json")) {
    const body = await parseJsonBody(request);
    requestToken = String(body.token ?? "").trim();
  }

  if (apiConfig.deleteToken && requestToken !== apiConfig.deleteToken) {
    throw new HttpError(401, "Unauthorized.");
  }

  await removeStoredObject(transfer.objectKey);
  await deleteTransferRecord(transfer.shareToken);

  return json({
    status: "deleted",
    shareToken: transfer.shareToken,
  });
};

const handleRecordDownload = async (shareToken) => {
  assertCloudRuntimeReady();
  await ensureTransferStoreReady();
  await recordTransferDownload(shareToken);

  return json({
    status: "ok",
    shareToken,
  });
};

const runBestEffortExpiredTransferCleanup = async () => {
  if (getRuntimeMode() === "degraded") {
    return;
  }

  try {
    await runExpiredTransferCleanupIfDue();
  } catch (error) {
    console.error("Best-effort expired-transfer cleanup failed:", error.message ?? error);
  }
};

const getFileRouteParts = (pathname) => {
  if (!pathname.startsWith("/api/files/")) {
    return null;
  }

  return pathname
    .replace(/^\/api\/files\//, "")
    .split("/")
    .filter(Boolean)
    .map((value) => decodeURIComponent(value));
};

const normalizeApiPathname = (pathname) => {
  if (pathname.startsWith("/.netlify/functions/api")) {
    const normalized = pathname.replace(/^\/\.netlify\/functions\/api/, "");
    return normalized || "/";
  }

  return pathname;
};

export default async (request) => {
  try {
    await runBestEffortExpiredTransferCleanup();

    const url = new URL(request.url);
    const pathname = normalizeApiPathname(url.pathname);
    const method = request.method.toUpperCase();

    if (method === "GET" && pathname === "/api/health") {
      return await handleHealth();
    }

    if (method === "POST" && pathname === "/api/files/upload/init") {
      return await handleUploadInit(request);
    }

    if (method === "POST" && pathname === "/api/files/upload/complete") {
      return await handleUploadComplete(request);
    }

    const fileRouteParts = getFileRouteParts(pathname);

    if (fileRouteParts?.length === 1 && method === "GET") {
      return await handleGetTransfer(request, fileRouteParts[0]);
    }

    if (fileRouteParts?.length === 1 && method === "DELETE") {
      return await handleDeleteTransfer(request, fileRouteParts[0]);
    }

    if (
      fileRouteParts?.length === 2 &&
      fileRouteParts[1] === "downloaded" &&
      method === "POST"
    ) {
      return await handleRecordDownload(fileRouteParts[0]);
    }

    return json({ message: "Route not found." }, { status: 404 });
  } catch (error) {
    const statusCode = error.statusCode ?? 500;
    const message = error.message ?? "Internal server error.";

    if (statusCode >= 500) {
      console.error(error);
    }

    return json({ message }, { status: statusCode });
  }
};
