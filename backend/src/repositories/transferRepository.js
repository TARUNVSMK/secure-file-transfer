import { apiConfig, getRuntimeMode } from "../config.js";
import { ensureDatabaseConnection } from "../db/connectToDatabase.js";
import {
  createLocalTransfer,
  deleteLocalTransfer,
  ensureLocalDatabaseReady,
  findLocalTransferByShareToken,
  listExpiredLocalTransfers,
  recordLocalTransferDownload,
} from "../db/localDatabase.js";
import { HttpError } from "../lib/errors.js";
import { FileTransfer } from "../models/FileTransfer.js";

const normalizeTransfer = (transfer) => {
  if (!transfer) {
    return null;
  }

  if (typeof transfer.toObject === "function") {
    return {
      ...transfer.toObject(),
      _id: transfer._id.toString(),
    };
  }

  return transfer;
};

export const getRepositoryState = () => {
  if (getRuntimeMode() === "cloud") {
    return "mongodb-atlas";
  }

  if (getRuntimeMode() === "local") {
    return "sqlite";
  }

  return "unavailable";
};

export const ensureTransferStoreReady = async () => {
  if (getRuntimeMode() === "cloud") {
    await ensureDatabaseConnection();
    return;
  }

  if (getRuntimeMode() === "local") {
    ensureLocalDatabaseReady();
    return;
  }

  throw new HttpError(500, "Runtime is not configured.");
};

export const createTransferRecord = async (payload) => {
  if (getRuntimeMode() === "cloud") {
    await ensureDatabaseConnection();
    const transfer = await FileTransfer.create(payload);
    return normalizeTransfer(transfer);
  }

  return createLocalTransfer(payload);
};

export const findTransferByShareToken = async (shareToken) => {
  if (getRuntimeMode() === "cloud") {
    await ensureDatabaseConnection();
    const transfer = await FileTransfer.findOne({ shareToken });
    return normalizeTransfer(transfer);
  }

  return findLocalTransferByShareToken(shareToken);
};

export const recordTransferDownload = async (shareToken) => {
  if (getRuntimeMode() === "cloud") {
    await ensureDatabaseConnection();
    await FileTransfer.updateOne(
      { shareToken },
      {
        $inc: { downloadCount: 1 },
        $set: { lastDownloadedAt: new Date() },
      },
    );
    return;
  }

  recordLocalTransferDownload(shareToken);
};

export const deleteTransferRecord = async (shareToken) => {
  if (getRuntimeMode() === "cloud") {
    await ensureDatabaseConnection();
    await FileTransfer.deleteOne({ shareToken });
    return;
  }

  deleteLocalTransfer(shareToken);
};

export const listExpiredTransfers = async (cutoff = new Date()) => {
  if (getRuntimeMode() === "cloud") {
    await ensureDatabaseConnection();
    const transfers = await FileTransfer.find({ expiresAt: { $lte: cutoff } });
    return transfers.map(normalizeTransfer);
  }

  return listExpiredLocalTransfers(cutoff);
};
