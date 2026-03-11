import assert from "node:assert/strict";
import { createReadStream } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { decryptStreamToFile, encryptFileToFile } from "../src/lib/encryption.js";

test("AES-256-GCM helpers encrypt and decrypt a file roundtrip", async () => {
  const tempDirectory = await mkdtemp(path.join(os.tmpdir(), "sft-node-test-"));
  const originalPath = path.join(tempDirectory, "sample.txt");
  const encryptedPath = path.join(tempDirectory, "sample.txt.enc");
  const decryptedPath = path.join(tempDirectory, "sample.txt.dec");
  const originalContents = Buffer.from("secure transfer roundtrip");

  try {
    await writeFile(originalPath, originalContents);
    const encrypted = await encryptFileToFile(originalPath, encryptedPath);
    await decryptStreamToFile(createReadStream(encryptedPath), decryptedPath, encrypted.encryptionKey);

    const decryptedContents = await readFile(decryptedPath);
    assert.deepEqual(decryptedContents, originalContents);
    assert.ok(encrypted.encryptedSize > encrypted.originalSize);
  } finally {
    await rm(tempDirectory, { recursive: true, force: true });
  }
});
