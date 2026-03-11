import path from "node:path";
import { createReadStream } from "node:fs";
import { copyFile, mkdir, rm } from "node:fs/promises";
import { apiConfig } from "../config.js";

const resolveStoragePath = (objectKey) => path.join(apiConfig.localStorageDirectory, objectKey);

export const uploadEncryptedFileLocally = async (filePath, objectKey) => {
  const targetPath = resolveStoragePath(objectKey);
  await mkdir(path.dirname(targetPath), { recursive: true });
  await copyFile(filePath, targetPath);
};

export const getLocalObjectStream = async (objectKey) => {
  const targetPath = resolveStoragePath(objectKey);
  return createReadStream(targetPath);
};

export const deleteLocalObject = async (objectKey) => {
  const targetPath = resolveStoragePath(objectKey);
  await rm(targetPath, { force: true });
};
