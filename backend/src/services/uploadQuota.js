import { apiConfig } from "../config.js";
import { HttpError } from "../lib/errors.js";

const uploadQuotaState = new Map();

const normalizeIpAddress = (value) => {
  const rawValue = String(value ?? "").trim();
  if (!rawValue) {
    return "unknown";
  }

  const forwardedEntry = rawValue.split(",")[0]?.trim();
  return forwardedEntry || "unknown";
};

const pruneCompletedUploads = (entry, now) => {
  entry.completedUploads = entry.completedUploads.filter(
    (timestamp) => now - timestamp < apiConfig.uploadQuotaWindowMs,
  );
};

const getEntry = (ipAddress) => {
  const key = normalizeIpAddress(ipAddress);
  const now = Date.now();
  const existing = uploadQuotaState.get(key);

  if (!existing) {
    const created = { completedUploads: [], pendingUploads: 0 };
    uploadQuotaState.set(key, created);
    return [key, created];
  }

  pruneCompletedUploads(existing, now);

  if (existing.completedUploads.length === 0 && existing.pendingUploads <= 0) {
    uploadQuotaState.delete(key);
    const created = { completedUploads: [], pendingUploads: 0 };
    uploadQuotaState.set(key, created);
    return [key, created];
  }

  return [key, existing];
};

const cleanupEntry = (key, entry) => {
  pruneCompletedUploads(entry, Date.now());

  if (entry.completedUploads.length === 0 && entry.pendingUploads <= 0) {
    uploadQuotaState.delete(key);
  }
};

const formatMinutesLabel = (durationMs) => {
  const totalMinutes = Math.max(1, Math.ceil(durationMs / 60000));
  return `${totalMinutes} minute${totalMinutes === 1 ? "" : "s"}`;
};

const createQuotaError = (entry, now) => {
  const oldestTrackedUpload = entry.completedUploads[0];
  const retryAfterMs = oldestTrackedUpload
    ? Math.max(1000, apiConfig.uploadQuotaWindowMs - (now - oldestTrackedUpload))
    : apiConfig.uploadQuotaWindowMs;

  return new HttpError(
    429,
    `Upload limit reached. Try again after ${formatMinutesLabel(retryAfterMs)}.`,
  );
};

const assertQuotaAvailable = (entry, now) => {
  pruneCompletedUploads(entry, now);

  if (entry.completedUploads.length + entry.pendingUploads >= apiConfig.uploadQuotaMaxPerIp) {
    throw createQuotaError(entry, now);
  }
};

export const ensureUploadQuotaAvailable = (ipAddress) => {
  const [, entry] = getEntry(ipAddress);
  assertQuotaAvailable(entry, Date.now());
};

export const reserveUploadQuotaSlot = (ipAddress) => {
  const [key, entry] = getEntry(ipAddress);
  const now = Date.now();

  assertQuotaAvailable(entry, now);
  entry.pendingUploads += 1;

  let settled = false;

  return {
    commit() {
      if (settled) {
        return;
      }

      settled = true;
      entry.pendingUploads = Math.max(0, entry.pendingUploads - 1);
      entry.completedUploads.push(Date.now());
      cleanupEntry(key, entry);
    },
    release() {
      if (settled) {
        return;
      }

      settled = true;
      entry.pendingUploads = Math.max(0, entry.pendingUploads - 1);
      cleanupEntry(key, entry);
    },
  };
};

export const getUploadQuotaSnapshot = () =>
  Array.from(uploadQuotaState.entries()).map(([ipAddress, entry]) => ({
    ipAddress,
    pendingUploads: entry.pendingUploads,
    completedUploads: [...entry.completedUploads],
  }));

export const resetUploadQuotaState = () => {
  uploadQuotaState.clear();
};
