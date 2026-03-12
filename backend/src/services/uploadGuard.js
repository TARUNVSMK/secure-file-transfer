import { apiConfig } from "../config.js";
import { HttpError } from "../lib/errors.js";

const uploadState = new Map();

const normalizeIpAddress = (value) => {
  const rawValue = String(value ?? "").trim();
  if (!rawValue) {
    return "unknown";
  }

  const forwardedEntry = rawValue.split(",")[0]?.trim();
  return forwardedEntry || "unknown";
};

const getEntry = (ipAddress) => {
  const key = normalizeIpAddress(ipAddress);
  const now = Date.now();
  const existing = uploadState.get(key);

  if (!existing) {
    const created = { activeUploads: 0, cooldownUntil: 0 };
    uploadState.set(key, created);
    return [key, created];
  }

  if (existing.cooldownUntil <= now && existing.activeUploads <= 0) {
    uploadState.delete(key);
    const created = { activeUploads: 0, cooldownUntil: 0 };
    uploadState.set(key, created);
    return [key, created];
  }

  return [key, existing];
};

const cleanupEntry = (key, entry) => {
  if (entry.activeUploads <= 0 && entry.cooldownUntil <= Date.now()) {
    uploadState.delete(key);
  }
};

const formatMinutesLabel = (durationMs) => {
  const totalMinutes = Math.max(1, Math.ceil(durationMs / 60000));
  return `${totalMinutes} minute${totalMinutes === 1 ? "" : "s"}`;
};

export const acquireUploadSlot = (ipAddress) => {
  const [key, entry] = getEntry(ipAddress);
  const now = Date.now();

  if (entry.cooldownUntil > now) {
    throw new HttpError(
      429,
      `Too many upload attempts from this IP. Please wait ${formatMinutesLabel(entry.cooldownUntil - now)} before trying again.`,
    );
  }

  if (entry.activeUploads >= apiConfig.concurrentUploadLimitPerIp) {
    entry.cooldownUntil = now + apiConfig.concurrentUploadCooldownMs;
    throw new HttpError(
      429,
      `This IP already has ${apiConfig.concurrentUploadLimitPerIp} active uploads. Please wait ${formatMinutesLabel(apiConfig.concurrentUploadCooldownMs)} and try again.`,
    );
  }

  entry.activeUploads += 1;

  return () => {
    entry.activeUploads = Math.max(0, entry.activeUploads - 1);
    cleanupEntry(key, entry);
  };
};

export const getUploadGuardSnapshot = () =>
  Array.from(uploadState.entries()).map(([ipAddress, entry]) => ({
    ipAddress,
    activeUploads: entry.activeUploads,
    cooldownUntil: entry.cooldownUntil,
  }));

export const resetUploadGuardState = () => {
  uploadState.clear();
};
