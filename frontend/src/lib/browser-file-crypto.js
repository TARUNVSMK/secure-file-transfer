const NONCE_SIZE = 12;
const AUTH_TAG_SIZE = 16;

const getCrypto = () => {
  if (!window.crypto?.subtle) {
    throw new Error("This browser does not support secure file encryption.");
  }

  return window.crypto;
};

const toBase64Url = (bytes) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const fromBase64Url = (value) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

const concatUint8Arrays = (chunks) => {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }

  return output;
};

export const encryptFileInBrowser = async (file) => {
  const webCrypto = getCrypto();
  const key = await webCrypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
  const nonce = webCrypto.getRandomValues(new Uint8Array(NONCE_SIZE));
  const fileBuffer = await file.arrayBuffer();
  const encryptedBuffer = await webCrypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce },
    key,
    fileBuffer,
  );
  const rawKey = new Uint8Array(await webCrypto.subtle.exportKey("raw", key));
  const encryptedBytes = concatUint8Arrays([nonce, new Uint8Array(encryptedBuffer)]);

  return {
    encryptedBlob: new Blob([encryptedBytes], { type: "application/octet-stream" }),
    encryptedSize: encryptedBytes.byteLength,
    encryptionKey: toBase64Url(rawKey),
  };
};

export const decryptFileInBrowser = async (source, encryptionKey, contentType) => {
  const webCrypto = getCrypto();
  const encryptedBuffer = source instanceof Blob ? await source.arrayBuffer() : source;
  const encryptedBytes = new Uint8Array(encryptedBuffer);

  if (encryptedBytes.length <= NONCE_SIZE + AUTH_TAG_SIZE) {
    throw new Error("Encrypted file payload is invalid.");
  }

  const nonce = encryptedBytes.subarray(0, NONCE_SIZE);
  const ciphertextWithTag = encryptedBytes.subarray(NONCE_SIZE);
  const key = await webCrypto.subtle.importKey(
    "raw",
    fromBase64Url(encryptionKey),
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );
  const decryptedBuffer = await webCrypto.subtle.decrypt(
    { name: "AES-GCM", iv: nonce },
    key,
    ciphertextWithTag,
  );

  return new Blob([decryptedBuffer], {
    type: contentType || "application/octet-stream",
  });
};
