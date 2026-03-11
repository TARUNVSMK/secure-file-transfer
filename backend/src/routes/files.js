import path from "node:path";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, unlink } from "node:fs/promises";
import multer from "multer";
import { Router } from "express";
import { apiConfig, getMissingRuntimeConfig } from "../config.js";
import { decryptStreamToFile, encryptFileToFile } from "../lib/encryption.js";
import { HttpError } from "../lib/errors.js";
import { toTransferResponse } from "../lib/transferResponses.js";
import { uploadLimiter } from "../middleware/rateLimiters.js";
import {
  createTransferRecord,
  deleteTransferRecord,
  ensureTransferStoreReady,
  findTransferByShareToken,
  recordTransferDownload,
} from "../repositories/transferRepository.js";
import { purgeExpiredTransfer } from "../services/expiredTransferCleanup.js";
import { readStoredObject, removeStoredObject, uploadStoredObject } from "../services/runtimeStorage.js";

const router = Router();

const sanitizeFilename = (filename) => {
  const cleaned = path.basename(filename ?? "").replace(/[^a-zA-Z0-9._-]+/g, "-");
  return cleaned.replace(/^-+/, "") || "file";
};

const assertRuntimeReady = () => {
  const missing = getMissingRuntimeConfig();
  if (missing.length) {
    throw new HttpError(500, `Missing configuration: ${missing.join(", ")}`);
  }
};

const isExpired = (transfer) => transfer.expiresAt.getTime() <= Date.now();

const parseExpirySeconds = (value) => {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) {
    return apiConfig.defaultExpirySeconds;
  }

  return parsed;
};

const asyncHandler =
  (handler) =>
  (request, response, next) =>
    Promise.resolve(handler(request, response, next)).catch(next);

const getUploadLimitBytes = () => Math.max(apiConfig.maxUploadSizeMb * 1024 * 1024 - 1, 1);

const storage = multer.diskStorage({
  destination: async (_request, _file, callback) => {
    try {
      await mkdir(apiConfig.tempDirectory, { recursive: true });
      callback(null, apiConfig.tempDirectory);
    } catch (error) {
      callback(error);
    }
  },
  filename: (_request, file, callback) => {
    callback(null, `${Date.now()}-${randomUUID()}-${sanitizeFilename(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: getUploadLimitBytes(),
  },
});

const safeUnlink = async (filePath) => {
  if (!filePath) {
    return;
  }

  try {
    await unlink(filePath);
  } catch {
    // Temp file cleanup should not hide the real failure.
  }
};

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

router.post(
  "/upload",
  uploadLimiter,
  upload.single("file"),
  asyncHandler(async (request, response) => {
    assertRuntimeReady();
    await ensureTransferStoreReady();

    if (!request.file) {
      throw new HttpError(400, "Attach a file before uploading.");
    }

    const expirySeconds = parseExpirySeconds(
      request.body.expirySeconds ?? request.body.expiry ?? `${apiConfig.defaultExpirySeconds}`,
    );

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
    const originalFilename = sanitizeFilename(request.file.originalname);
    const encryptedPath = path.join(apiConfig.tempDirectory, `${shareToken}.enc`);
    const objectKey = `uploads/${shareToken}/${originalFilename}.enc`;
    const expiresAt = new Date(Date.now() + expirySeconds * 1000);

    let encryptedMeta = null;
    let uploadedObject = false;

    try {
      encryptedMeta = await encryptFileToFile(request.file.path, encryptedPath);
      await uploadStoredObject(encryptedPath, objectKey);
      uploadedObject = true;

      const transfer = await createTransferRecord({
        shareToken,
        objectKey,
        originalFilename,
        contentType: request.file.mimetype || "application/octet-stream",
        encryptionKey: encryptedMeta.encryptionKey,
        fileSize: encryptedMeta.originalSize,
        encryptedSize: encryptedMeta.encryptedSize,
        expiresAt,
      });

      response.status(201).json({
        ...toTransferResponse(request, transfer),
        expirySeconds,
      });
    } catch (error) {
      if (uploadedObject) {
        await removeStoredObject(objectKey).catch(() => undefined);
      }
      throw error;
    } finally {
      await safeUnlink(request.file.path);
      await safeUnlink(encryptedPath);
    }
  }),
);

router.get(
  "/:shareToken/download",
  asyncHandler(async (request, response, next) => {
    assertRuntimeReady();
    await ensureTransferStoreReady();

    const transfer = await getActiveTransfer(request.params.shareToken);
    const tempOutputPath = path.join(
      apiConfig.tempDirectory,
      `${transfer.shareToken}-${sanitizeFilename(transfer.originalFilename)}`,
    );

    await mkdir(apiConfig.tempDirectory, { recursive: true });

    try {
      const objectStream = await readStoredObject(transfer.objectKey);
      await decryptStreamToFile(objectStream, tempOutputPath, transfer.encryptionKey);

      await recordTransferDownload(transfer.shareToken);

      response.setHeader("Cache-Control", "no-store");
      response.download(tempOutputPath, transfer.originalFilename, async (error) => {
        await safeUnlink(tempOutputPath);
        if (error && !response.headersSent) {
          next(error);
        }
      });
    } catch (error) {
      await safeUnlink(tempOutputPath);
      throw error;
    }
  }),
);

router.get(
  "/:shareToken",
  asyncHandler(async (request, response) => {
    assertRuntimeReady();
    await ensureTransferStoreReady();

    const transfer = await getActiveTransfer(request.params.shareToken);
    response.json(toTransferResponse(request, transfer));
  }),
);

router.delete(
  "/:shareToken",
  asyncHandler(async (request, response) => {
    assertRuntimeReady();
    await ensureTransferStoreReady();

    const transfer = await findTransferByShareToken(request.params.shareToken);
    if (!transfer) {
      throw new HttpError(404, "File not found.");
    }

    const requestToken = request.header("x-delete-token") ?? request.body?.token;
    if (apiConfig.deleteToken && requestToken !== apiConfig.deleteToken) {
      throw new HttpError(401, "Unauthorized.");
    }

    await removeStoredObject(transfer.objectKey);
    await deleteTransferRecord(transfer.shareToken);

    response.json({
      status: "deleted",
      shareToken: transfer.shareToken,
    });
  }),
);

export default router;
