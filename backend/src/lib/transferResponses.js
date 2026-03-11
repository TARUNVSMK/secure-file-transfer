import { resolvePublicApiBaseUrl } from "../config.js";

export const serializeTransferResponse = (transfer, apiBaseUrl, extraFields = {}) => {
  return {
    id: transfer._id,
    shareToken: transfer.shareToken,
    filename: transfer.originalFilename,
    contentType: transfer.contentType,
    fileSize: transfer.fileSize,
    encryptedSize: transfer.encryptedSize,
    downloadCount: transfer.downloadCount,
    expiresAt: transfer.expiresAt,
    createdAt: transfer.createdAt,
    downloadLink: `${apiBaseUrl}/api/files/${transfer.shareToken}/download`,
    deleteEndpoint: `${apiBaseUrl}/api/files/${transfer.shareToken}`,
    ...extraFields,
  };
};

export const toTransferResponse = (request, transfer, extraFields = {}) => {
  const apiBaseUrl = resolvePublicApiBaseUrl(request);
  return serializeTransferResponse(transfer, apiBaseUrl, extraFields);
};
