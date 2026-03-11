import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { apiConfig } from "../config.js";

let database = null;
let migratedLegacyJson = false;

const schemaSql = `
  CREATE TABLE IF NOT EXISTS file_transfers (
    id TEXT PRIMARY KEY,
    share_token TEXT NOT NULL UNIQUE,
    object_key TEXT NOT NULL UNIQUE,
    original_filename TEXT NOT NULL,
    content_type TEXT NOT NULL,
    encryption_key TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    encrypted_size INTEGER NOT NULL,
    expires_at TEXT NOT NULL,
    download_count INTEGER NOT NULL DEFAULT 0,
    last_downloaded_at TEXT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_file_transfers_expires_at
  ON file_transfers (expires_at);
`;

const normalizeDate = (value) => {
  if (!value) {
    return null;
  }

  return new Date(value);
};

const normalizeTransferRow = (row) => {
  if (!row) {
    return null;
  }

  return {
    _id: row.id,
    shareToken: row.share_token,
    objectKey: row.object_key,
    originalFilename: row.original_filename,
    contentType: row.content_type,
    encryptionKey: row.encryption_key,
    fileSize: row.file_size,
    encryptedSize: row.encrypted_size,
    downloadCount: row.download_count,
    lastDownloadedAt: normalizeDate(row.last_downloaded_at),
    expiresAt: normalizeDate(row.expires_at),
    createdAt: normalizeDate(row.created_at),
    updatedAt: normalizeDate(row.updated_at),
  };
};

const ensureDatabase = () => {
  if (database) {
    return database;
  }

  mkdirSync(path.dirname(apiConfig.localDatabaseFile), { recursive: true });
  database = new DatabaseSync(apiConfig.localDatabaseFile);
  database.exec(schemaSql);

  return database;
};

const migrateLegacyJsonTransfers = () => {
  if (migratedLegacyJson) {
    return;
  }

  migratedLegacyJson = true;
  if (!existsSync(apiConfig.legacyLocalTransfersFile)) {
    return;
  }

  const raw = readFileSync(apiConfig.legacyLocalTransfersFile, "utf8");
  const legacyTransfers = JSON.parse(raw);
  const insert = ensureDatabase().prepare(`
    INSERT OR IGNORE INTO file_transfers (
      id,
      share_token,
      object_key,
      original_filename,
      content_type,
      encryption_key,
      file_size,
      encrypted_size,
      expires_at,
      download_count,
      last_downloaded_at,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const transfer of legacyTransfers) {
    insert.run(
      transfer._id ?? randomUUID(),
      transfer.shareToken,
      transfer.objectKey,
      transfer.originalFilename,
      transfer.contentType ?? "application/octet-stream",
      transfer.encryptionKey,
      transfer.fileSize,
      transfer.encryptedSize,
      new Date(transfer.expiresAt).toISOString(),
      transfer.downloadCount ?? 0,
      transfer.lastDownloadedAt ? new Date(transfer.lastDownloadedAt).toISOString() : null,
      transfer.createdAt ? new Date(transfer.createdAt).toISOString() : new Date().toISOString(),
      transfer.updatedAt ? new Date(transfer.updatedAt).toISOString() : new Date().toISOString(),
    );
  }

  if (existsSync(apiConfig.migratedLegacyTransfersFile)) {
    rmSync(apiConfig.migratedLegacyTransfersFile, { force: true });
  }

  renameSync(apiConfig.legacyLocalTransfersFile, apiConfig.migratedLegacyTransfersFile);
};

export const ensureLocalDatabaseReady = () => {
  ensureDatabase();
  migrateLegacyJsonTransfers();
};

export const createLocalTransfer = (payload) => {
  ensureLocalDatabaseReady();

  const now = new Date().toISOString();
  const id = randomUUID();

  ensureDatabase()
    .prepare(`
      INSERT OR IGNORE INTO file_transfers (
        id,
        share_token,
        object_key,
        original_filename,
        content_type,
        encryption_key,
        file_size,
        encrypted_size,
        expires_at,
        download_count,
        last_downloaded_at,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      id,
      payload.shareToken,
      payload.objectKey,
      payload.originalFilename,
      payload.contentType,
      payload.encryptionKey,
      payload.fileSize,
      payload.encryptedSize,
      payload.expiresAt.toISOString(),
      0,
      null,
      now,
      now,
    );

  return findLocalTransferByShareToken(payload.shareToken);
};

export const findLocalTransferByShareToken = (shareToken) => {
  ensureLocalDatabaseReady();

  const row = ensureDatabase()
    .prepare(`
      SELECT *
      FROM file_transfers
      WHERE share_token = ?
      LIMIT 1
    `)
    .get(shareToken);

  return normalizeTransferRow(row);
};

export const recordLocalTransferDownload = (shareToken) => {
  ensureLocalDatabaseReady();

  const now = new Date().toISOString();
  ensureDatabase()
    .prepare(`
      UPDATE file_transfers
      SET download_count = download_count + 1,
          last_downloaded_at = ?,
          updated_at = ?
      WHERE share_token = ?
    `)
    .run(now, now, shareToken);
};

export const deleteLocalTransfer = (shareToken) => {
  ensureLocalDatabaseReady();

  ensureDatabase()
    .prepare(`
      DELETE FROM file_transfers
      WHERE share_token = ?
    `)
    .run(shareToken);
};

export const listExpiredLocalTransfers = (cutoff = new Date()) => {
  ensureLocalDatabaseReady();

  const rows = ensureDatabase()
    .prepare(`
      SELECT *
      FROM file_transfers
      WHERE expires_at <= ?
    `)
    .all(cutoff.toISOString());

  return rows.map(normalizeTransferRow);
};
