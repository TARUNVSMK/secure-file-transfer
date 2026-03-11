import mongoose from "mongoose";

const fileTransferSchema = new mongoose.Schema(
  {
    shareToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    objectKey: {
      type: String,
      required: true,
      unique: true,
    },
    originalFilename: {
      type: String,
      required: true,
    },
    contentType: {
      type: String,
      required: true,
      default: "application/octet-stream",
    },
    encryptionKey: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    encryptedSize: {
      type: Number,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    downloadCount: {
      type: Number,
      default: 0,
    },
    lastDownloadedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

export const FileTransfer = mongoose.model("FileTransfer", fileTransferSchema);
