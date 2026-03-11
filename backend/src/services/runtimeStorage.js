import { getRuntimeMode } from "../config.js";
import { deleteLocalObject, getLocalObjectStream, uploadEncryptedFileLocally } from "../lib/localStorage.js";
import { deleteObject, getObjectStream, uploadEncryptedFile } from "../lib/r2.js";

export const getStorageBackendLabel = () =>
  getRuntimeMode() === "cloud"
    ? "cloudflare-r2"
    : getRuntimeMode() === "local"
      ? "local-filesystem"
      : "unavailable";

export const uploadStoredObject = async (filePath, objectKey) => {
  if (getRuntimeMode() === "cloud") {
    return uploadEncryptedFile(filePath, objectKey);
  }

  return uploadEncryptedFileLocally(filePath, objectKey);
};

export const readStoredObject = async (objectKey) => {
  if (getRuntimeMode() === "cloud") {
    return getObjectStream(objectKey);
  }

  return getLocalObjectStream(objectKey);
};

export const removeStoredObject = async (objectKey) => {
  if (getRuntimeMode() === "cloud") {
    return deleteObject(objectKey);
  }

  return deleteLocalObject(objectKey);
};
