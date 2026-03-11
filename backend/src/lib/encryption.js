import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { stat } from "node:fs/promises";
import { once } from "node:events";

export const NONCE_SIZE = 12;
export const KEY_SIZE = 32;
export const TAG_SIZE = 16;

const toBuffer = (chunk) => (Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));

const writeChunk = async (stream, chunk) => {
  if (!chunk.length) {
    return;
  }

  if (!stream.write(chunk)) {
    await once(stream, "drain");
  }
};

const waitForStreamClose = async (stream) => {
  await Promise.race([
    once(stream, "finish"),
    once(stream, "error").then(([error]) => {
      throw error;
    }),
  ]);
};

export const encryptFileToFile = async (inputPath, outputPath) => {
  const key = randomBytes(KEY_SIZE);
  const nonce = randomBytes(NONCE_SIZE);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  const inputStream = createReadStream(inputPath);
  const outputStream = createWriteStream(outputPath);

  let originalSize = 0;

  try {
    await writeChunk(outputStream, nonce);

    for await (const chunk of inputStream) {
      const buffer = toBuffer(chunk);
      originalSize += buffer.length;
      const encrypted = cipher.update(buffer);
      await writeChunk(outputStream, encrypted);
    }

    await writeChunk(outputStream, cipher.final());
    await writeChunk(outputStream, cipher.getAuthTag());
    outputStream.end();
    await waitForStreamClose(outputStream);

    const encryptedStats = await stat(outputPath);

    return {
      encryptedPath: outputPath,
      encryptionKey: key.toString("base64url"),
      encryptedSize: encryptedStats.size,
      originalSize,
    };
  } catch (error) {
    outputStream.destroy();
    throw error;
  }
};

export const decryptStreamToFile = async (readable, outputPath, encryptionKey) => {
  const key = Buffer.from(encryptionKey, "base64url");
  const outputStream = createWriteStream(outputPath);

  let nonceBuffer = Buffer.alloc(0);
  let trailingTag = Buffer.alloc(0);
  let decipher = null;

  try {
    for await (const chunk of readable) {
      let buffer = toBuffer(chunk);

      if (!decipher) {
        nonceBuffer = Buffer.concat([nonceBuffer, buffer]);
        if (nonceBuffer.length < NONCE_SIZE) {
          continue;
        }

        const nonce = nonceBuffer.subarray(0, NONCE_SIZE);
        decipher = createDecipheriv("aes-256-gcm", key, nonce);
        buffer = nonceBuffer.subarray(NONCE_SIZE);
        nonceBuffer = Buffer.alloc(0);
      }

      if (!buffer.length) {
        continue;
      }

      const data = Buffer.concat([trailingTag, buffer]);
      if (data.length <= TAG_SIZE) {
        trailingTag = data;
        continue;
      }

      trailingTag = data.subarray(data.length - TAG_SIZE);
      const encryptedBody = data.subarray(0, data.length - TAG_SIZE);
      await writeChunk(outputStream, decipher.update(encryptedBody));
    }

    if (!decipher) {
      throw new Error("Encrypted stream is missing the AES-GCM nonce.");
    }

    if (trailingTag.length !== TAG_SIZE) {
      throw new Error("Encrypted stream is missing the AES-GCM tag.");
    }

    decipher.setAuthTag(trailingTag);
    await writeChunk(outputStream, decipher.final());
    outputStream.end();
    await waitForStreamClose(outputStream);

    return outputPath;
  } catch (error) {
    outputStream.destroy();
    throw error;
  }
};
